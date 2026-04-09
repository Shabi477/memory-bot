import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Use Haiku for fast, cheap summaries
const SUMMARY_MODEL = 'claude-3-haiku-20240307';
// Use Sonnet for higher quality context packs
const CONTEXT_PACK_MODEL = 'claude-3-5-sonnet-20241022';

export interface SummaryResult {
  summary: string;
  keyPoints: string[];
  suggestedTags: string[];
  momentType: 'decision' | 'question' | 'action' | 'general';
}

export interface ContextPackResult {
  contextPack: string;
  summary: string;
  keyDecisions: string[];
  openQuestions: string[];
  nextSteps: string[];
}

/**
 * Generate a summary and key points for a saved moment
 * Uses Claude Haiku for speed and cost efficiency
 */
export async function generateMomentSummary(
  rawText: string,
  source: string
): Promise<SummaryResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    // Fallback to simple extraction if no API key
    return fallbackSummary(rawText);
  }

  try {
    const message = await anthropic.messages.create({
      model: SUMMARY_MODEL,
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `Analyze this ${source} conversation excerpt and provide:
1. A concise 1-2 sentence summary
2. 3-5 key points (short bullet points)
3. 2-4 suggested tags for categorization
4. The moment type (decision, question, action, or general)

Format your response as JSON:
{
  "summary": "...",
  "keyPoints": ["...", "..."],
  "suggestedTags": ["...", "..."],
  "momentType": "general"
}

Conversation:
${rawText.slice(0, 4000)}`,
        },
      ],
    });

    // Extract text content
    const content = message.content[0];
    if (content.type !== 'text') {
      return fallbackSummary(rawText);
    }

    // Parse JSON response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return fallbackSummary(rawText);
    }

    const result = JSON.parse(jsonMatch[0]);
    return {
      summary: result.summary || '',
      keyPoints: result.keyPoints || [],
      suggestedTags: result.suggestedTags || [],
      momentType: result.momentType || 'general',
    };
  } catch (error) {
    console.error('AI summary error:', error);
    return fallbackSummary(rawText);
  }
}

/**
 * Generate an enhanced context pack using Claude Sonnet
 * Higher quality for the "resume" feature
 */
export async function generateAIContextPack(
  threadTitle: string,
  threadDescription: string | null,
  moments: Array<{
    source: string;
    raw_text: string;
    summary?: string;
    key_points?: string[];
    created_at: string;
  }>,
  verbosity: 'brief' | 'standard' | 'detailed'
): Promise<ContextPackResult> {
  const emptyResult = {
    contextPack: '',
    summary: '',
    keyDecisions: [],
    openQuestions: [],
    nextSteps: [],
  };
  
  if (!process.env.ANTHROPIC_API_KEY || moments.length === 0) {
    return emptyResult;
  }

  const wordLimit = verbosity === 'brief' ? 300 : verbosity === 'detailed' ? 1000 : 500;

  // Prepare moments summary
  const momentsText = moments
    .map((m, i) => {
      const date = new Date(m.created_at).toLocaleDateString();
      const text = m.summary || m.raw_text.slice(0, 500);
      return `[${i + 1}] ${m.source} - ${date}\n${text}`;
    })
    .join('\n\n');

  try {
    const message = await anthropic.messages.create({
      model: CONTEXT_PACK_MODEL,
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: `You are helping someone resume work on a project. Analyze these saved AI conversation moments and create a context pack.

Project: ${threadTitle}
${threadDescription ? `Description: ${threadDescription}` : ''}

Saved Moments (${moments.length} total):
${momentsText}

Generate a ${verbosity} context pack (~${wordLimit} words) in JSON format:
{
  "summary": "A narrative summary of the work done so far...",
  "keyDecisions": ["Decision 1 that was made...", "Decision 2..."],
  "openQuestions": ["Question still to resolve...", "..."],
  "nextSteps": ["Suggested next action...", "..."]
}

Focus on actionable insights that would help someone continue this work.`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      return emptyResult;
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return emptyResult;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    // Format as readable context pack
    let contextPack = `# Context Pack: ${threadTitle}\n\n`;
    contextPack += `*Generated ${new Date().toLocaleDateString()} | ${moments.length} saved moments | AI Enhanced*\n\n`;
    
    if (parsed.summary) {
      contextPack += `## Summary\n${parsed.summary}\n\n`;
    }
    
    if (parsed.keyDecisions?.length > 0) {
      contextPack += `## Key Decisions Made\n`;
      parsed.keyDecisions.forEach((d: string, i: number) => {
        contextPack += `${i + 1}. ${d}\n`;
      });
      contextPack += '\n';
    }
    
    if (parsed.openQuestions?.length > 0) {
      contextPack += `## Open Questions\n`;
      parsed.openQuestions.forEach((q: string, i: number) => {
        contextPack += `${i + 1}. ${q}\n`;
      });
      contextPack += '\n';
    }
    
    if (parsed.nextSteps?.length > 0) {
      contextPack += `## Suggested Next Steps\n`;
      parsed.nextSteps.forEach((s: string, i: number) => {
        contextPack += `${i + 1}. ${s}\n`;
      });
      contextPack += '\n';
    }
    
    contextPack += `---\n*Paste this into any AI chat to resume with full context.*`;

    return {
      contextPack,
      ...parsed,
    };
  } catch (error) {
    console.error('AI context pack error:', error);
    return emptyResult;
  }
}

/**
 * Suggest which thread a moment should be assigned to
 */
export async function suggestThread(
  rawText: string,
  threads: Array<{ id: string; title: string; description: string | null }>
): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY || threads.length === 0) {
    return null;
  }

  const threadList = threads
    .map((t) => `- ${t.id}: ${t.title}${t.description ? ` (${t.description})` : ''}`)
    .join('\n');

  try {
    const message = await anthropic.messages.create({
      model: SUMMARY_MODEL,
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: `Which thread does this content best fit into? Reply with just the thread ID or "none".

Threads:
${threadList}

Content:
${rawText.slice(0, 1000)}

Thread ID:`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') return null;

    const response = content.text.trim().toLowerCase();
    if (response === 'none') return null;

    // Find matching thread ID
    const matchingThread = threads.find((t) => 
      content.text.includes(t.id) || t.id.startsWith(response)
    );
    return matchingThread?.id || null;
  } catch {
    return null;
  }
}

// Fallback when API is unavailable
function fallbackSummary(text: string): SummaryResult {
  // Extract first 2 sentences as summary
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 10);
  const summary = sentences.slice(0, 2).join('. ').trim() + '.';

  // Extract key phrases (simple heuristic)
  const keyPoints: string[] = [];
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  
  for (const line of lines) {
    if (line.includes(':') || line.startsWith('-') || line.startsWith('•')) {
      const point = line.replace(/^[-•]\s*/, '').trim();
      if (point.length > 10 && point.length < 150) {
        keyPoints.push(point);
        if (keyPoints.length >= 5) break;
      }
    }
  }

  // Simple moment type detection
  const lowerText = text.toLowerCase();
  let momentType: SummaryResult['momentType'] = 'general';
  
  if (lowerText.includes('decided') || lowerText.includes('decision') || lowerText.includes('we will') || lowerText.includes("let's go with")) {
    momentType = 'decision';
  } else if (lowerText.includes('?') || lowerText.includes('how to') || lowerText.includes('what is')) {
    momentType = 'question';
  } else if (lowerText.includes('todo') || lowerText.includes('action') || lowerText.includes('next step')) {
    momentType = 'action';
  }

  return {
    summary: summary.slice(0, 200),
    keyPoints,
    suggestedTags: [],
    momentType,
  };
}
