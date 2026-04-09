import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { auth } from '@/auth';

// Valid artifact types
const VALID_TYPES = ['code', 'document', 'prompt', 'data', 'image'];

// GET /api/artifacts - Get all artifacts
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const type = request.nextUrl.searchParams.get('type');
    const threadId = request.nextUrl.searchParams.get('threadId');
    const search = request.nextUrl.searchParams.get('search');

    let artifacts;

    if (type && threadId) {
      artifacts = await sql`
        SELECT * FROM artifacts 
        WHERE user_id = ${session.user.id} 
          AND artifact_type = ${type}
          AND thread_id = ${threadId}
        ORDER BY created_at DESC
      `;
    } else if (type) {
      artifacts = await sql`
        SELECT * FROM artifacts 
        WHERE user_id = ${session.user.id} AND artifact_type = ${type}
        ORDER BY created_at DESC
      `;
    } else if (threadId) {
      artifacts = await sql`
        SELECT * FROM artifacts 
        WHERE user_id = ${session.user.id} AND thread_id = ${threadId}
        ORDER BY created_at DESC
      `;
    } else if (search) {
      // Full-text search in artifacts
      artifacts = await sql`
        SELECT * FROM artifacts 
        WHERE user_id = ${session.user.id}
          AND (
            title ILIKE ${'%' + search + '%'}
            OR content ILIKE ${'%' + search + '%'}
            OR ${search} = ANY(tags)
          )
        ORDER BY created_at DESC
        LIMIT 50
      `;
    } else {
      artifacts = await sql`
        SELECT * FROM artifacts 
        WHERE user_id = ${session.user.id}
        ORDER BY created_at DESC
        LIMIT 100
      `;
    }

    return NextResponse.json({ artifacts });
  } catch (error) {
    console.error('GET artifacts error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/artifacts - Create an artifact
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { momentId, threadId, artifactType, title, content, language, tags } = body;

    // Validate required fields
    if (!title || !content || !artifactType) {
      return NextResponse.json(
        { error: 'Missing required fields: title, content, artifactType' },
        { status: 400 }
      );
    }

    if (!VALID_TYPES.includes(artifactType)) {
      return NextResponse.json(
        { error: `Invalid artifact type. Use: ${VALID_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    const artifacts = await sql`
      INSERT INTO artifacts (
        user_id, moment_id, thread_id, artifact_type, 
        title, content, language, tags
      )
      VALUES (
        ${session.user.id},
        ${momentId || null},
        ${threadId || null},
        ${artifactType},
        ${title},
        ${content},
        ${language || null},
        ${tags || null}
      )
      RETURNING *
    `;

    return NextResponse.json({ artifact: artifacts[0] }, { status: 201 });
  } catch (error) {
    console.error('POST artifact error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PUT /api/artifacts - Update an artifact
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, title, content, language, tags } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Artifact ID is required' },
        { status: 400 }
      );
    }

    // Update with version increment
    const artifacts = await sql`
      UPDATE artifacts 
      SET 
        title = COALESCE(${title || null}, title),
        content = COALESCE(${content || null}, content),
        language = COALESCE(${language || null}, language),
        tags = COALESCE(${tags || null}, tags),
        version = version + 1,
        updated_at = NOW()
      WHERE id = ${id} AND user_id = ${session.user.id}
      RETURNING *
    `;

    if (artifacts.length === 0) {
      return NextResponse.json({ error: 'Artifact not found' }, { status: 404 });
    }

    return NextResponse.json({ artifact: artifacts[0] });
  } catch (error) {
    console.error('PUT artifact error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE /api/artifacts - Delete an artifact
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = request.nextUrl.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Artifact ID is required' },
        { status: 400 }
      );
    }

    const result = await sql`
      DELETE FROM artifacts 
      WHERE id = ${id} AND user_id = ${session.user.id}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Artifact not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('DELETE artifact error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
