import './globals.css';
import type { Metadata } from 'next';
import { Nav } from '@/components/Nav';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Memory Bot - AI Chat Organiser',
  description: 'Save and organize important moments from your AI chats',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-gray-50" suppressHydrationWarning>
        <Providers>
          <Nav />
          <main className="max-w-4xl mx-auto px-4 py-8">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
