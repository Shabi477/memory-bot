'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import ResumePromptPanel from '@/components/ResumePromptPanel';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: 'active' | 'paused' | 'complete';
  created_at: string;
  updated_at: string;
}

interface Thread {
  id: string;
  title: string;
  description: string | null;
  moment_count: number;
  created_at: string;
  updated_at: string;
}

interface Moment {
  id: string;
  thread_id: string;
  source: string;
  title: string | null;
  raw_text: string;
  summary: string | null;
  moment_type: string | null;
  created_at: string;
}

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [recentMoments, setRecentMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [showResumePanel, setShowResumePanel] = useState(false);
  const [showAddThreads, setShowAddThreads] = useState(false);
  const [unassignedThreads, setUnassignedThreads] = useState<Thread[]>([]);
  const [selectedThreads, setSelectedThreads] = useState<string[]>([]);

  useEffect(() => {
    loadProject();
    loadThreads();
  }, [id]);

  async function loadProject() {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        const found = data.projects.find((p: Project) => p.id === id);
        if (found) {
          setProject(found);
          setEditName(found.name);
          setEditDescription(found.description || '');
        } else {
          router.push('/projects');
        }
      }
    } catch (error) {
      console.error('Failed to load project:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadThreads() {
    try {
      const res = await fetch(`/api/projects/threads?projectId=${id}`);
      if (res.ok) {
        const data = await res.json();
        setThreads(data.threads);
        
        // Load recent moments from all threads
        if (data.threads.length > 0) {
          const threadIds = data.threads.map((t: Thread) => t.id);
          // For now, we'll show the threads list - moments would require another API call
        }
      }
    } catch (error) {
      console.error('Failed to load threads:', error);
    }
  }

  async function loadUnassignedThreads() {
    try {
      const res = await fetch('/api/projects/threads?includeUnassigned=true');
      if (res.ok) {
        const data = await res.json();
        setUnassignedThreads(data.threads);
        setShowAddThreads(true);
      }
    } catch (error) {
      console.error('Failed to load unassigned threads:', error);
    }
  }

  async function saveProject() {
    if (!editName.trim()) return;

    try {
      const res = await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: project?.id,
          name: editName,
          description: editDescription || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setProject(data.project);
        setEditing(false);
      }
    } catch (error) {
      console.error('Failed to save project:', error);
    }
  }

  async function updateStatus(status: string) {
    try {
      const res = await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: project?.id, status }),
      });

      if (res.ok) {
        const data = await res.json();
        setProject(data.project);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  }

  async function addThreadsToProject() {
    if (selectedThreads.length === 0) return;

    try {
      const res = await fetch('/api/projects/threads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: id,
          threadIds: selectedThreads,
          action: 'assign',
        }),
      });

      if (res.ok) {
        setSelectedThreads([]);
        setShowAddThreads(false);
        loadThreads();
        loadProject();
      }
    } catch (error) {
      console.error('Failed to add threads:', error);
    }
  }

  async function removeThreadFromProject(threadId: string) {
    if (!confirm('Remove this thread from the project?')) return;

    try {
      const res = await fetch('/api/projects/threads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadIds: [threadId],
          action: 'unassign',
        }),
      });

      if (res.ok) {
        loadThreads();
        loadProject();
      }
    } catch (error) {
      console.error('Failed to remove thread:', error);
    }
  }

  async function deleteProject() {
    if (!confirm('Delete this project? Threads will be unassigned but not deleted.')) return;

    try {
      const res = await fetch(`/api/projects?id=${id}&unassignThreads=true`, {
        method: 'DELETE',
      });

      if (res.ok) {
        router.push('/projects');
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'paused': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'complete': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
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
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-8"></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Project not found</p>
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumb */}
        <button
          onClick={() => router.push('/projects')}
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline mb-4 flex items-center gap-1"
        >
          ← Back to Projects
        </button>

        {/* Project Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
          {editing ? (
            <div className="space-y-4">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full text-xl font-bold border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                autoFocus
              />
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Project description..."
                rows={3}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <div className="flex gap-2">
                <button
                  onClick={saveProject}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setEditName(project.name);
                    setEditDescription(project.description || '');
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {project.name}
                  </h1>
                  {project.description && (
                    <p className="text-gray-600 dark:text-gray-400">
                      {project.description}
                    </p>
                  )}
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(project.status)}`}>
                  {project.status}
                </span>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                <span>Created {formatDate(project.created_at)}</span>
                <span>·</span>
                <span>{threads.length} threads</span>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setEditing(true)}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Edit
                </button>
                <select
                  value={project.status}
                  onChange={(e) => updateStatus(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="complete">Complete</option>
                </select>
                <button
                  onClick={() => setShowResumePanel(!showResumePanel)}
                  className="px-3 py-1.5 text-sm bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-800 transition"
                >
                  Generate Context Pack
                </button>
                <button
                  onClick={deleteProject}
                  className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>

        {/* Resume Panel */}
        {showResumePanel && (
          <div className="mb-6">
            <ResumePromptPanel
              projectId={id}
              projectName={project.name}
            />
          </div>
        )}

        {/* Threads Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              Threads ({threads.length})
            </h2>
            <button
              onClick={loadUnassignedThreads}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              + Add Threads
            </button>
          </div>

          {threads.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <p className="mb-2">No threads in this project yet</p>
              <button
                onClick={loadUnassignedThreads}
                className="text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Add existing threads
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {threads.map((thread) => (
                <div
                  key={thread.id}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-750 flex items-center gap-4"
                >
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => router.push(`/thread/${thread.id}`)}
                  >
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {thread.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {thread.moment_count} moments · Updated {formatDate(thread.updated_at)}
                    </p>
                  </div>
                  <button
                    onClick={() => removeThreadFromProject(thread.id)}
                    className="text-sm text-gray-400 hover:text-red-500 transition"
                    title="Remove from project"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Threads Modal */}
        {showAddThreads && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Add Threads to Project
              </h2>

              {unassignedThreads.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 py-4 text-center">
                  No unassigned threads available
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                  {unassignedThreads.map((thread) => (
                    <label
                      key={thread.id}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedThreads.includes(thread.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedThreads([...selectedThreads, thread.id]);
                          } else {
                            setSelectedThreads(selectedThreads.filter((id) => id !== thread.id));
                          }
                        }}
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                      <div>
                        <span className="text-gray-900 dark:text-white">
                          {thread.title}
                        </span>
                        <span className="text-sm text-gray-500 ml-2">
                          ({thread.moment_count} moments)
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddThreads(false);
                    setSelectedThreads([]);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={addThreadsToProject}
                  disabled={selectedThreads.length === 0}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Add {selectedThreads.length > 0 ? `(${selectedThreads.length})` : ''}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
