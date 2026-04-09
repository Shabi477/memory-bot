'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

export function Nav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  
  const linkClass = (path: string) =>
    `px-3 py-2 rounded-md text-sm font-medium ${
      pathname === path
        ? 'bg-purple-600 text-white'
        : 'text-gray-700 hover:bg-purple-100'
    }`;

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex justify-between h-14">
          <div className="flex items-center space-x-4">
            <Link href="/" className="font-bold text-lg flex items-center gap-2">
              <span>�</span> ThreadMind
            </Link>
            <Link href="/inbox" className={linkClass('/inbox')}>
              📥 Inbox
            </Link>
            <Link href="/threads" className={linkClass('/threads')}>
              Threads
            </Link>
            <Link href="/projects" className={linkClass('/projects')}>
              📁 Projects
            </Link>
            <Link href="/artifacts" className={linkClass('/artifacts')}>
              🧩 Artifacts
            </Link>
            <Link href="/search" className={linkClass('/search')}>
              Search
            </Link>
          </div>
          <div className="flex items-center space-x-2">
            <Link href="/settings" className={linkClass('/settings')}>
              Settings
            </Link>
            {session ? (
              <span className="text-sm text-gray-500 px-2">
                {session.user?.email?.split('@')[0]}
              </span>
            ) : (
              <Link href="/login" className={linkClass('/login')}>
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
