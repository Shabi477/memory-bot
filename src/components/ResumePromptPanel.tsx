'use client';

import { useState } from 'react';
import type { Thread, Moment } from '@/lib/database.types';

interface ThreadContextPackProps {
  thread: Thread;
  moments: Moment[];
  projectId?: undefined;
  projectName?: undefined;
}

interface ProjectContextPackProps {
  thread?: undefined;
  moments?: undefined;
  projectId: string;
  projectName: string;
}

type ContextPackPanelProps = ThreadContextPackProps | ProjectContextPackProps;

type Verbosity = 'brief' | 'standard' | 'detailed';

export function ResumePromptPanel(props: ContextPackPanelProps) {
  const [copied, setCopied] = useState(false);
  const [verbosity, setVerbosity] = useState<Verbosity>('standard');
  const [loading, setLoading] = useState(false);
  const [contextPack, setContextPack] = useState<string | null>(null);
  const [useAI, setUseAI] = useState(false);
  
  const isProject = 'projectId' in props && props.projectId;
  const thread = isProject ? null : props.thread;
  const moments = isProject ? [] : (props.moments || []);

  // Generate context pack via API (saves to DB)
  const generateContextPack = async () => {
    setLoading(true);
    try {
      const body = isProject 
        ? { projectId: props.projectId, verbosity, useAI }
        : { threadId: thread?.id, verbosity, useAI };
        
      const res = await fetch('/api/context-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      if (res.ok) {
        const data = await res.json();
        setContextPack(data.contextPack.content);
      } else if (!isProject) {
        // Fallback to local generation (only for threads)
        setContextPack(generateLocalContextPack());
      } else {
        setContextPack('Failed to generate context pack. Please try again.');
      }
    } catch {
      if (!isProject) {
        // Fallback to local generation
        setContextPack(generateLocalContextPack());
      } else {
        setContextPack('Failed to generate context pack. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Local fallback generator (thread only)
  const generateLocalContextPack = (): string => {
    if (!thread) return '';
    
    if (moments.length === 0) {
      return `# Context Pack: ${thread.title}\n\n*No moments saved yet. Start capturing your AI breakthroughs!*`;
    }

    const maxMoments = verbosity === 'brief' ? 3 : verbosity === 'detailed' ? moments.length : 5;
    const displayMoments = moments.slice(-maxMoments);
    const sources = [...new Set(moments.map((m) => m.source))];

    let pack = `# Context Pack: ${thread.title}\n\n`;
    pack += `*Generated ${new Date().toLocaleDateString()} | ${moments.length} saved moments*\n\n`;

    if (thread.description) {
      pack += `## Project Context\n${thread.description}\n\n`;
    }

    pack += `## Summary\n`;
    pack += `This thread contains ${moments.length} saved moments from ${sources.join(', ') || 'various AI tools'}.\n\n`;

    // Key decisions
    const decisions = moments.filter((m: any) => m.moment_type === 'decision');
    if (decisions.length > 0) {
      pack += `## Key Decisions\n`;
      decisions.forEach((d: any, i) => {
        pack += `${i + 1}. ${d.annotation || d.summary || d.raw_text?.slice(0, 150)}\n`;
      });
      pack += '\n';
    }

    pack += `## Progress Timeline\n`;
    displayMoments.forEach((m, i) => {
      const title = m.title || `Moment from ${m.source}`;
      pack += `\n### ${i + 1}. ${title}\n`;
      pack += `*${m.source} | ${new Date(m.created_at).toLocaleDateString()}*\n`;
      
      const content = verbosity === 'detailed' ? m.raw_text : m.raw_text?.slice(0, 300);
      pack += `${content}${content?.length >= 300 ? '...' : ''}\n`;
    });

    // Where we left off
    const lastMoment = moments[moments.length - 1];
    pack += `\n## Where We Left Off\n`;
    pack += lastMoment.raw_text?.slice(0, verbosity === 'detailed' ? 500 : 250) || '';
    pack += '\n\n';

    pack += `## Suggested Next Steps\n`;
    pack += `1. Review the progress above and continue where we left off\n`;
    pack += `2. Address any open questions or decisions needed\n`;
    pack += `\n---\n*Paste this into any AI chat to resume with full context.*`;

    return pack;
  };

  const handleCopy = async () => {
    const text = contextPack || (isProject ? '' : generateLocalContextPack());
    if (!text) return;
    
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const displayContent = contextPack || (isProject ? 'Click "Generate" to create a context pack for this project' : generateLocalContextPack());
  const title = isProject ? props.projectName : thread?.title;

  return (
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4 mb-6">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-purple-800 flex items-center gap-2">
            🧠 Context Pack {isProject && <span className="text-xs bg-purple-200 px-2 py-0.5 rounded">Project</span>}
          </h3>
          <p className="text-xs text-purple-600 mt-1">
            Resume your AI work with full context
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            disabled={!contextPack && !!isProject}
            className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {copied ? '✓ Copied!' : '📋 Copy'}
          </button>
        </div>
      </div>

      {/* Verbosity selector */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <span className="text-xs text-purple-700 self-center">Length:</span>
        {(['brief', 'standard', 'detailed'] as Verbosity[]).map((v) => (
          <button
            key={v}
            onClick={() => {
              setVerbosity(v);
              setContextPack(null); // Reset to regenerate
            }}
            className={`px-2 py-1 rounded text-xs transition-colors ${
              verbosity === v
                ? 'bg-purple-600 text-white'
                : 'bg-white text-purple-700 border border-purple-300 hover:bg-purple-100'
            }`}
          >
            {v === 'brief' ? '~500 words' : v === 'standard' ? '~1500 words' : '~3000 words'}
          </button>
        ))}
        
        {/* AI toggle */}
        <label className="flex items-center gap-1 ml-2 text-xs text-purple-700 cursor-pointer">
          <input
            type="checkbox"
            checked={useAI}
            onChange={(e) => {
              setUseAI(e.target.checked);
              setContextPack(null);
            }}
            className="w-3 h-3 text-indigo-600 rounded"
          />
          ✨ AI Enhanced
        </label>
        
        <button
          onClick={generateContextPack}
          disabled={loading}
          className="ml-auto px-2 py-1 rounded text-xs bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? '⏳ Generating...' : isProject ? '✨ Generate' : '✨ Regenerate'}
        </button>
      </div>

      {/* Stats bar */}
      {!isProject && (
        <div className="flex gap-4 text-xs text-purple-600 mb-3 pb-3 border-b border-purple-200">
          <span>📝 {moments.length} moments</span>
          <span>🤖 {[...new Set(moments.map((m) => m.source))].join(', ') || 'No sources'}</span>
          <span>📅 Last: {moments.length > 0 ? new Date(moments[moments.length - 1].created_at).toLocaleDateString() : 'N/A'}</span>
        </div>
      )}

      {/* Context pack preview */}
      <pre className="bg-white p-4 rounded border border-purple-200 text-sm text-gray-800 whitespace-pre-wrap max-h-96 overflow-y-auto font-mono">
        {displayContent}
      </pre>

      <p className="text-xs text-purple-500 mt-2 text-center">
        Pro tip: Paste this at the start of a new ChatGPT or Claude conversation
      </p>
    </div>
  );
}

export default ResumePromptPanel;
