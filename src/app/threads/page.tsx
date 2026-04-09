'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ThreadList } from '@/components/ThreadList';
import { ThreadCreate } from '@/components/ThreadCreate';
import type { Thread } from '@/lib/database.types';

export default function ThreadsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchThreads = async () => {
    try {
      const res = await fetch('/api/threads');
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch threads');
      }
      const data = await res.json();
      setThreads(data.threads || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (status === 'authenticated') {
      fetchThreads();
    }
  }, [status, router]);

  const handleThreadCreated = () => {
    fetchThreads();
  };

  if (status === 'loading' || loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <a href="/login" className="text-purple-600 hover:underline">
          Go to Login
        </a>
      </div>
    );
  }

  return (
    <div>
      {session?.user?.email && (
        <div className="bg-purple-100 border border-purple-300 text-purple-800 px-4 py-2 rounded mb-4 text-sm">
          🤖 Logged in as <strong>{session.user.email}</strong>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Your Threads</h1>
      </div>

      <ThreadCreate onCreated={handleThreadCreated} />

      <div className="mt-8">
        <ThreadList threads={threads} />
      </div>
    </div>
  );
}
