'use client';

import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface UsageStats {
  tier: 'free' | 'pro';
  projects: { used: number; limit: number };
  threads: { used: number; limit: number };
  moments: { used: number; limit: number };
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [usage, setUsage] = useState<UsageStats | null>(null);

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/usage')
        .then((res) => res.json())
        .then(setUsage)
        .catch(() => {});
    }
  }, [status]);

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

      {/* Usage & Plan Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-lg font-semibold">Your Plan</h2>
            <p className="text-sm text-gray-600">
              {usage?.tier === 'pro' ? (
                <span className="inline-flex items-center gap-1">
                  <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">PRO</span>
                  Unlimited access
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">FREE</span>
                  Limited features
                </span>
              )}
            </p>
          </div>
          {usage?.tier === 'free' && (
            <button className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-md hover:from-purple-700 hover:to-indigo-700 text-sm font-medium">
              Upgrade to Pro — $9/mo
            </button>
          )}
        </div>

        {usage && (
          <div className="space-y-3">
            <UsageBar
              label="Threads"
              used={usage.threads.used}
              limit={usage.threads.limit}
            />
            <UsageBar
              label="Moments"
              used={usage.moments.used}
              limit={usage.moments.limit}
            />
            <UsageBar
              label="Projects"
              used={usage.projects.used}
              limit={usage.projects.limit}
            />
          </div>
        )}

        {usage?.tier === 'free' && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-600 mb-2">
              <strong>Pro includes:</strong>
            </p>
            <ul className="text-sm text-gray-500 space-y-1">
              <li>✓ Unlimited threads, moments & projects</li>
              <li>✓ AI-generated summaries</li>
              <li>✓ Context pack generation</li>
              <li>✓ Priority support</li>
            </ul>
          </div>
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
          <li>Go to ChatGPT or Claude — you&apos;ll see &quot;🧠 Save&quot; buttons on messages!</li>
        </ol>
      </div>
    </div>
  );
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const isUnlimited = limit < 0;
  const percentage = isUnlimited ? 0 : Math.min((used / limit) * 100, 100);
  const isNearLimit = !isUnlimited && percentage >= 80;
  const isAtLimit = !isUnlimited && percentage >= 100;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className={isAtLimit ? 'text-red-600 font-medium' : 'text-gray-500'}>
          {used} / {limit < 0 ? '∞' : limit}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isAtLimit
              ? 'bg-red-500'
              : isNearLimit
              ? 'bg-yellow-500'
              : 'bg-purple-500'
          }`}
          style={{ width: limit < 0 ? '100%' : `${percentage}%` }}
        />
      </div>
    </div>
  );
}
