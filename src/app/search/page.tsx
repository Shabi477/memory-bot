'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Moment {
  id: string;
  thread_id: string;
  thread_title: string | null;
  source: string;
  title: string | null;
  raw_text: string;
  raw_text_preview: string;
  created_at: string;
}

interface Thread {
  id: string;
  title: string;
  description: string | null;
}

type FilterType = 'all' | 'threads' | 'moments';
type SourceFilter = '' | 'chatgpt' | 'claude' | 'gemini';

export default function SearchPage() {
  const { status } = useSession();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('');
  const [moments, setMoments] = useState<Moment[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  if (status === 'unauthenticated') {
    router.push('/login');
    return null;
  }

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() || query.length < 2) return;

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const params = new URLSearchParams({ q: query, filter });
      if (sourceFilter) params.set('source', sourceFilter);
      
      const res = await fetch(`/api/search?${params}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Search failed');
      }
      
      const data = await res.json();
      setThreads(data.threads || []);
      setMoments(data.moments || []);
      setTotalCount(data.totalCount || 0);
    } catch (err: any) {
      setError(err.message);
      setThreads([]);
      setMoments([]);
    } finally {
      setLoading(false);
    }
  };

  const sourceIcons: Record<string, string> = {
    chatgpt: '🟢',
    claude: '🟠',
    gemini: '🔵',
    perplexity: '🟣',
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">🔍 Search</h1>

      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search threads and moments..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            type="submit"
            disabled={loading || query.length < 2}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? '...' : 'Search'}
          </button>
        </div>
        
        {/* Filters */}
        <div className="flex gap-4 flex-wrap">
          <div className="flex gap-1">
            {(['all', 'threads', 'moments'] as FilterType[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => { setFilter(f); if (searched) handleSearch(); }}
                className={`px-3 py-1 rounded text-sm ${
                  filter === f
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          
          <select
            value={sourceFilter}
            onChange={(e) => { setSourceFilter(e.target.value as SourceFilter); if (searched) handleSearch(); }}
            className="px-3 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="">All sources</option>
            <option value="chatgpt">🟢 ChatGPT</option>
            <option value="claude">🟠 Claude</option>
            <option value="gemini">🔵 Gemini</option>
          </select>
        </div>
      </form>

      {error && (
        <div className="text-red-600 bg-red-50 p-4 rounded-lg mb-4">
          {error}
        </div>
      )}

      {searched && (
        <p className="text-sm text-gray-500 mb-4">
          Found {totalCount} result{totalCount !== 1 ? 's' : ''} for &quot;{query}&quot;
        </p>
      )}

      {/* Thread matches */}
      {threads.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">📂 Threads ({threads.length})</h2>
          <div className="space-y-2">
            {threads.map((thread) => (
              <Link
                key={thread.id}
                href={`/thread/${thread.id}`}
                className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-purple-300 hover:shadow-sm transition-all"
              >
                <h3 className="font-medium text-purple-700">{thread.title}</h3>
                {thread.description && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{thread.description}</p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Moment matches */}
      {moments.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">💡 Moments ({moments.length})</h2>
          <div className="space-y-3">
            {moments.map((moment) => (
              <div
                key={moment.id}
                className="p-4 bg-white border border-gray-200 rounded-lg hover:border-purple-300 transition-all"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span>{sourceIcons[moment.source] || '💬'}</span>
                  <span className="text-sm text-gray-500">{moment.source}</span>
                  {moment.thread_title && (
                    <>
                      <span className="text-gray-300">•</span>
                      <Link
                        href={`/thread/${moment.thread_id}`}
                        className="text-sm text-purple-600 hover:underline"
                      >
                        {moment.thread_title}
                      </Link>
                    </>
                  )}
                  <span className="text-gray-300">•</span>
                  <span className="text-xs text-gray-400">
                    {new Date(moment.created_at).toLocaleDateString()}
                  </span>
                </div>
                {moment.title && (
                  <h3 className="font-medium mb-1">{moment.title}</h3>
                )}
                <p className="text-sm text-gray-700 line-clamp-3">
                  {moment.raw_text_preview}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {searched && totalCount === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600 text-lg">No results found for &quot;{query}&quot;</p>
          <p className="text-sm text-gray-500 mt-2">Try different keywords or check your spelling</p>
        </div>
      )}

      {!searched && (
        <div className="text-center py-16 bg-gray-50 rounded-lg">
          <p className="text-4xl mb-4">🔍</p>
          <p className="text-gray-600">Search across all your threads and moments</p>
          <p className="text-sm text-gray-500 mt-2">Full-text search powered by PostgreSQL</p>
        </div>
      )}
    </div>
  );
}
