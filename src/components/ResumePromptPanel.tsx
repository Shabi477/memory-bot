'use client';

import { useState } from 'react';
import type { Thread, Moment } from '@/lib/database.types';

interface ResumePromptPanelProps {
  thread: Thread;
  moments: Moment[];
}

export function ResumePromptPanel({ thread, moments }: ResumePromptPanelProps) {
  const [copied, setCopied] = useState(false);

  // Generate a resume prompt based on the thread and moments
  const generateResumePrompt = (): string => {
    if (moments.length === 0) {
      return `I'm continuing work on: "${thread.title}"${
        thread.description ? `\n\nContext: ${thread.description}` : ''
      }\n\nNo previous moments saved yet. Let's start fresh.`;
    }

    const summaries = moments
      .map((m, i) => {
        const title = m.title || `Moment ${i + 1}`;
        const summary = m.summary || 'No summary available';
        const keyPoints = m.key_points?.length
          ? `\n   Key points: ${m.key_points.join('; ')}`
          : '';
        return `${i + 1}. ${title}: ${summary}${keyPoints}`;
      })
      .join('\n\n');

    const lastMoment = moments[moments.length - 1];
    const lastContext = lastMoment.summary || lastMoment.raw_text.slice(0, 200);

    return `I'm continuing work on: "${thread.title}"${
      thread.description ? `\n\nProject context: ${thread.description}` : ''
    }

## Previous Progress (${moments.length} saved moment${moments.length !== 1 ? 's' : ''}):

${summaries}

## Where we left off:
${lastContext}${lastContext.length >= 200 ? '...' : ''}

## What I need:
Please help me continue from where we left off. Review the context above and let's proceed with the next steps.`;
  };

  const resumePrompt = generateResumePrompt();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(resumePrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-green-800">Resume Prompt</h3>
        <button
          onClick={handleCopy}
          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
        >
          {copied ? 'Copied!' : 'Copy to Clipboard'}
        </button>
      </div>
      <p className="text-xs text-green-700 mb-3">
        Paste this into ChatGPT to resume your work with full context.
      </p>
      <pre className="bg-white p-4 rounded border border-green-200 text-sm text-gray-800 whitespace-pre-wrap max-h-80 overflow-y-auto">
        {resumePrompt}
      </pre>
    </div>
  );
}
