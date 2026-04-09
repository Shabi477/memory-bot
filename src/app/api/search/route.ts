import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { auth } from '@/auth';

// GET /api/search?q=query - Full-text search across threads and moments
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const query = request.nextUrl.searchParams.get('q');
    const filter = request.nextUrl.searchParams.get('filter') || 'all'; // all, threads, moments
    const source = request.nextUrl.searchParams.get('source'); // chatgpt, claude, etc.
    const threadId = request.nextUrl.searchParams.get('threadId');

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      );
    }

    const searchTerm = query.trim();
    // Format for Postgres full-text search (convert spaces to &)
    const tsQuery = searchTerm.split(/\s+/).join(' & ');

    let threads: any[] = [];
    let moments: any[] = [];

    // Search threads
    if (filter === 'all' || filter === 'threads') {
      threads = await sql`
        SELECT id, title, description, created_at, updated_at,
               ts_rank(to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, '')), 
                       plainto_tsquery('english', ${searchTerm})) as rank
        FROM threads
        WHERE user_id = ${session.user.id}
          AND (
            to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, '')) 
            @@ plainto_tsquery('english', ${searchTerm})
            OR title ILIKE ${'%' + searchTerm + '%'}
            OR description ILIKE ${'%' + searchTerm + '%'}
          )
        ORDER BY rank DESC, updated_at DESC
        LIMIT 20
      `;
    }

    // Search moments
    if (filter === 'all' || filter === 'moments') {
      let momentsQuery;
      
      if (source && threadId) {
        momentsQuery = sql`
          SELECT m.id, m.thread_id, m.source, m.source_url, m.title, m.raw_text, m.summary, m.created_at,
                 t.title as thread_title,
                 ts_rank(to_tsvector('english', COALESCE(m.title, '') || ' ' || COALESCE(m.summary, '') || ' ' || m.raw_text), 
                         plainto_tsquery('english', ${searchTerm})) as rank
          FROM moments m
          LEFT JOIN threads t ON m.thread_id = t.id
          WHERE m.user_id = ${session.user.id}
            AND m.source = ${source}
            AND m.thread_id = ${threadId}
            AND (
              to_tsvector('english', COALESCE(m.title, '') || ' ' || COALESCE(m.summary, '') || ' ' || m.raw_text) 
              @@ plainto_tsquery('english', ${searchTerm})
              OR m.raw_text ILIKE ${'%' + searchTerm + '%'}
              OR m.title ILIKE ${'%' + searchTerm + '%'}
            )
          ORDER BY rank DESC, m.created_at DESC
          LIMIT 50
        `;
      } else if (source) {
        momentsQuery = sql`
          SELECT m.id, m.thread_id, m.source, m.source_url, m.title, m.raw_text, m.summary, m.created_at,
                 t.title as thread_title,
                 ts_rank(to_tsvector('english', COALESCE(m.title, '') || ' ' || COALESCE(m.summary, '') || ' ' || m.raw_text), 
                         plainto_tsquery('english', ${searchTerm})) as rank
          FROM moments m
          LEFT JOIN threads t ON m.thread_id = t.id
          WHERE m.user_id = ${session.user.id}
            AND m.source = ${source}
            AND (
              to_tsvector('english', COALESCE(m.title, '') || ' ' || COALESCE(m.summary, '') || ' ' || m.raw_text) 
              @@ plainto_tsquery('english', ${searchTerm})
              OR m.raw_text ILIKE ${'%' + searchTerm + '%'}
              OR m.title ILIKE ${'%' + searchTerm + '%'}
            )
          ORDER BY rank DESC, m.created_at DESC
          LIMIT 50
        `;
      } else if (threadId) {
        momentsQuery = sql`
          SELECT m.id, m.thread_id, m.source, m.source_url, m.title, m.raw_text, m.summary, m.created_at,
                 t.title as thread_title,
                 ts_rank(to_tsvector('english', COALESCE(m.title, '') || ' ' || COALESCE(m.summary, '') || ' ' || m.raw_text), 
                         plainto_tsquery('english', ${searchTerm})) as rank
          FROM moments m
          LEFT JOIN threads t ON m.thread_id = t.id
          WHERE m.user_id = ${session.user.id}
            AND m.thread_id = ${threadId}
            AND (
              to_tsvector('english', COALESCE(m.title, '') || ' ' || COALESCE(m.summary, '') || ' ' || m.raw_text) 
              @@ plainto_tsquery('english', ${searchTerm})
              OR m.raw_text ILIKE ${'%' + searchTerm + '%'}
              OR m.title ILIKE ${'%' + searchTerm + '%'}
            )
          ORDER BY rank DESC, m.created_at DESC
          LIMIT 50
        `;
      } else {
        momentsQuery = sql`
          SELECT m.id, m.thread_id, m.source, m.source_url, m.title, m.raw_text, m.summary, m.created_at,
                 t.title as thread_title,
                 ts_rank(to_tsvector('english', COALESCE(m.title, '') || ' ' || COALESCE(m.summary, '') || ' ' || m.raw_text), 
                         plainto_tsquery('english', ${searchTerm})) as rank
          FROM moments m
          LEFT JOIN threads t ON m.thread_id = t.id
          WHERE m.user_id = ${session.user.id}
            AND (
              to_tsvector('english', COALESCE(m.title, '') || ' ' || COALESCE(m.summary, '') || ' ' || m.raw_text) 
              @@ plainto_tsquery('english', ${searchTerm})
              OR m.raw_text ILIKE ${'%' + searchTerm + '%'}
              OR m.title ILIKE ${'%' + searchTerm + '%'}
            )
          ORDER BY rank DESC, m.created_at DESC
          LIMIT 50
        `;
      }
      
      moments = await momentsQuery;
    }

    // Highlight matching text in results
    const highlightedMoments = moments.map((m) => ({
      ...m,
      raw_text_preview: highlightText(m.raw_text, searchTerm, 200),
    }));

    return NextResponse.json({
      query: searchTerm,
      threads,
      moments: highlightedMoments,
      totalCount: threads.length + moments.length,
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Helper to extract and highlight matching text
function highlightText(text: string, query: string, contextLength: number = 200): string {
  if (!text) return '';
  
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);
  
  if (index === -1) {
    // No exact match, return start of text
    return text.slice(0, contextLength) + (text.length > contextLength ? '...' : '');
  }
  
  // Extract context around the match
  const start = Math.max(0, index - 50);
  const end = Math.min(text.length, index + query.length + contextLength);
  
  let preview = text.slice(start, end);
  if (start > 0) preview = '...' + preview;
  if (end < text.length) preview = preview + '...';
  
  return preview;
}
