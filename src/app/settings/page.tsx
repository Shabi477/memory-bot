'use client';

import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  // The user's ID is their token for the Chrome extension
  const token = session?.user?.id;

  const handleCopy = async () => {
    if (token) {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  if (status === 'loading') {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (status === 'unauthenticated') {
    router.push('/login');
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {/* Account Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Account</h2>
        
        <div>
          <p className="text-gray-600 mb-4">
            Signed in as: <strong>{session?.user?.email}</strong>
          </p>
          <button
            onClick={handleSignOut}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Chrome Extension Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-2">🤖 Chrome Extension</h2>
        <p className="text-gray-600 text-sm mb-4">
          Connect the Memory Bot extension to save moments from any AI chat.
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
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 whitespace-nowrap"
              >
                {copied ? '✓ Copied!' : 'Copy'}
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
            Loading your token...
          </p>
        )}
      </div>

      {/* Extension Install Instructions */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-2">Install Extension</h2>
        <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2">
          <li>Open Chrome and go to <code className="bg-gray-100 px-1 rounded">chrome://extensions</code></li>
          <li>Enable &quot;Developer mode&quot; (toggle in top right)</li>
          <li>Click &quot;Load unpacked&quot;</li>
          <li>Select the <code className="bg-gray-100 px-1 rounded">chrome-extension</code> folder from this project</li>
          <li>Click the extension icon and paste your auth token</li>
          <li>Select text on any AI chat and right-click → &quot;Save to Memory Bot&quot;</li>
        </ol>
      </div>
    </div>
  );
}
