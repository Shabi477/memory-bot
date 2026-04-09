'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '@/components/Nav';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: 'active' | 'paused' | 'complete';
  thread_count: number;
  moment_count: number;
  created_at: string;
  updated_at: string;
}

interface Thread {
  id: string;
  title: string;
  description: string | null;
  project_id: string | null;
  moment_count: number;
  updated_at: string;
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [unassignedThreads, setUnassignedThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [filter, setFilter] = useState<'all' | 'active' | 'paused' | 'complete'>('all');
  const [selectedThreads, setSelectedThreads] = useState<string[]>([]);
  const [assignToProject, setAssignToProject] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
    loadUnassignedThreads();
  }, [filter]);

  async function loadProjects() {
    try {
      const url = filter === 'all' 
        ? '/api/projects' 
        : `/api/projects?status=${filter}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadUnassignedThreads() {
    try {
      const res = await fetch('/api/projects/threads?includeUnassigned=true');
      if (res.ok) {
        const data = await res.json();
        setUnassignedThreads(data.threads);
      }
    } catch (error) {
      console.error('Failed to load unassigned threads:', error);
    }
  }

  async function createProject() {
    if (!newProject.name.trim()) return;

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProject.name,
          description: newProject.description || null,
          threadIds: selectedThreads.length > 0 ? selectedThreads : undefined,
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setNewProject({ name: '', description: '' });
        setSelectedThreads([]);
        loadProjects();
        loadUnassignedThreads();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create project');
      }
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  }

  async function updateProjectStatus(projectId: string, status: string) {
    try {
      const res = await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: projectId, status }),
      });

      if (res.ok) {
        loadProjects();
      }
    } catch (error) {
      console.error('Failed to update project:', error);
    }
  }

  async function deleteProject(projectId: string) {
    if (!confirm('Delete this project? Threads will be unassigned but not deleted.')) return;

    try {
      const res = await fetch(`/api/projects?id=${projectId}&unassignThreads=true`, {
        method: 'DELETE',
      });

      if (res.ok) {
        loadProjects();
        loadUnassignedThreads();
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  }

  async function assignThreadsToProject(projectId: string) {
    if (selectedThreads.length === 0) return;

    try {
      const res = await fetch('/api/projects/threads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          threadIds: selectedThreads,
          action: 'assign',
        }),
      });

      if (res.ok) {
        setSelectedThreads([]);
        setAssignToProject(null);
        loadProjects();
        loadUnassignedThreads();
      }
    } catch (error) {
      console.error('Failed to assign threads:', error);
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
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Nav />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-40 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Nav />
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Projects</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Group related threads together
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
          >
            <span>+</span> New Project
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {(['all', 'active', 'paused', 'complete'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === status
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400 mb-4">No projects yet</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Create your first project
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition cursor-pointer"
                onClick={() => router.push(`/project/${project.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                    {project.name}
                  </h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                    {project.status}
                  </span>
                </div>
                
                {project.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                    {project.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <span>{project.thread_count} threads</span>
                  <span>{project.moment_count} moments</span>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    Updated {formatDate(project.updated_at)}
                  </span>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={project.status}
                      onChange={(e) => updateProjectStatus(project.id, e.target.value)}
                      className="text-xs bg-transparent border-none text-gray-500 dark:text-gray-400 cursor-pointer"
                    >
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                      <option value="complete">Complete</option>
                    </select>
                    <button
                      onClick={() => deleteProject(project.id)}
                      className="text-red-500 hover:text-red-700 text-xs ml-2"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Unassigned Threads Section */}
        {unassignedThreads.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Unassigned Threads ({unassignedThreads.length})
            </h2>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
              {unassignedThreads.slice(0, 10).map((thread) => (
                <div
                  key={thread.id}
                  className="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-750"
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
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-white truncate">
                      {thread.title}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {thread.moment_count} moments · Updated {formatDate(thread.updated_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {selectedThreads.length > 0 && (
              <div className="mt-4 flex items-center gap-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedThreads.length} selected
                </span>
                <select
                  value={assignToProject || ''}
                  onChange={(e) => setAssignToProject(e.target.value || null)}
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800"
                >
                  <option value="">Select project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => assignToProject && assignThreadsToProject(assignToProject)}
                  disabled={!assignToProject}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition"
                >
                  Assign to Project
                </button>
              </div>
            )}
          </div>
        )}

        {/* Create Project Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Create New Project
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    placeholder="e.g., E-commerce Redesign"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    placeholder="What is this project about?"
                    rows={3}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                {unassignedThreads.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Add existing threads (optional)
                    </label>
                    <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
                      {unassignedThreads.map((thread) => (
                        <label
                          key={thread.id}
                          className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer"
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
                          <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                            {thread.title}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewProject({ name: '', description: '' });
                    setSelectedThreads([]);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={createProject}
                  disabled={!newProject.name.trim()}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Create Project
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
