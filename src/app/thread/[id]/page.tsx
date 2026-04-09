'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { MomentCard } from '@/components/MomentCard';
import { ResumePromptPanel } from '@/components/ResumePromptPanel';
import type { Thread, Moment } from '@/lib/database.types';
import { DEMO_MODE, DEMO_THREADS, DEMO_MOMENTS } from '@/lib/demo-data';

export default function ThreadDetailPage() {
  const params = useParams();
  const threadId = params.id as string;
  
  const [thread, setThread] = useState<Thread | null>(null);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showResumePanel, setShowResumePanel] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      // Check for demo thread
      if (DEMO_MODE && threadId.startsWith('demo-')) {
        const demoThread = DEMO_THREADS.find(t => t.id === threadId);
        const demoMoments = DEMO_MOMENTS.filter(m => m.thread_id === threadId);
        if (demoThread) {
          setThread(demoThread as Thread);
          setMoments(demoMoments as Moment[]);
          setIsDemoMode(true);
          setLoading(false);
          return;
        }
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          // Try demo mode
          if (DEMO_MODE) {
            const demoThread = DEMO_THREADS.find(t => t.id === threadId);
            if (demoThread) {
              setThread(demoThread as Thread);
              setMoments(DEMO_MOMENTS.filter(m => m.thread_id === threadId) as Moment[]);
              setIsDemoMode(true);
              setLoading(false);
              return;
            }
          }
          setError('Please log in to view this thread');
          setLoading(false);
          return;
        }

        // Fetch thread
        const { data: threadData, error: threadError } = await supabase
          .from('threads')
          .select('*')
          .eq('id', threadId)
          .eq('user_id', user.id)
          .single();

        if (threadError) throw threadError;
        setThread(threadData);

        // Fetch moments for this thread
        const { data: momentsData, error: momentsError } = await supabase
          .from('moments')
          .select('*')
          .eq('thread_id', threadId)
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (momentsError) throw momentsError;
        setMoments(momentsData || []);
      } catch (err: any) {
        // Try demo fallback
        if (DEMO_MODE) {
          const demoThread = DEMO_THREADS.find(t => t.id === threadId);
          if (demoThread) {
            setThread(demoThread as Thread);
            setMoments(DEMO_MOMENTS.filter(m => m.thread_id === threadId) as Moment[]);
            setIsDemoMode(true);
            setLoading(false);
            return;
          }
        }
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [threadId]);

  if (loading) {
    return <div className="text-center py-8">Loading thread...</div>;
  }

  if (error || !thread) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error || 'Thread not found'}</p>
        <a href="/threads" className="text-blue-600 hover:underline">
          Back to Threads
        </a>
      </div>
    );
  }

  return (
    <div>
      {isDemoMode && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-2 rounded mb-4 text-sm">
          🎭 <strong>Demo Mode</strong> - Viewing sample data.
        </div>
      )}

      {/* Thread Header */}
      <div className="mb-6">
        <a href="/threads" className="text-blue-600 hover:underline text-sm">
          ← Back to Threads
        </a>
        <h1 className="text-2xl font-bold mt-2">{thread.title}</h1>
        {thread.description && (
          <p className="text-gray-600 mt-1">{thread.description}</p>
        )}
        <p className="text-sm text-gray-400 mt-2">
          Created: {new Date(thread.created_at).toLocaleDateString()}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setShowResumePanel(!showResumePanel)}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
        >
          {showResumePanel ? 'Hide Resume Prompt' : 'Generate Resume Prompt'}
        </button>
      </div>

      {/* Resume Prompt Panel */}
      {showResumePanel && (
        <ResumePromptPanel thread={thread} moments={moments} />
      )}

      {/* Timeline of Moments */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">
          Timeline ({moments.length} moment{moments.length !== 1 ? 's' : ''})
        </h2>
        
        {moments.length === 0 ? (
          <div className="text-center py-8 bg-gray-100 rounded-lg">
            <p className="text-gray-600">No moments saved yet.</p>
            <p className="text-sm text-gray-500 mt-2">
              Use the Chrome extension to save moments from ChatGPT.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {moments.map((moment, index) => (
              <MomentCard key={moment.id} moment={moment} index={index + 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
