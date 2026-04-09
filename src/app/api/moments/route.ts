import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { auth } from '@/auth';
import { checkLimit } from '@/lib/freemium';
import { generateMomentSummary } from '@/lib/ai';

const DEMO_MODE = process.env.DEMO_MODE === 'true';
const DEMO_TOKEN = 'demo_token_for_local_testing_only';

// Helper to get user from token
async function getUserFromToken(token: string) {
  if (token === DEMO_TOKEN && DEMO_MODE) {
    return { id: 'demo-user', email: 'demo@example.com' };
  }
  
  try {
    const users = await sql`
      SELECT id, email FROM users WHERE id = ${token}
    `;
    return users[0] || null;
  } catch {
    return null;
  }
}

// Simple summary generator (fallback)
function generateFallbackSummary(text: string): string {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  if (sentences.length >= 2) {
    return sentences.slice(0, 2).join('. ').trim() + '.';
  }
  return text.slice(0, 200).trim() + (text.length > 200 ? '...' : '');
}

// POST /api/moments - Create a moment
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const body = await request.json();
    const { threadId, source, sourceUrl, title, rawText, generateAiSummary } = body;
    
    // threadId is now optional - if not provided, goes to inbox
    if (!source || !rawText) {
      return NextResponse.json(
        { error: 'Missing required fields: source, rawText' },
        { status: 400 }
      );
    }
    
    let userId: string;
    
    // Chrome extension auth
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      
      if (token === DEMO_TOKEN && DEMO_MODE) {
        return NextResponse.json({
          moment: {
            id: `demo-moment-${Date.now()}`,
            thread_id: threadId,
            source,
            source_url: sourceUrl,
            title: title || generateFallbackSummary(rawText).slice(0, 50),
            raw_text: rawText,
            created_at: new Date().toISOString(),
          }
        }, { status: 201 });
      }
      
      const user = await getUserFromToken(token);
      if (!user) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
      userId = user.id;
    } else {
      // Web app auth
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userId = session.user.id;
    }
    
    // Check freemium limits
    const limitCheck = await checkLimit(userId, 'moment');
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: limitCheck.message, limitReached: true },
        { status: 403 }
      );
    }
    
    // Generate AI summary if requested (and API key available)
    let summary = null;
    let keyPoints = null;
    let momentType = null;
    
    if (generateAiSummary && process.env.ANTHROPIC_API_KEY) {
      try {
        const aiResult = await generateMomentSummary(rawText, source);
        summary = aiResult.summary;
        keyPoints = aiResult.keyPoints;
        momentType = aiResult.momentType;
      } catch (error) {
        console.error('AI summary generation failed:', error);
        // Don't fail the whole request, just skip summary
      }
    }
    
    const moments = await sql`
      INSERT INTO moments (thread_id, user_id, source, source_url, title, raw_text, summary, key_points, moment_type)
      VALUES (
        ${threadId || null}, 
        ${userId}, 
        ${source}, 
        ${sourceUrl || null}, 
        ${title || null}, 
        ${rawText},
        ${summary},
        ${keyPoints ? JSON.stringify(keyPoints) : null},
        ${momentType}
      )
      RETURNING id, thread_id, source, source_url, title, raw_text, summary, key_points, moment_type, created_at
    `;
    
    // Update thread's updated_at timestamp (only if threadId provided)
    if (threadId) {
      await sql`
        UPDATE threads SET updated_at = NOW() WHERE id = ${threadId}
      `;
    }
    
    return NextResponse.json({ moment: moments[0] }, { status: 201 });
  } catch (error) {
    console.error('POST moment error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// GET /api/moments?threadId=xxx - Get moments for a thread
export async function GET(request: NextRequest) {
  try {
    const threadId = request.nextUrl.searchParams.get('threadId');
    
    if (!threadId) {
      return NextResponse.json({ error: 'threadId required' }, { status: 400 });
    }
    
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify thread belongs to user
    const threads = await sql`
      SELECT id FROM threads WHERE id = ${threadId} AND user_id = ${session.user.id}
    `;
    
    if (threads.length === 0) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }
    
    const moments = await sql`
      SELECT id, thread_id, source, source_url, title, raw_text, created_at
      FROM moments
      WHERE thread_id = ${threadId}
      ORDER BY created_at DESC
    `;
    
    return NextResponse.json({ moments });
  } catch (error) {
    console.error('GET moments error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
