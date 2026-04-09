'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function ExtensionPage() {
  const { data: session } = useSession();
  const [copied, setCopied] = useState(false);
  const [selectedBrowser, setSelectedBrowser] = useState<'chrome' | 'edge' | 'brave' | 'firefox' | 'opera'>('chrome');

  const userToken = session?.user?.id || '';

  async function copyToken() {
    if (!userToken) return;
    await navigator.clipboard.writeText(userToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const browserInstructions = {
    chrome: {
      name: 'Google Chrome',
      icon: '🌐',
      steps: [
        'Download the extension ZIP file below',
        'Extract/unzip the downloaded file to a folder',
        'Open Chrome and go to chrome://extensions/',
        'Enable "Developer mode" (toggle in top-right corner)',
        'Click "Load unpacked"',
        'Select the extracted folder',
        'Click the puzzle icon in toolbar and pin ThreadMind',
      ],
    },
    edge: {
      name: 'Microsoft Edge',
      icon: '🔷',
      steps: [
        'Download the extension ZIP file below',
        'Extract/unzip the downloaded file to a folder',
        'Open Edge and go to edge://extensions/',
        'Enable "Developer mode" (toggle in bottom-left)',
        'Click "Load unpacked"',
        'Select the extracted folder',
        'The extension will appear in your toolbar',
      ],
    },
    brave: {
      name: 'Brave',
      icon: '🦁',
      steps: [
        'Download the extension ZIP file below',
        'Extract/unzip the downloaded file to a folder',
        'Open Brave and go to brave://extensions/',
        'Enable "Developer mode" (toggle in top-right)',
        'Click "Load unpacked"',
        'Select the extracted folder',
        'Click the puzzle icon to pin ThreadMind',
      ],
    },
    opera: {
      name: 'Opera',
      icon: '🔴',
      steps: [
        'Download the extension ZIP file below',
        'Extract/unzip the downloaded file to a folder',
        'Open Opera and go to opera://extensions/',
        'Enable "Developer mode"',
        'Click "Load unpacked"',
        'Select the extracted folder',
        'The extension will appear in your sidebar',
      ],
    },
    firefox: {
      name: 'Firefox',
      icon: '🦊',
      steps: [
        'Firefox support coming soon!',
        'For now, use Chrome, Edge, Brave, or Opera',
        'Firefox requires a different extension format (Manifest V2)',
        'We\'re working on it!',
      ],
    },
  };

  const currentBrowser = browserInstructions[selectedBrowser];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">🧩</div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Browser Extension
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Save moments from ChatGPT and Claude with one click
        </p>
      </div>

      {/* Download Card */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 mb-8 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-semibold mb-1">ThreadMind Extension</h2>
            <p className="text-indigo-100">Works with Chrome, Edge, Brave, and Opera</p>
          </div>
          <a
            href="/api/extension/download"
            className="px-6 py-3 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Extension
          </a>
        </div>
      </div>

      {/* Your Token */}
      {session ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            Your Connection Token
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            You'll need this to connect the extension to your account
          </p>
          <div className="flex gap-2">
            <code className="flex-1 bg-gray-100 dark:bg-gray-700 px-4 py-3 rounded-lg text-sm font-mono text-gray-800 dark:text-gray-200 overflow-x-auto">
              {userToken}
            </code>
            <button
              onClick={copyToken}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                copied
                  ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                  : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800'
              }`}
            >
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6 mb-8">
          <p className="text-yellow-800 dark:text-yellow-200">
            <Link href="/login" className="font-semibold underline">Sign in</Link> to get your connection token
          </p>
        </div>
      )}

      {/* Browser Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-8">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
          Installation Instructions
        </h3>
        
        {/* Browser Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(Object.keys(browserInstructions) as Array<keyof typeof browserInstructions>).map((browser) => (
            <button
              key={browser}
              onClick={() => setSelectedBrowser(browser)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                selectedBrowser === browser
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <span>{browserInstructions[browser].icon}</span>
              {browserInstructions[browser].name}
            </button>
          ))}
        </div>

        {/* Steps */}
        <ol className="space-y-3">
          {currentBrowser.steps.map((step, index) => (
            <li key={index} className="flex gap-3">
              <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                selectedBrowser === 'firefox' 
                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                  : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
              }`}>
                {index + 1}
              </span>
              <span className="text-gray-700 dark:text-gray-300">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Features */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-8">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
          What You Can Do
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex gap-3">
            <span className="text-2xl">🖱️</span>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">One-Click Save</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Save button on every AI message</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-2xl">✨</span>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Highlight to Save</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Select text to save just that part</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-2xl">⌨️</span>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Keyboard Shortcut</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Ctrl+Shift+S (Cmd on Mac)</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-2xl">📂</span>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Organize by Thread</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Save to any thread you choose</p>
            </div>
          </div>
        </div>
      </div>

      {/* Supported Sites */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
          Supported AI Platforms
        </h3>
        <div className="flex flex-wrap gap-3">
          <span className="px-4 py-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-sm font-medium">
            ✓ ChatGPT
          </span>
          <span className="px-4 py-2 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded-full text-sm font-medium">
            ✓ Claude
          </span>
          <span className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-sm font-medium">
            Gemini (coming soon)
          </span>
          <span className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-sm font-medium">
            Perplexity (coming soon)
          </span>
        </div>
      </div>
    </div>
  );
}
