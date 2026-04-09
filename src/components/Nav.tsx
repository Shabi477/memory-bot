'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Nav() {
  const pathname = usePathname();
  
  const linkClass = (path: string) =>
    `px-3 py-2 rounded-md text-sm font-medium ${
      pathname === path
        ? 'bg-gray-900 text-white'
        : 'text-gray-700 hover:bg-gray-200'
    }`;

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex justify-between h-14">
          <div className="flex items-center space-x-4">
            <Link href="/" className="font-bold text-lg">
              AI Organiser
            </Link>
            <Link href="/threads" className={linkClass('/threads')}>
              Threads
            </Link>
            <Link href="/search" className={linkClass('/search')}>
              Search
            </Link>
          </div>
          <div className="flex items-center space-x-2">
            <Link href="/settings" className={linkClass('/settings')}>
              Settings
            </Link>
            <Link href="/login" className={linkClass('/login')}>
              Login
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
