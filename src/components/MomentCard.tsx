'use client';

import { useState } from 'react';
import type { Moment } from '@/lib/database.types';

interface MomentCardProps {
  moment: Moment;
  index: number;
}

export function MomentCard({ moment, index }: MomentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Timeline indicator */}
      <div className="flex">
        <div className="w-12 flex-shrink-0 bg-gray-50 flex flex-col items-center py-4">
          <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
            {index}
          </span>
          <div className="w-px h-full bg-gray-300 mt-2" />
        </div>

        <div className="flex-1 p-4">
          {/* Header */}
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-semibold">
                {moment.title || `Moment #${index}`}
              </h3>
              <p className="text-xs text-gray-500">
                {moment.source} • {new Date(moment.created_at).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Summary */}
          {moment.summary && (
            <p className="text-gray-700 text-sm mb-3">{moment.summary}</p>
          )}

          {/* Key Points */}
          {moment.key_points && moment.key_points.length > 0 && (
            <div className="mb-3">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                Key Points
              </h4>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                {moment.key_points.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Expand/Collapse Raw Text */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-blue-600 hover:underline"
          >
            {isExpanded ? 'Hide raw text' : 'Show raw text'}
          </button>

          {isExpanded && (
            <div className="mt-3 p-3 bg-gray-50 rounded text-sm text-gray-700 whitespace-pre-wrap max-h-64 overflow-y-auto">
              {moment.raw_text}
            </div>
          )}

          {/* Source URL */}
          {moment.source_url && (
            <a
              href={moment.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-3 text-xs text-blue-600 hover:underline"
            >
              Open original chat →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
