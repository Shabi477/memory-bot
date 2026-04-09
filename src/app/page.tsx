import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="text-center py-16">
      <h1 className="text-4xl font-bold mb-4">AI Chat Organiser</h1>
      <p className="text-gray-600 mb-8 max-w-md mx-auto">
        Save important moments from your AI chats, organize them into threads,
        and generate resume prompts to continue your work.
      </p>
      <div className="space-x-4">
        <Link
          href="/login"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
        >
          Get Started
        </Link>
        <Link
          href="/threads"
          className="inline-block border border-gray-300 px-6 py-3 rounded-lg hover:bg-gray-100"
        >
          View Threads
        </Link>
      </div>
    </div>
  );
}
