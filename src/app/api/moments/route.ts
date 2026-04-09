import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { DEMO_MODE } from '@/lib/demo-data';

const DEMO_TOKEN = 'demo_token_for_local_testing_only';

interface MomentPayload {
  threadId: string;
  source: string;
  sourceUrl?: string;
  title?: string;
  rawText: string;
}

// Simple summary generator
// TODO: Replace with OpenAI/Claude API call for better summaries
function generateSummary(text: string): string {
  // Take first 2-3 sentences or first 200 chars as a simple summary
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  if (sentences.length >= 2) {
    return sentences.slice(0, 2).join('. ').trim() + '.';
  }
  return text.slice(0, 200).trim() + (text.length > 200 ? '...' : '');
}

// Simple key points extractor
// TODO: Replace with AI extraction for better results
function extractKeyPoints(text: string): string[] {
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  const points: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Look for bullet points, numbered lists, or short impactful lines
    if (
      trimmed.match(/^[-•*]\s+/) || // Bullet points
      trimmed.match(/^\d+[.)]\s+/) || // Numbered lists
      (trimmed.length > 20 && trimmed.length < 150 && trimmed.includes(':')) // Key statements
    ) {
      const cleaned = trimmed.replace(/^[-•*\d.)\s]+/, '').trim();
      if (cleaned.length > 10 && points.length < 6) {
        points.push(cleaned);
      }
    }
  }

  // If we didn't find structured points, extract first few sentences
  if (points.length < 3) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    for (const sentence of sentences.slice(0, 6 - points.length)) {
      const trimmed = sentence.trim();
      if (trimmed.length > 20 && trimmed.length < 150) {
        points.push(trimmed);
      }
    }
  }

  return points.slice(0, 6); // Return max 6 key points
}

export async function POST(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);
    
    // Parse request body first (needed for demo mode too)
    const body: MomentPayload = await request.json();
    
    // Validate required fields
    if (!body.threadId || !body.source || !body.rawText) {
      return NextResponse.json(
        { error: 'Missing required fields: threadId, source, rawText' },
        { status: 400 }
      );
    }

    // Handle demo mode - create a fake moment
    if (token === DEMO_TOKEN && DEMO_MODE) {
      const summary = generateSummary(body.rawText);
      const keyPoints = extractKeyPoints(body.rawText);
      
      const newMoment = {
        id: `demo-moment-${Date.now()}`,
        thread_id: body.threadId,
        source: body.source,
        source_url: body.sourceUrl || null,
        title: body.title || summary.slice(0, 50),
        raw_text: body.rawText,
        summary: summary,
        key_points: keyPoints,
        created_at: new Date().toISOString(),
      };
      
      console.log('Demo moment saved:', newMoment.id);
      return NextResponse.json({ moment: newMoment }, { status: 201 });
    }

    const supabase = createServerClient();
    
    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    // Verify thread belongs to user
    const { data: thread, error: threadError } = await supabase
      .from('threads')
      .select('id')
      .eq('id', body.threadId)
      .eq('user_id', user.id)
      .single();

    if (threadError || !thread) {
      return NextResponse.json(
        { error: 'Thread not found or access denied' },
        { status: 404 }
      );
    }

    // Generate summary and key points
    const summary = generateSummary(body.rawText);
    const keyPoints = extractKeyPoints(body.rawText);

    // Insert moment
    const { data: moment, error: insertError } = await supabase
      .from('moments')
      .insert({
        thread_id: body.threadId,
        user_id: user.id,
        source: body.source,
        source_url: body.sourceUrl || null,
        title: body.title || null,
        raw_text: body.rawText,
        summary,
        key_points: keyPoints,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to save moment' },
        { status: 500 }
      );
    }

    // Update thread's updated_at timestamp
    await supabase
      .from('threads')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', body.threadId);

    return NextResponse.json({ success: true, moment }, { status: 201 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
