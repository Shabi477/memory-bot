'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface InboxMoment {
  id: string;
  source: string;
  source_url: string | null;
  title: string | null;
  raw_text: string;
  created_at: string;
}

interface Thread {
  id: string;
  title: string;
}

export default function InboxPage() {
  const router = useRouter();
  const { status } = useSession();
  const [moments, setMoments] = useState<InboxMoment[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMoments, setSelectedMoments] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status !== 'authenticated') return;

    const fetchData = async () => {
      try {
        const [inboxRes, threadsRes] = await Promise.all([
          fetch('/api/inbox'),
          fetch('/api/threads'),
        ]);

        if (inboxRes.ok) {
          const data = await inboxRes.json();
          setMoments(data.moments || []);
        }

        if (threadsRes.ok) {
          const data = await threadsRes.json();
          setThreads(data.threads || []);
        }
      } catch (err) {
        console.error('Error fetching inbox:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [status, router]);

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedMoments);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedMoments(newSelected);
  };

  const assignToThread = async (threadId: string) => {
    if (selectedMoments.size === 0) return;

    try {
      const res = await fetch('/api/inbox/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          momentIds: Array.from(selectedMoments),
          threadId,
        }),
      });

      if (res.ok) {
        // Remove assigned moments from inbox
        setMoments(moments.filter((m) => !selectedMoments.has(m.id)));
        setSelectedMoments(new Set());
      }
    } catch (err) {
      console.error('Error assigning moments:', err);
    }
  };

  const archiveMoments = async () => {
    if (selectedMoments.size === 0) return;

    try {
      const res = await fetch('/api/inbox/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          momentIds: Array.from(selectedMoments),
        }),
      });

      if (res.ok) {
        setMoments(moments.filter((m) => !selectedMoments.has(m.id)));
        setSelectedMoments(new Set());
      }
    } catch (err) {
      console.error('Error archiving moments:', err);
    }
  };

  const sourceIcons: Record<string, string> = {
    chatgpt: '🟢',
    claude: '🟠',
    gemini: '🔵',
    perplexity: '🟣',
  };

  if (status === 'loading' || loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">📥 Inbox</h1>
          <p className="text-gray-600 text-sm mt-1">
            {moments.length} unsorted moment{moments.length !== 1 ? 's' : ''} waiting to be organized
          </p>
        </div>

        {selectedMoments.size > 0 && (
          <div className="flex gap-2 items-center">
            <span className="text-sm text-purple-600">
              {selectedMoments.size} selected
            </span>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  assignToThread(e.target.value);
                  e.target.value = '';
                }
              }}
              className="border border-purple-300 rounded-md px-3 py-1 text-sm"
              defaultValue=""
            >
              <option value="" disabled>
                Assign to thread...
              </option>
              {threads.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
            <button
              onClick={archiveMoments}
              className="text-gray-500 hover:text-red-600 text-sm"
            >
              🗑️ Archive
            </button>
          </div>
        )}
      </div>

      {/* Empty state */}
      {moments.length === 0 && (
        <div className="text-center py-16 bg-gray-50 rounded-lg">
          <p className="text-4xl mb-4">✨</p>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            Inbox Zero!
          </h2>
          <p className="text-gray-500">
            All your moments are organized. Great job!
          </p>
        </div>
      )}

      {/* Moment cards */}
      <div className="space-y-3">
        {moments.map((moment) => (
          <div
            key={moment.id}
            className={`bg-white border rounded-lg p-4 transition-all cursor-pointer ${
              selectedMoments.has(moment.id)
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-purple-300'
            }`}
            onClick={() => toggleSelect(moment.id)}
          >
            <div className="flex items-start gap-3">
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={selectedMoments.has(moment.id)}
                onChange={() => toggleSelect(moment.id)}
                className="mt-1 h-4 w-4 text-purple-600 rounded"
              />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span>{sourceIcons[moment.source] || '💬'}</span>
                  <span className="text-sm font-medium text-gray-700">
                    {moment.source}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(moment.created_at).toLocaleDateString()}
                  </span>
                </div>

                {moment.title && (
                  <h3 className="font-medium text-gray-900 mb-1">
                    {moment.title}
                  </h3>
                )}

                <p className="text-gray-600 text-sm line-clamp-3">
                  {moment.raw_text}
                </p>

                {moment.source_url && (
                  <a
                    href={moment.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-purple-600 hover:underline mt-2 inline-block"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View original →
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions bar */}
      {moments.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-full shadow-lg px-6 py-3 flex gap-4 items-center">
          <button
            onClick={() => {
              if (selectedMoments.size === moments.length) {
                setSelectedMoments(new Set());
              } else {
                setSelectedMoments(new Set(moments.map((m) => m.id)));
              }
            }}
            className="text-sm text-purple-600 hover:text-purple-800"
          >
            {selectedMoments.size === moments.length ? 'Deselect all' : 'Select all'}
          </button>
          <span className="text-gray-300">|</span>
          <span className="text-sm text-gray-500">
            {moments.length} in inbox
          </span>
        </div>
      )}
    </div>
  );
}
