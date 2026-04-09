import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { auth } from '@/auth';

// POST /api/context-pack - Generate a context pack
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { threadId, projectId, verbosity = 'standard' } = body;

    if (!threadId && !projectId) {
      return NextResponse.json(
        { error: 'Either threadId or projectId is required' },
        { status: 400 }
      );
    }

    let contextPack: string;
    let title: string;

    if (threadId) {
      // Generate context pack for a single thread
      const threads = await sql`
        SELECT id, title, description, created_at, updated_at
        FROM threads 
        WHERE id = ${threadId} AND user_id = ${session.user.id}
      `;

      if (threads.length === 0) {
        return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
      }

      const thread = threads[0];
      title = `Context Pack: ${thread.title}`;

      const moments = await sql`
        SELECT id, source, source_url, title, raw_text, summary, key_points, moment_type, annotation, created_at
        FROM moments
        WHERE thread_id = ${threadId}
        ORDER BY created_at ASC
      `;

      contextPack = generateThreadContextPack(thread, moments, verbosity);
    } else {
      // Generate context pack for a project (multiple threads)
      const projects = await sql`
        SELECT id, name, description, status
        FROM projects 
        WHERE id = ${projectId} AND user_id = ${session.user.id}
      `;

      if (projects.length === 0) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      const project = projects[0];
      title = `Context Pack: ${project.name}`;

      const threads = await sql`
        SELECT id, title, description, created_at, updated_at
        FROM threads
        WHERE project_id = ${projectId}
        ORDER BY updated_at DESC
      `;

      // Get all moments for these threads
      const threadIds = threads.map((t: any) => t.id);
      const moments = threadIds.length > 0 ? await sql`
        SELECT m.id, m.thread_id, m.source, m.title, m.raw_text, m.summary, m.key_points, m.moment_type, m.annotation, m.created_at
        FROM moments m
        WHERE m.thread_id = ANY(${threadIds})
        ORDER BY m.created_at ASC
      ` : [];

      contextPack = generateProjectContextPack(project, threads, moments, verbosity);
    }

    // Save the context pack
    const saved = await sql`
      INSERT INTO context_packs (user_id, thread_id, project_id, title, content, verbosity)
      VALUES (${session.user.id}, ${threadId || null}, ${projectId || null}, ${title}, ${contextPack}, ${verbosity})
      RETURNING id, title, verbosity, created_at
    `;

    return NextResponse.json({
      contextPack: {
        ...saved[0],
        content: contextPack,
      },
    });
  } catch (error) {
    console.error('Context pack error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// GET /api/context-pack - Get saved context packs
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const threadId = request.nextUrl.searchParams.get('threadId');
    const projectId = request.nextUrl.searchParams.get('projectId');

    let packs;
    if (threadId) {
      packs = await sql`
        SELECT id, title, content, verbosity, created_at
        FROM context_packs
        WHERE user_id = ${session.user.id} AND thread_id = ${threadId}
        ORDER BY created_at DESC
        LIMIT 10
      `;
    } else if (projectId) {
      packs = await sql`
        SELECT id, title, content, verbosity, created_at
        FROM context_packs
        WHERE user_id = ${session.user.id} AND project_id = ${projectId}
        ORDER BY created_at DESC
        LIMIT 10
      `;
    } else {
      packs = await sql`
        SELECT id, title, content, verbosity, created_at
        FROM context_packs
        WHERE user_id = ${session.user.id}
        ORDER BY created_at DESC
        LIMIT 20
      `;
    }

    return NextResponse.json({ contextPacks: packs });
  } catch (error) {
    console.error('Get context packs error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Helper functions to generate context packs
function generateThreadContextPack(
  thread: any,
  moments: any[],
  verbosity: string
): string {
  const maxWords = verbosity === 'brief' ? 500 : verbosity === 'detailed' ? 3000 : 1500;

  // Separate moments by type
  const decisions = moments.filter((m) => m.moment_type === 'decision');
  const questions = moments.filter((m) => m.moment_type === 'question');
  const actions = moments.filter((m) => m.moment_type === 'action');

  // Get AI sources used
  const sources = [...new Set(moments.map((m) => m.source))];

  // Build the context pack
  let pack = `# Context Pack: ${thread.title}\n\n`;
  pack += `*Generated ${new Date().toLocaleDateString()} | ${moments.length} saved moments*\n\n`;

  if (thread.description) {
    pack += `## Project Context\n${thread.description}\n\n`;
  }

  // Summary section
  pack += `## Summary\n`;
  pack += `This thread contains ${moments.length} saved moments `;
  pack += `from ${sources.join(', ') || 'various AI tools'}. `;
  pack += `Started ${formatDate(thread.created_at)}, last updated ${formatDate(thread.updated_at)}.\n\n`;

  // Key decisions
  if (decisions.length > 0) {
    pack += `## Key Decisions Made\n`;
    decisions.forEach((d, i) => {
      const text = d.annotation || d.summary || truncate(d.raw_text, 150);
      pack += `${i + 1}. ${text}\n`;
    });
    pack += '\n';
  }

  // Open questions
  if (questions.length > 0) {
    pack += `## Open Questions\n`;
    questions.forEach((q, i) => {
      const text = q.annotation || q.summary || truncate(q.raw_text, 150);
      pack += `${i + 1}. ${text}\n`;
    });
    pack += '\n';
  }

  // Progress timeline
  pack += `## Progress Timeline\n`;
  const displayMoments = verbosity === 'brief' ? moments.slice(-3) : verbosity === 'detailed' ? moments : moments.slice(-5);
  
  displayMoments.forEach((m, i) => {
    const title = m.title || m.annotation || `Moment from ${m.source}`;
    const date = formatDate(m.created_at);
    pack += `\n### ${i + 1}. ${title}\n`;
    pack += `*${m.source} | ${date}*\n`;
    
    if (m.key_points?.length) {
      pack += `Key points:\n`;
      m.key_points.forEach((kp: string) => {
        pack += `- ${kp}\n`;
      });
    } else if (m.summary) {
      pack += `${m.summary}\n`;
    } else {
      const content = verbosity === 'detailed' ? m.raw_text : truncate(m.raw_text, 300);
      pack += `${content}\n`;
    }
  });

  // Where we left off
  if (moments.length > 0) {
    const lastMoment = moments[moments.length - 1];
    pack += `\n## Where We Left Off\n`;
    pack += truncate(lastMoment.raw_text, verbosity === 'detailed' ? 500 : 250);
    pack += '\n\n';
  }

  // Suggested next prompts
  pack += `## Suggested Next Steps\n`;
  pack += `1. Review the progress above and continue where we left off\n`;
  pack += `2. Address any open questions listed above\n`;
  if (actions.length > 0) {
    pack += `3. Complete pending action items\n`;
  }
  pack += `\n---\n*Paste this into any AI chat to resume with full context.*`;

  return pack;
}

function generateProjectContextPack(
  project: any,
  threads: any[],
  moments: any[],
  verbosity: string
): string {
  let pack = `# Context Pack: ${project.name}\n\n`;
  pack += `*Generated ${new Date().toLocaleDateString()} | ${threads.length} threads, ${moments.length} moments*\n\n`;

  if (project.description) {
    pack += `## Project Overview\n${project.description}\n\n`;
  }

  pack += `## Project Status: ${project.status}\n\n`;

  // List threads with summary
  pack += `## Threads in This Project\n`;
  threads.forEach((t: any, i: number) => {
    const threadMoments = moments.filter((m: any) => m.thread_id === t.id);
    pack += `${i + 1}. **${t.title}** (${threadMoments.length} moments)\n`;
    if (t.description && verbosity !== 'brief') {
      pack += `   ${t.description}\n`;
    }
  });
  pack += '\n';

  // Aggregate key decisions across all threads
  const decisions = moments.filter((m: any) => m.moment_type === 'decision');
  if (decisions.length > 0) {
    pack += `## Key Decisions Across Project\n`;
    decisions.slice(0, verbosity === 'brief' ? 3 : 10).forEach((d: any, i: number) => {
      const text = d.annotation || d.summary || truncate(d.raw_text, 100);
      pack += `${i + 1}. ${text}\n`;
    });
    pack += '\n';
  }

  // Recent activity
  pack += `## Recent Activity\n`;
  const recentMoments = moments.slice(-5);
  recentMoments.forEach((m: any) => {
    const title = m.title || m.annotation || `${m.source} moment`;
    pack += `- ${title} (${formatDate(m.created_at)})\n`;
  });

  pack += `\n---\n*Paste this into any AI chat to resume project work.*`;

  return pack;
}

function truncate(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
