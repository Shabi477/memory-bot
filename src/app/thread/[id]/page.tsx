'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { MomentCard } from '@/components/MomentCard';
import { ResumePromptPanel } from '@/components/ResumePromptPanel';
import type { Thread, Moment } from '@/lib/database.types';

export default function ThreadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { status } = useSession();
  const threadId = params.id as string;
  
  const [thread, setThread] = useState<Thread | null>(null);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showResumePanel, setShowResumePanel] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status !== 'authenticated') return;

    const fetchData = async () => {
      try {
        // Fetch threads to find this one
        const threadsRes = await fetch('/api/threads');
        if (!threadsRes.ok) throw new Error('Failed to fetch threads');
        const threadsData = await threadsRes.json();
        
        const foundThread = threadsData.threads?.find((t: Thread) => t.id === threadId);
        if (!foundThread) {
          setError('Thread not found');
          setLoading(false);
          return;
        }
        setThread(foundThread);

        // Fetch moments for this thread
        const momentsRes = await fetch(`/api/moments?threadId=${threadId}`);
        if (momentsRes.ok) {
          const momentsData = await momentsRes.json();
          setMoments(momentsData.moments || []);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [threadId, status, router]);

  if (status === 'loading' || loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (error || !thread) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error || 'Thread not found'}</p>
        <a href="/threads" className="text-purple-600 hover:underline">
          Back to Threads
        </a>
      </div>
    );
  }

  return (
    <div>
      {/* Thread Header */}
      <div className="mb-6">
        <a href="/threads" className="text-purple-600 hover:underline text-sm">
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
          {showResumePanel ? 'Hide Resume Prompt' : '🚀 Generate Resume Prompt'}
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
              Use the Chrome extension to save moments from any AI chat.
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
