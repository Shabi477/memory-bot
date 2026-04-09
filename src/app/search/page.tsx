'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import type { Moment, Thread } from '@/lib/database.types';

interface SearchResult extends Moment {
  thread_title?: string;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [threads, setThreads] = useState<Record<string, Thread>>({});
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('Please log in to search');
        setLoading(false);
        return;
      }

      // Search moments by raw_text, summary, title, or key_points
      // Using ilike for case-insensitive search
      const searchTerm = `%${query.trim()}%`;
      
      const { data: moments, error: searchError } = await supabase
        .from('moments')
        .select('*')
        .eq('user_id', user.id)
        .or(`raw_text.ilike.${searchTerm},summary.ilike.${searchTerm},title.ilike.${searchTerm}`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (searchError) throw searchError;

      // Also search threads
      const { data: threadResults, error: threadError } = await supabase
        .from('threads')
        .select('*')
        .eq('user_id', user.id)
        .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`);

      if (threadError) throw threadError;

      // Create a map of threads for quick lookup
      const threadMap: Record<string, Thread> = {};
      if (threadResults) {
        for (const thread of threadResults) {
          threadMap[thread.id] = thread;
        }
      }

      // Also fetch threads for the found moments
      if (moments && moments.length > 0) {
        const threadIds = [...new Set(moments.map(m => m.thread_id))];
        const { data: momentThreads } = await supabase
          .from('threads')
          .select('*')
          .in('id', threadIds);

        if (momentThreads) {
          for (const thread of momentThreads) {
            threadMap[thread.id] = thread;
          }
        }
      }

      setThreads(threadMap);
      setResults(moments || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Search Moments</h1>

      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your saved moments..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {error && (
        <div className="text-red-600 bg-red-50 p-4 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Thread matches */}
      {searched && Object.keys(threads).length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Matching Threads</h2>
          <div className="space-y-2">
            {Object.values(threads)
              .filter(t => 
                t.title.toLowerCase().includes(query.toLowerCase()) ||
                t.description?.toLowerCase().includes(query.toLowerCase())
              )
              .map((thread) => (
                <Link
                  key={thread.id}
                  href={`/thread/${thread.id}`}
                  className="block p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300"
                >
                  <h3 className="font-medium">{thread.title}</h3>
                  {thread.description && (
                    <p className="text-sm text-gray-600 truncate">{thread.description}</p>
                  )}
                </Link>
              ))}
          </div>
        </div>
      )}

      {/* Moment matches */}
      {searched && (
        <div>
          <h2 className="text-lg font-semibold mb-3">
            Matching Moments ({results.length})
          </h2>
          
          {results.length === 0 ? (
            <div className="text-center py-8 bg-gray-100 rounded-lg">
              <p className="text-gray-600">No moments found for "{query}"</p>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((moment) => (
                <Link
                  key={moment.id}
                  href={`/thread/${moment.thread_id}`}
                  className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium">
                      {moment.title || 'Untitled moment'}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {new Date(moment.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {moment.summary && (
                    <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                      {moment.summary}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    Thread: {threads[moment.thread_id]?.title || 'Unknown'}
                    {' • '}
                    Source: {moment.source}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {!searched && (
        <div className="text-center py-12 text-gray-500">
          Enter a search term to find your saved moments
        </div>
      )}
    </div>
  );
}
