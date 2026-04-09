'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Moment {
  id: string;
  thread_id: string;
  source: string;
  title: string | null;
  raw_text: string;
  created_at: string;
}

interface Thread {
  id: string;
  title: string;
  description: string | null;
}

export default function SearchPage() {
  const { status } = useSession();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Moment[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === 'unauthenticated') {
    router.push('/login');
    return null;
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      // For now, search is simplified - just fetch threads and filter client-side
      // TODO: Add proper search API endpoint
      const res = await fetch('/api/threads');
      if (!res.ok) throw new Error('Failed to fetch');
      
      const data = await res.json();
      const searchTerm = query.toLowerCase();
      
      // Filter threads that match
      const matchingThreads = (data.threads || []).filter((t: Thread) =>
        t.title.toLowerCase().includes(searchTerm) ||
        t.description?.toLowerCase().includes(searchTerm)
      );
      
      setThreads(matchingThreads);
      setResults([]); // No moment search yet
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Search</h1>

      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your threads..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? '...' : 'Search'}
          </button>
        </div>
      </form>

      {error && (
        <div className="text-red-600 bg-red-50 p-4 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Thread matches */}
      {searched && threads.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Matching Threads ({threads.length})</h2>
          <div className="space-y-2">
            {threads.map((thread) => (
              <Link
                key={thread.id}
                href={`/thread/${thread.id}`}
                className="block p-3 bg-white border border-gray-200 rounded-lg hover:border-purple-300"
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

      {searched && threads.length === 0 && (
        <div className="text-center py-8 bg-gray-100 rounded-lg">
          <p className="text-gray-600">No threads found for &quot;{query}&quot;</p>
        </div>
      )}

      {!searched && (
        <div className="text-center py-12 text-gray-500">
          <p>🔍 Enter a search term to find your threads</p>
          <p className="text-sm mt-2">Full-text search coming soon!</p>
        </div>
      )}
    </div>
  );
}
