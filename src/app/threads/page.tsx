'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ThreadList } from '@/components/ThreadList';
import { ThreadCreate } from '@/components/ThreadCreate';
import type { Thread } from '@/lib/database.types';
import { DEMO_MODE, DEMO_THREADS } from '@/lib/demo-data';

export default function ThreadsPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const fetchThreads = async () => {
    // If already in demo mode, stay in demo mode
    if (isDemoMode) {
      if (threads.length === 0) {
        setThreads(DEMO_THREADS as Thread[]);
      }
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // No user logged in - offer demo mode in dev
        if (DEMO_MODE) {
          setIsDemoMode(true);
          setUserEmail(null);
          setThreads(DEMO_THREADS as Thread[]);
          setLoading(false);
          return;
        }
        setError('Please log in to view threads');
        setLoading(false);
        return;
      }

      // User is logged in - fetch real threads
      setUserEmail(user.email || null);
      console.log('Fetching threads for user:', user.id);
      
      const { data, error: fetchError } = await supabase
        .from('threads')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (fetchError) {
        console.error('Fetch error:', fetchError);
        throw fetchError;
      }
      
      console.log('Fetched threads:', data);
      setThreads(data || []);
    } catch (err: any) {
      console.error('Error fetching threads:', err);
      // Show the actual error instead of falling back to demo
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThreads();
  }, []);

  // In demo mode, add thread to local state
  const handleThreadCreated = (newThread?: Thread) => {
    if (isDemoMode && newThread) {
      setThreads(prev => [newThread, ...prev]);
    } else {
      fetchThreads();
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading threads...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <a href="/login" className="text-blue-600 hover:underline">
          Go to Login
        </a>
      </div>
    );
  }

  return (
    <div>
      {isDemoMode && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-2 rounded mb-4 text-sm">
          🎭 <strong>Demo Mode</strong> - Using sample data. Changes won&apos;t persist.
          <a href="/login" className="ml-2 underline">Sign in</a>
        </div>
      )}

      {userEmail && (
        <div className="bg-green-100 border border-green-400 text-green-800 px-4 py-2 rounded mb-4 text-sm">
          ✅ Logged in as <strong>{userEmail}</strong>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Your Threads</h1>
      </div>

      <ThreadCreate onCreated={handleThreadCreated} demoMode={isDemoMode} />

      <div className="mt-8">
        <ThreadList threads={threads} />
      </div>
    </div>
  );
}
