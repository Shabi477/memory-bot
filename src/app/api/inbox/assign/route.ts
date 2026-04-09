import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { auth } from '@/auth';

// POST /api/inbox/assign - Assign moments to a thread
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { momentIds, threadId } = body;

    if (!momentIds || !Array.isArray(momentIds) || momentIds.length === 0) {
      return NextResponse.json(
        { error: 'momentIds array required' },
        { status: 400 }
      );
    }

    if (!threadId) {
      return NextResponse.json(
        { error: 'threadId required' },
        { status: 400 }
      );
    }

    // Verify thread belongs to user
    const threads = await sql`
      SELECT id FROM threads WHERE id = ${threadId} AND user_id = ${session.user.id}
    `;

    if (threads.length === 0) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    // Update all moments to assign them to the thread
    await sql`
      UPDATE moments
      SET thread_id = ${threadId}
      WHERE id = ANY(${momentIds}) AND user_id = ${session.user.id}
    `;

    // Update thread's updated_at timestamp
    await sql`
      UPDATE threads SET updated_at = NOW() WHERE id = ${threadId}
    `;

    return NextResponse.json({ success: true, assigned: momentIds.length });
  } catch (error) {
    console.error('Assign moments error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
