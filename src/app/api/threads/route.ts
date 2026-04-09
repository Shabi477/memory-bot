import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { DEMO_MODE, DEMO_THREADS } from '@/lib/demo-data';

const DEMO_TOKEN = 'demo_token_for_local_testing_only';

// GET /api/threads - List user's threads (for Chrome extension)
export async function GET(request: NextRequest) {
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
    
    // Handle demo mode
    if (token === DEMO_TOKEN && DEMO_MODE) {
      return NextResponse.json({ 
        threads: DEMO_THREADS.map((t: any) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          created_at: t.created_at,
          updated_at: t.updated_at,
        }))
      }, { status: 200 });
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

    // Fetch user's threads
    const { data: threads, error: fetchError } = await supabase
      .from('threads')
      .select('id, title, description, created_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch threads' },
        { status: 500 }
      );
    }

    return NextResponse.json({ threads }, { status: 200 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/threads - Create a new thread (for Chrome extension)
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
    
    // Handle demo mode - create a fake thread
    if (token === DEMO_TOKEN && DEMO_MODE) {
      const body = await request.json();
      const newThread = {
        id: `demo-${Date.now()}`,
        title: body.title || 'New Thread',
        description: body.description || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return NextResponse.json({ thread: newThread }, { status: 201 });
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

    // Parse request body
    const body = await request.json();
    
    if (!body.title) {
      return NextResponse.json(
        { error: 'Missing required field: title' },
        { status: 400 }
      );
    }

    // Insert thread
    const { data: thread, error: insertError } = await supabase
      .from('threads')
      .insert({
        user_id: user.id,
        title: body.title,
        description: body.description || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create thread' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, thread }, { status: 201 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
