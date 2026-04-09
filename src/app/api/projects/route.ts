import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { auth } from '@/auth';
import { checkLimit } from '@/lib/freemium';

// GET /api/projects - Get all projects
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = request.nextUrl.searchParams.get('status');

    let projects;
    if (status) {
      projects = await sql`
        SELECT p.*, 
          (SELECT COUNT(*) FROM threads WHERE project_id = p.id) as thread_count,
          (SELECT COUNT(*) FROM moments m 
           JOIN threads t ON m.thread_id = t.id 
           WHERE t.project_id = p.id) as moment_count
        FROM projects p
        WHERE p.user_id = ${session.user.id} AND p.status = ${status}
        ORDER BY p.updated_at DESC
      `;
    } else {
      projects = await sql`
        SELECT p.*, 
          (SELECT COUNT(*) FROM threads WHERE project_id = p.id) as thread_count,
          (SELECT COUNT(*) FROM moments m 
           JOIN threads t ON m.thread_id = t.id 
           WHERE t.project_id = p.id) as moment_count
        FROM projects p
        WHERE p.user_id = ${session.user.id}
        ORDER BY p.updated_at DESC
      `;
    }

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('GET projects error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/projects - Create a project
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, threadIds } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }

    // Check freemium limits
    const limitCheck = await checkLimit(session.user.id, 'project');
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: limitCheck.message, limitReached: true },
        { status: 403 }
      );
    }

    // Create project
    const projects = await sql`
      INSERT INTO projects (user_id, name, description)
      VALUES (${session.user.id}, ${name.trim()}, ${description || null})
      RETURNING id, name, description, status, created_at, updated_at
    `;

    const project = projects[0];

    // Assign threads to project if provided
    if (threadIds && Array.isArray(threadIds) && threadIds.length > 0) {
      await sql`
        UPDATE threads 
        SET project_id = ${project.id}
        WHERE id = ANY(${threadIds}) AND user_id = ${session.user.id}
      `;
    }

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error('POST project error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PUT /api/projects - Update a project
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, description, status } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      updates.push('name');
      values.push(name.trim());
    }
    if (description !== undefined) {
      updates.push('description');
      values.push(description);
    }
    if (status !== undefined) {
      if (!['active', 'paused', 'complete'].includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status. Use: active, paused, complete' },
          { status: 400 }
        );
      }
      updates.push('status');
      values.push(status);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Update project
    const projects = await sql`
      UPDATE projects 
      SET 
        name = COALESCE(${name || null}, name),
        description = COALESCE(${description || null}, description),
        status = COALESCE(${status || null}, status),
        updated_at = NOW()
      WHERE id = ${id} AND user_id = ${session.user.id}
      RETURNING id, name, description, status, created_at, updated_at
    `;

    if (projects.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ project: projects[0] });
  } catch (error) {
    console.error('PUT project error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE /api/projects - Delete a project
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = request.nextUrl.searchParams.get('id');
    const unassignThreads = request.nextUrl.searchParams.get('unassignThreads') === 'true';

    if (!id) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Optionally unassign threads first (otherwise they get null project_id due to ON DELETE SET NULL)
    if (unassignThreads) {
      await sql`
        UPDATE threads SET project_id = NULL
        WHERE project_id = ${id} AND user_id = ${session.user.id}
      `;
    }

    const result = await sql`
      DELETE FROM projects 
      WHERE id = ${id} AND user_id = ${session.user.id}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('DELETE project error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
