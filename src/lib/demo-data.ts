// Demo mode configuration for local development
// This allows testing without real Supabase auth

export const DEMO_MODE = process.env.NODE_ENV === 'development';

export const DEMO_USER = {
  id: 'demo-user-00000000-0000-0000-0000-000000000001',
  email: 'demo@example.com',
};

// Demo data for testing
export const DEMO_THREADS = [
  {
    id: 'demo-thread-001',
    user_id: DEMO_USER.id,
    title: 'React Project Setup',
    description: 'Setting up a new React project with TypeScript and Tailwind',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-thread-002',
    user_id: DEMO_USER.id,
    title: 'Database Design Discussion',
    description: 'Planning the schema for the user management system',
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const DEMO_MOMENTS = [
  {
    id: 'demo-moment-001',
    thread_id: 'demo-thread-001',
    user_id: DEMO_USER.id,
    source: 'chatgpt',
    source_url: 'https://chat.openai.com/c/example',
    title: 'Initial project structure',
    raw_text: `I need help setting up a React project with TypeScript. 

Here's what I want:
- TypeScript support
- Tailwind CSS for styling
- ESLint and Prettier configured
- A clean folder structure

Can you guide me through the setup?`,
    summary: 'Discussed initial React project setup requirements including TypeScript, Tailwind CSS, and code quality tools.',
    key_points: [
      'Use Create React App with TypeScript template or Vite',
      'Install Tailwind CSS and configure postcss',
      'Set up ESLint with TypeScript parser',
      'Configure Prettier for consistent formatting',
    ],
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-moment-002',
    thread_id: 'demo-thread-001',
    user_id: DEMO_USER.id,
    source: 'chatgpt',
    source_url: 'https://chat.openai.com/c/example',
    title: 'Component architecture decision',
    raw_text: `Should I use a flat component structure or organize by feature?

I'm thinking about having:
/components
  /Button
  /Card
  /Modal

vs

/features
  /auth
    /components
  /dashboard
    /components`,
    summary: 'Decided on feature-based folder structure for better scalability and code organization.',
    key_points: [
      'Feature-based structure scales better for larger apps',
      'Keep shared components in a common folder',
      'Use barrel exports for cleaner imports',
    ],
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-moment-003',
    thread_id: 'demo-thread-002',
    user_id: DEMO_USER.id,
    source: 'chatgpt',
    source_url: 'https://chat.openai.com/c/example2',
    title: 'User table schema',
    raw_text: `What columns should my users table have?

I need:
- Basic profile info
- Authentication data
- Subscription status
- Timestamps`,
    summary: 'Designed the users table schema with profile, auth, and subscription fields.',
    key_points: [
      'Use UUID for primary key',
      'Store email, name, avatar_url for profile',
      'Add subscription_tier and subscription_expires_at',
      'Include created_at and updated_at timestamps',
    ],
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
];
