import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { auth } from '@/auth';

// GET /api/inbox - Get moments without a thread assignment
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get moments where thread_id is null (inbox items)
    const moments = await sql`
      SELECT id, source, source_url, title, raw_text, created_at
      FROM moments
      WHERE user_id = ${session.user.id} AND thread_id IS NULL
      ORDER BY created_at DESC
    `;

    return NextResponse.json({ moments });
  } catch (error) {
    console.error('GET inbox error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/inbox - Create an inbox moment (no thread)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    let userId: string;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const users = await sql`
        SELECT id FROM users WHERE id = ${token}
      `;
      if (users.length === 0) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
      userId = users[0].id;
    } else {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userId = session.user.id;
    }

    const body = await request.json();
    const { source, sourceUrl, title, rawText } = body;

    if (!source || !rawText) {
      return NextResponse.json(
        { error: 'Missing required fields: source, rawText' },
        { status: 400 }
      );
    }

    const moments = await sql`
      INSERT INTO moments (user_id, thread_id, source, source_url, title, raw_text)
      VALUES (${userId}, NULL, ${source}, ${sourceUrl || null}, ${title || null}, ${rawText})
      RETURNING id, source, source_url, title, raw_text, created_at
    `;

    return NextResponse.json({ moment: moments[0] }, { status: 201 });
  } catch (error) {
    console.error('POST inbox error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
