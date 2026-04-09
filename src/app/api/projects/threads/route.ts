import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { auth } from '@/auth';

// PUT /api/projects/threads - Assign threads to a project
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, threadIds, action = 'assign' } = body;

    if (!threadIds || !Array.isArray(threadIds) || threadIds.length === 0) {
      return NextResponse.json(
        { error: 'threadIds array is required' },
        { status: 400 }
      );
    }

    if (action === 'assign') {
      if (!projectId) {
        return NextResponse.json(
          { error: 'projectId is required for assign action' },
          { status: 400 }
        );
      }

      // Verify project belongs to user
      const projects = await sql`
        SELECT id FROM projects 
        WHERE id = ${projectId} AND user_id = ${session.user.id}
      `;

      if (projects.length === 0) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      // Assign threads to project
      const result = await sql`
        UPDATE threads 
        SET project_id = ${projectId}, updated_at = NOW()
        WHERE id = ANY(${threadIds}) AND user_id = ${session.user.id}
        RETURNING id, title, project_id
      `;

      // Update project's updated_at
      await sql`
        UPDATE projects SET updated_at = NOW() WHERE id = ${projectId}
      `;

      return NextResponse.json({
        success: true,
        action: 'assigned',
        threads: result,
      });
    } else if (action === 'unassign') {
      // Remove threads from their projects
      const result = await sql`
        UPDATE threads 
        SET project_id = NULL, updated_at = NOW()
        WHERE id = ANY(${threadIds}) AND user_id = ${session.user.id}
        RETURNING id, title
      `;

      return NextResponse.json({
        success: true,
        action: 'unassigned',
        threads: result,
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use: assign, unassign' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Projects threads error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// GET /api/projects/threads?projectId=xxx - Get threads in a project
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = request.nextUrl.searchParams.get('projectId');
    const includeUnassigned = request.nextUrl.searchParams.get('includeUnassigned') === 'true';

    if (!projectId && !includeUnassigned) {
      return NextResponse.json(
        { error: 'projectId or includeUnassigned=true required' },
        { status: 400 }
      );
    }

    let threads;

    if (projectId) {
      threads = await sql`
        SELECT t.*, 
          (SELECT COUNT(*) FROM moments WHERE thread_id = t.id) as moment_count
        FROM threads t
        WHERE t.project_id = ${projectId} AND t.user_id = ${session.user.id}
        ORDER BY t.updated_at DESC
      `;
    } else if (includeUnassigned) {
      // Get threads not assigned to any project
      threads = await sql`
        SELECT t.*, 
          (SELECT COUNT(*) FROM moments WHERE thread_id = t.id) as moment_count
        FROM threads t
        WHERE t.project_id IS NULL AND t.user_id = ${session.user.id}
        ORDER BY t.updated_at DESC
      `;
    }

    return NextResponse.json({ threads });
  } catch (error) {
    console.error('Get project threads error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
