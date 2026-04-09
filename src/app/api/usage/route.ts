import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getUsageStats } from '@/lib/freemium';

// GET /api/usage - Get user's usage stats
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stats = await getUsageStats(session.user.id);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('GET usage error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
