import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { auth } from '@/auth';
import { checkLimit } from '@/lib/freemium';

// Demo mode for testing without real auth
const DEMO_MODE = process.env.DEMO_MODE === 'true';
const DEMO_TOKEN = 'demo_token_for_local_testing_only';

const DEMO_THREADS = [
  {
    id: 'demo-thread-1',
    title: 'React Performance Tips',
    description: 'Collection of React optimization techniques',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-thread-2',
    title: 'TypeScript Patterns',
    description: 'Useful TypeScript patterns and tricks',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Helper to get user from token (for Chrome extension)
async function getUserFromToken(token: string) {
  if (token === DEMO_TOKEN && DEMO_MODE) {
    return { id: 'demo-user', email: 'demo@example.com' };
  }
  
  // Token = user id for extension auth
  try {
    const users = await sql`
      SELECT id, email FROM users WHERE id = ${token}
    `;
    return users[0] || null;
  } catch {
    return null;
  }
}

// GET /api/threads - List user's threads
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    
    // Chrome extension auth (Bearer token)
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      
      if (token === DEMO_TOKEN && DEMO_MODE) {
        return NextResponse.json({ threads: DEMO_THREADS });
      }
      
      const user = await getUserFromToken(token);
      if (!user) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
      
      const threads = await sql`
        SELECT id, title, description, created_at, updated_at
        FROM threads
        WHERE user_id = ${user.id}
        ORDER BY updated_at DESC
      `;
      
      return NextResponse.json({ threads });
    }
    
    // Web app auth (NextAuth session)
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const threads = await sql`
      SELECT id, title, description, created_at, updated_at
      FROM threads
      WHERE user_id = ${session.user.id}
      ORDER BY updated_at DESC
    `;
    
    return NextResponse.json({ threads });
  } catch (error) {
    console.error('GET threads error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/threads - Create a thread
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const body = await request.json();
    const { title, description } = body;
    
    if (!title) {
      return NextResponse.json({ error: 'Title required' }, { status: 400 });
    }
    
    let userId: string;
    
    // Chrome extension auth
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      
      if (token === DEMO_TOKEN && DEMO_MODE) {
        return NextResponse.json({
          thread: {
            id: `demo-${Date.now()}`,
            title,
            description,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
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
    const limitCheck = await checkLimit(userId, 'thread');
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: limitCheck.message, limitReached: true },
        { status: 403 }
      );
    }
    
    const threads = await sql`
      INSERT INTO threads (user_id, title, description)
      VALUES (${userId}, ${title}, ${description || null})
      RETURNING id, title, description, created_at, updated_at
    `;
    
    return NextResponse.json({ thread: threads[0] }, { status: 201 });
  } catch (error) {
    console.error('POST thread error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
