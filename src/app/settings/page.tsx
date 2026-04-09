'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DEMO_MODE } from '@/lib/demo-data';

// Demo token for testing the Chrome extension locally
const DEMO_TOKEN = 'demo_token_for_local_testing_only';

export default function SettingsPage() {
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getSession = async () => {
      // Always check for real session first
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Real user logged in - use real token
        setToken(session.access_token);
        setUser(session.user);
        setLoading(false);
        return;
      }
      
      // No real session - fall back to demo mode if enabled
      if (DEMO_MODE) {
        setToken(DEMO_TOKEN);
        setUser({ email: 'demo@example.com' });
      }
      
      setLoading(false);
    };
    getSession();
  }, []);

  const handleCopy = async () => {
    if (token) {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {/* Account Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Account</h2>
        
        {user ? (
          <div>
            <p className="text-gray-600 mb-4">
              Signed in as: <strong>{user.email}</strong>
            </p>
            <button
              onClick={handleSignOut}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div>
            <p className="text-gray-600 mb-4">
              {DEMO_MODE ? 'Running in demo mode.' : 'Not signed in.'}
            </p>
            <a
              href="/login"
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Sign In
            </a>
          </div>
        )}
      </div>

      {/* Chrome Extension Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-2">Chrome Extension</h2>
        <p className="text-gray-600 text-sm mb-4">
          Connect the Chrome extension to save moments from any AI chat.
        </p>

        {token ? (
          <div>
            <label className="block text-sm font-medium mb-2">
              Your Auth Token
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={token}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={handleCopy}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 whitespace-nowrap"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Paste this token in the Chrome extension to connect your account.
            </p>
            <p className="text-xs text-yellow-600 mt-1">
              ⚠️ Keep this token private. It grants access to your account.
            </p>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">
            Sign in to get your auth token for the Chrome extension.
          </p>
        )}
      </div>

      {/* Extension Install Instructions */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-2">Install Extension</h2>
        <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2">
          <li>Open Chrome and go to <code className="bg-gray-100 px-1 rounded">chrome://extensions</code></li>
          <li>Enable "Developer mode" (toggle in top right)</li>
          <li>Click "Load unpacked"</li>
          <li>Select the <code className="bg-gray-100 px-1 rounded">chrome-extension</code> folder from this project</li>
          <li>Click the extension icon and paste your auth token</li>
          <li>Select text on any AI chat and right-click → "Save to AI Organiser"</li>
        </ol>
      </div>
    </div>
  );
}
