import Link from 'next/link';
import type { Thread } from '@/lib/database.types';

interface ThreadListProps {
  threads: Thread[];
}

export function ThreadList({ threads }: ThreadListProps) {
  if (threads.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-100 rounded-lg">
        <p className="text-gray-600">No threads yet.</p>
        <p className="text-sm text-gray-500 mt-2">
          Create your first thread to start organizing your AI chat moments.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {threads.map((thread) => (
        <Link
          key={thread.id}
          href={`/thread/${thread.id}`}
          className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
        >
          <h3 className="font-semibold text-lg">{thread.title}</h3>
          {thread.description && (
            <p className="text-gray-600 text-sm mt-1 line-clamp-2">
              {thread.description}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-2">
            Updated: {new Date(thread.updated_at).toLocaleDateString()}
          </p>
        </Link>
      ))}
    </div>
  );
}
