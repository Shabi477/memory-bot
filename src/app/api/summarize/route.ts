import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { auth } from '@/auth';
import { generateMomentSummary } from '@/lib/ai';

// POST /api/summarize - Generate AI summary for a moment
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'AI summarization not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { momentId, rawText, source } = body;

    // If momentId provided, fetch and update the moment
    if (momentId) {
      // Verify moment belongs to user
      const moments = await sql`
        SELECT id, raw_text, source FROM moments 
        WHERE id = ${momentId} AND user_id = ${session.user.id}
      `;

      if (moments.length === 0) {
        return NextResponse.json({ error: 'Moment not found' }, { status: 404 });
      }

      const moment = moments[0];
      const aiResult = await generateMomentSummary(
        moment.raw_text,
        moment.source
      );

      // Update moment with summary
      await sql`
        UPDATE moments 
        SET 
          summary = ${aiResult.summary},
          key_points = ${JSON.stringify(aiResult.keyPoints)},
          moment_type = ${aiResult.momentType}
        WHERE id = ${momentId}
      `;

      return NextResponse.json({
        momentId,
        summary: aiResult.summary,
        keyPoints: aiResult.keyPoints,
        momentType: aiResult.momentType,
      });
    }

    // If raw text provided, just generate summary without saving
    if (rawText) {
      const aiResult = await generateMomentSummary(rawText, source || 'web');
      return NextResponse.json({
        summary: aiResult.summary,
        keyPoints: aiResult.keyPoints,
        momentType: aiResult.momentType,
      });
    }

    return NextResponse.json(
      { error: 'Either momentId or rawText required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Summarize error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/summarize/batch - Generate summaries for multiple moments
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'AI summarization not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { momentIds } = body;

    if (!momentIds || !Array.isArray(momentIds) || momentIds.length === 0) {
      return NextResponse.json(
        { error: 'momentIds array required' },
        { status: 400 }
      );
    }

    // Limit batch size
    const batchSize = Math.min(momentIds.length, 10);
    const idsToProcess = momentIds.slice(0, batchSize);

    // Fetch moments
    const moments = await sql`
      SELECT id, raw_text, source FROM moments 
      WHERE id = ANY(${idsToProcess}) AND user_id = ${session.user.id}
    `;

    const results = [];

    for (const moment of moments) {
      try {
        const aiResult = await generateMomentSummary(
          moment.raw_text,
          moment.source
        );

        await sql`
          UPDATE moments 
          SET 
            summary = ${aiResult.summary},
            key_points = ${JSON.stringify(aiResult.keyPoints)},
            moment_type = ${aiResult.momentType}
          WHERE id = ${moment.id}
        `;

        results.push({
          momentId: moment.id,
          success: true,
          summary: aiResult.summary,
        });
      } catch (error) {
        results.push({
          momentId: moment.id,
          success: false,
          error: 'Failed to generate summary',
        });
      }
    }

    return NextResponse.json({
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error('Batch summarize error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
