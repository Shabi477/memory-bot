'use client';

import { useState, useEffect } from 'react';

interface Artifact {
  id: string;
  moment_id: string | null;
  thread_id: string | null;
  artifact_type: 'code' | 'document' | 'prompt' | 'data' | 'image';
  title: string;
  content: string;
  language: string | null;
  tags: string[] | null;
  version: number;
  created_at: string;
  updated_at: string;
}

const TYPE_ICONS: Record<string, string> = {
  code: '💻',
  document: '📄',
  prompt: '💬',
  data: '📊',
  image: '🖼️',
};

const TYPE_COLORS: Record<string, string> = {
  code: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  document: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  prompt: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  data: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  image: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
};

export default function ArtifactsPage() {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [newArtifact, setNewArtifact] = useState({
    title: '',
    content: '',
    artifactType: 'code' as Artifact['artifact_type'],
    language: '',
    tags: '',
  });

  useEffect(() => {
    loadArtifacts();
  }, [filter, search]);

  async function loadArtifacts() {
    try {
      let url = '/api/artifacts';
      const params = new URLSearchParams();
      
      if (filter !== 'all') {
        params.set('type', filter);
      }
      if (search.trim()) {
        params.set('search', search.trim());
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setArtifacts(data.artifacts);
      }
    } catch (error) {
      console.error('Failed to load artifacts:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createArtifact() {
    if (!newArtifact.title.trim() || !newArtifact.content.trim()) return;

    try {
      const res = await fetch('/api/artifacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newArtifact.title,
          content: newArtifact.content,
          artifactType: newArtifact.artifactType,
          language: newArtifact.language || null,
          tags: newArtifact.tags ? newArtifact.tags.split(',').map(t => t.trim()).filter(Boolean) : null,
        }),
      });

      if (res.ok) {
        setShowCreate(false);
        setNewArtifact({ title: '', content: '', artifactType: 'code', language: '', tags: '' });
        loadArtifacts();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create artifact');
      }
    } catch (error) {
      console.error('Failed to create artifact:', error);
    }
  }

  async function deleteArtifact(id: string) {
    if (!confirm('Delete this artifact?')) return;

    try {
      const res = await fetch(`/api/artifacts?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedArtifact(null);
        loadArtifacts();
      }
    } catch (error) {
      console.error('Failed to delete artifact:', error);
    }
  }

  async function copyToClipboard(content: string) {
    try {
      await navigator.clipboard.writeText(content);
      alert('Copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Artifacts</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Save and organize code, prompts, and documents from your AI chats
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
          >
            <span>+</span> New Artifact
          </button>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search artifacts..."
            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                filter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              All
            </button>
            {Object.entries(TYPE_ICONS).map(([type, icon]) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1 ${
                  filter === type
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {icon} {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Artifacts Grid */}
        {artifacts.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {search ? 'No artifacts found' : 'No artifacts yet'}
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Create your first artifact
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {artifacts.map((artifact) => (
              <div
                key={artifact.id}
                onClick={() => setSelectedArtifact(artifact)}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{TYPE_ICONS[artifact.artifact_type]}</span>
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {artifact.title}
                    </h3>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[artifact.artifact_type]}`}>
                    {artifact.artifact_type}
                  </span>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3 font-mono">
                  {artifact.content.slice(0, 100)}...
                </p>

                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    {artifact.language && <span className="text-indigo-600 dark:text-indigo-400">{artifact.language}</span>}
                    {artifact.language && ' · '}
                    v{artifact.version}
                  </span>
                  <span>{formatDate(artifact.created_at)}</span>
                </div>

                {artifact.tags && artifact.tags.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {artifact.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                    {artifact.tags.length > 3 && (
                      <span className="text-xs text-gray-400">+{artifact.tags.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Create Artifact Modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Create New Artifact
              </h2>

              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={newArtifact.title}
                      onChange={(e) => setNewArtifact({ ...newArtifact, title: e.target.value })}
                      placeholder="e.g., API Response Handler"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="w-40">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Type
                    </label>
                    <select
                      value={newArtifact.artifactType}
                      onChange={(e) => setNewArtifact({ ...newArtifact, artifactType: e.target.value as Artifact['artifact_type'] })}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="code">💻 Code</option>
                      <option value="prompt">💬 Prompt</option>
                      <option value="document">📄 Document</option>
                      <option value="data">📊 Data</option>
                      <option value="image">🖼️ Image</option>
                    </select>
                  </div>
                </div>

                {newArtifact.artifactType === 'code' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Language
                    </label>
                    <input
                      type="text"
                      value={newArtifact.language}
                      onChange={(e) => setNewArtifact({ ...newArtifact, language: e.target.value })}
                      placeholder="e.g., javascript, python, typescript"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Content
                  </label>
                  <textarea
                    value={newArtifact.content}
                    onChange={(e) => setNewArtifact({ ...newArtifact, content: e.target.value })}
                    placeholder={newArtifact.artifactType === 'code' ? 'Paste your code here...' : 'Enter content...'}
                    rows={12}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={newArtifact.tags}
                    onChange={(e) => setNewArtifact({ ...newArtifact, tags: e.target.value })}
                    placeholder="e.g., react, api, auth"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreate(false);
                    setNewArtifact({ title: '', content: '', artifactType: 'code', language: '', tags: '' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={createArtifact}
                  disabled={!newArtifact.title.trim() || !newArtifact.content.trim()}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Create Artifact
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Artifact Modal */}
        {selectedArtifact && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{TYPE_ICONS[selectedArtifact.artifact_type]}</span>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {selectedArtifact.title}
                    </h2>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[selectedArtifact.artifact_type]}`}>
                        {selectedArtifact.artifact_type}
                      </span>
                      {selectedArtifact.language && (
                        <span className="text-indigo-600 dark:text-indigo-400">
                          {selectedArtifact.language}
                        </span>
                      )}
                      <span>v{selectedArtifact.version}</span>
                      <span>·</span>
                      <span>{formatDate(selectedArtifact.created_at)}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedArtifact(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl"
                >
                  ✕
                </button>
              </div>

              {selectedArtifact.tags && selectedArtifact.tags.length > 0 && (
                <div className="flex gap-2 mb-4 flex-wrap">
                  {selectedArtifact.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="relative">
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono">
                  <code>{selectedArtifact.content}</code>
                </pre>
                <button
                  onClick={() => copyToClipboard(selectedArtifact.content)}
                  className="absolute top-2 right-2 px-3 py-1 bg-gray-700 text-gray-300 rounded text-sm hover:bg-gray-600 transition"
                >
                  📋 Copy
                </button>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => deleteArtifact(selectedArtifact.id)}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                >
                  Delete
                </button>
                <button
                  onClick={() => setSelectedArtifact(null)}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
