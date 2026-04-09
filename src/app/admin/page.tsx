'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name: string | null;
  subscription_tier: 'free' | 'pro' | 'team';
  subscription_expires_at: string | null;
  created_at: string;
  thread_count: number;
  moment_count: number;
  project_count: number;
}

interface Stats {
  totalUsers: number;
  proUsers: number;
  totalThreads: number;
  totalMoments: number;
  totalProjects: number;
}

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editTier, setEditTier] = useState<'free' | 'pro' | 'team'>('free');
  const [editExpiry, setEditExpiry] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  async function checkAdminAndLoad() {
    try {
      const res = await fetch('/api/admin/users');
      if (res.status === 403) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        router.push('/login');
        return;
      }
      
      const data = await res.json();
      setUsers(data.users);
      setStats(data.stats);
      setIsAdmin(true);
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateUser() {
    if (!selectedUser) return;
    setSaving(true);
    
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          subscription_tier: editTier,
          subscription_expires_at: editExpiry || null,
        }),
      });
      
      if (res.ok) {
        checkAdminAndLoad();
        setSelectedUser(null);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Failed to update user:', error);
      alert('Failed to update user');
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser(userId: string) {
    if (!confirm('Are you sure you want to delete this user? This will delete ALL their data (threads, moments, projects, artifacts). This cannot be undone.')) {
      return;
    }
    
    try {
      const res = await fetch(`/api/admin/users?userId=${userId}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        checkAdminAndLoad();
        setSelectedUser(null);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  function openEditModal(user: User) {
    setSelectedUser(user);
    setEditTier(user.subscription_tier);
    setEditExpiry(user.subscription_expires_at ? user.subscription_expires_at.split('T')[0] : '');
  }

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(search.toLowerCase()) ||
    (user.name && user.name.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
          Access Denied
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          You don't have admin privileges.
        </p>
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage users and view system stats
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-5 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Users</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalUsers}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Pro Users</p>
            <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{stats.proUsers}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Threads</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalThreads}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Moments</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalMoments}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Projects</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalProjects}</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users by email or name..."
          className="w-full md:w-96 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">User</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Tier</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Threads</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Moments</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Projects</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Joined</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {user.name || 'No name'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.subscription_tier === 'pro' 
                        ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300'
                        : user.subscription_tier === 'team'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {user.subscription_tier}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{user.thread_count}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{user.moment_count}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{user.project_count}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{formatDate(user.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEditModal(user)}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteUser(user.id)}
                      className="text-red-600 dark:text-red-400 hover:underline text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredUsers.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {search ? 'No users found matching your search' : 'No users yet'}
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Edit User
            </h2>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Email</p>
              <p className="font-medium text-gray-900 dark:text-white">{selectedUser.email}</p>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subscription Tier
              </label>
              <select
                value={editTier}
                onChange={(e) => setEditTier(e.target.value as 'free' | 'pro' | 'team')}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="team">Team</option>
              </select>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subscription Expires
              </label>
              <input
                type="date"
                value={editExpiry}
                onChange={(e) => setEditExpiry(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Leave empty for no expiry
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedUser(null)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={updateUser}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
