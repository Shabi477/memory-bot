import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { auth } from '@/auth';

// Admin email addresses - UPDATE THIS with your email
const ADMIN_EMAILS = [
  'sharon.onyango@gmail.com',
  'admin@threadmind.app',
  // Add more admin emails here
];

// Check if user is admin
async function isAdmin(userId: string): Promise<boolean> {
  try {
    const users = await sql`
      SELECT email FROM users WHERE id = ${userId}
    `;
    if (users.length === 0) return false;
    return ADMIN_EMAILS.includes(users[0].email.toLowerCase());
  } catch {
    return false;
  }
}

// GET /api/admin/users - List all users with stats
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check admin access
    if (!(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    
    // Get all users with their counts
    const users = await sql`
      SELECT 
        u.id,
        u.email,
        u.name,
        u.subscription_tier,
        u.subscription_expires_at,
        u.created_at,
        COALESCE(t.thread_count, 0)::int as thread_count,
        COALESCE(m.moment_count, 0)::int as moment_count,
        COALESCE(p.project_count, 0)::int as project_count
      FROM users u
      LEFT JOIN (
        SELECT user_id, COUNT(*)::int as thread_count 
        FROM threads 
        GROUP BY user_id
      ) t ON t.user_id = u.id
      LEFT JOIN (
        SELECT user_id, COUNT(*)::int as moment_count 
        FROM moments 
        GROUP BY user_id
      ) m ON m.user_id = u.id
      LEFT JOIN (
        SELECT user_id, COUNT(*)::int as project_count 
        FROM projects 
        GROUP BY user_id
      ) p ON p.user_id = u.id
      ORDER BY u.created_at DESC
    `;
    
    // Get aggregate stats
    const stats = await sql`
      SELECT 
        (SELECT COUNT(*)::int FROM users) as total_users,
        (SELECT COUNT(*)::int FROM users WHERE subscription_tier = 'pro') as pro_users,
        (SELECT COUNT(*)::int FROM threads) as total_threads,
        (SELECT COUNT(*)::int FROM moments) as total_moments,
        (SELECT COUNT(*)::int FROM projects) as total_projects
    `;
    
    return NextResponse.json({
      users,
      stats: {
        totalUsers: stats[0].total_users,
        proUsers: stats[0].pro_users,
        totalThreads: stats[0].total_threads,
        totalMoments: stats[0].total_moments,
        totalProjects: stats[0].total_projects,
      },
    });
  } catch (error) {
    console.error('Admin GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PUT /api/admin/users - Update user subscription
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    
    const body = await request.json();
    const { userId, subscription_tier, subscription_expires_at } = body;
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }
    
    if (subscription_tier && !['free', 'pro', 'team'].includes(subscription_tier)) {
      return NextResponse.json({ error: 'Invalid subscription tier' }, { status: 400 });
    }
    
    const updated = await sql`
      UPDATE users
      SET 
        subscription_tier = COALESCE(${subscription_tier}, subscription_tier),
        subscription_expires_at = ${subscription_expires_at || null}
      WHERE id = ${userId}
      RETURNING id, email, subscription_tier, subscription_expires_at
    `;
    
    if (updated.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json({ user: updated[0] });
  } catch (error) {
    console.error('Admin PUT error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE /api/admin/users - Delete a user and all their data
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }
    
    // Prevent self-deletion
    if (userId === session.user.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }
    
    // Delete user (cascades to all related data)
    const deleted = await sql`
      DELETE FROM users WHERE id = ${userId}
      RETURNING id, email
    `;
    
    if (deleted.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      message: 'User deleted successfully',
      user: deleted[0] 
    });
  } catch (error) {
    console.error('Admin DELETE error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
