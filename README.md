# AI Chat Organiser

Save important moments from your AI chats, organize them into threads, and generate resume prompts to continue your work.

## Features (MVP)

- ✅ Manual save (via Chrome extension - separate repo)
- ✅ Create and manage Threads
- ✅ Save Moments with auto-generated summary and key points
- ✅ Thread timeline view
- ✅ Global search across all moments
- ✅ Resume prompt generator

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account (free tier works)

### 1. Clone and Install

```bash
cd AI_ORGANISER
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the schema from `supabase/schema.sql`
3. Go to Project Settings > API and copy:
   - Project URL
   - anon/public key

### 3. Configure Environment

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
AI_ORGANISER/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── moments/route.ts    # POST /api/moments
│   │   │   └── threads/route.ts    # GET/POST /api/threads
│   │   ├── login/page.tsx
│   │   ├── threads/page.tsx
│   │   ├── thread/[id]/page.tsx
│   │   ├── search/page.tsx
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── Nav.tsx
│   │   ├── ThreadList.tsx
│   │   ├── ThreadCreate.tsx
│   │   ├── MomentCard.tsx
│   │   └── ResumePromptPanel.tsx
│   └── lib/
│       ├── supabase.ts             # Client-side Supabase
│       ├── supabase-server.ts      # Server-side Supabase
│       └── database.types.ts       # TypeScript types
├── supabase/
│   └── schema.sql                  # Database schema
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── README.md
```

## API Endpoints

### POST /api/moments
Save a new moment (used by Chrome extension).

**Headers:**
- `Authorization: Bearer <supabase-access-token>`

**Body:**
```json
{
  "threadId": "uuid",
  "source": "chatgpt",
  "sourceUrl": "https://chat.openai.com/c/...",
  "title": "Optional title",
  "rawText": "The captured chat content..."
}
```

### GET /api/threads
List user's threads.

### POST /api/threads
Create a new thread.

**Body:**
```json
{
  "title": "Thread title",
  "description": "Optional description"
}
```

## Next Steps (Chrome Extension)

The Chrome extension will be built separately and will:
1. Add a "Save this" button on ChatGPT
2. Let users select text or entire conversations
3. Send to POST /api/moments with auth token

---

Built for solo founders who want to keep their AI chat context organized.
