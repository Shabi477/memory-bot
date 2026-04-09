import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { auth } from '@/auth';

// POST /api/inbox/archive - Delete/archive moments
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { momentIds } = body;

    if (!momentIds || !Array.isArray(momentIds) || momentIds.length === 0) {
      return NextResponse.json(
        { error: 'momentIds array required' },
        { status: 400 }
      );
    }

    // Delete moments (only if they belong to the user)
    await sql`
      DELETE FROM moments
      WHERE id = ANY(${momentIds}) AND user_id = ${session.user.id}
    `;

    return NextResponse.json({ success: true, archived: momentIds.length });
  } catch (error) {
    console.error('Archive moments error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
