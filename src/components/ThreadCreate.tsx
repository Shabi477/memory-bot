'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Thread } from '@/lib/database.types';

interface ThreadCreateProps {
  onCreated: (newThread?: Thread) => void;
  demoMode?: boolean;
}

export function ThreadCreate({ onCreated, demoMode = false }: ThreadCreateProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    setError(null);

    // In demo mode, create a local thread
    if (demoMode) {
      const newThread: Thread = {
        id: `demo-${Date.now()}`,
        user_id: 'demo-user',
        title: title.trim(),
        description: description.trim() || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      setTitle('');
      setDescription('');
      setIsOpen(false);
      setLoading(false);
      onCreated(newThread);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('You must be logged in to create a thread');
      }

      const { error: insertError } = await supabase.from('threads').insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
      });

      if (insertError) throw insertError;

      setTitle('');
      setDescription('');
      setIsOpen(false);
      onCreated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
      >
        + Create New Thread
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white border border-gray-200 rounded-lg">
      <h3 className="font-semibold mb-3">Create New Thread</h3>
      
      <div className="space-y-3">
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-1">
            Title *
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., React Project Setup"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-1">
            Description (optional)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this thread..."
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Thread'}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setTitle('');
              setDescription('');
              setError(null);
            }}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}
