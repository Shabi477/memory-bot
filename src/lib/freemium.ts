import { sql } from '@/lib/db';

// Freemium tier limits (use -1 for unlimited, which serializes properly to JSON)
export const LIMITS = {
  free: {
    projects: 1,
    threads: 3,
    moments: 20,
    contextPacks: 5, // per month
  },
  pro: {
    projects: -1, // -1 means unlimited
    threads: -1,
    moments: -1,
    contextPacks: -1,
  },
};

// Helper to check if limit is unlimited
export function isUnlimited(limit: number): boolean {
  return limit < 0;
}

export type Tier = 'free' | 'pro';

export interface UsageStats {
  tier: Tier;
  projects: { used: number; limit: number };
  threads: { used: number; limit: number };
  moments: { used: number; limit: number };
  canCreateProject: boolean;
  canCreateThread: boolean;
  canCreateMoment: boolean;
}

// Get user's subscription tier
export async function getUserTier(userId: string): Promise<Tier> {
  try {
    const users = await sql`
      SELECT subscription_tier, subscription_expires_at 
      FROM users 
      WHERE id = ${userId}
    `;
    
    if (users.length === 0) return 'free';
    
    const user = users[0];
    const tier = user.subscription_tier || 'free';
    
    // Check if subscription has expired
    if (tier === 'pro' && user.subscription_expires_at) {
      if (new Date(user.subscription_expires_at) < new Date()) {
        return 'free';
      }
    }
    
    return tier as Tier;
  } catch {
    return 'free';
  }
}

// Get user's current usage stats
export async function getUsageStats(userId: string): Promise<UsageStats> {
  const tier = await getUserTier(userId);
  const limits = LIMITS[tier];
  
  // Count current usage
  const [projectsResult, threadsResult, momentsResult] = await Promise.all([
    sql`SELECT COUNT(*)::int as count FROM projects WHERE user_id = ${userId}`,
    sql`SELECT COUNT(*)::int as count FROM threads WHERE user_id = ${userId}`,
    sql`SELECT COUNT(*)::int as count FROM moments WHERE user_id = ${userId}`,
  ]);
  
  const projectsUsed = projectsResult[0]?.count || 0;
  const threadsUsed = threadsResult[0]?.count || 0;
  const momentsUsed = momentsResult[0]?.count || 0;
  
  return {
    tier,
    projects: { used: projectsUsed, limit: limits.projects },
    threads: { used: threadsUsed, limit: limits.threads },
    moments: { used: momentsUsed, limit: limits.moments },
    canCreateProject: isUnlimited(limits.projects) || projectsUsed < limits.projects,
    canCreateThread: isUnlimited(limits.threads) || threadsUsed < limits.threads,
    canCreateMoment: isUnlimited(limits.moments) || momentsUsed < limits.moments,
  };
}

// Check if user can perform an action
export async function checkLimit(
  userId: string,
  resource: 'project' | 'thread' | 'moment'
): Promise<{ allowed: boolean; message?: string }> {
  const stats = await getUsageStats(userId);
  
  switch (resource) {
    case 'project':
      if (!stats.canCreateProject) {
        return {
          allowed: false,
          message: `You've reached your limit of ${stats.projects.limit} project${stats.projects.limit !== 1 ? 's' : ''}. Upgrade to Pro for unlimited projects.`,
        };
      }
      break;
    case 'thread':
      if (!stats.canCreateThread) {
        return {
          allowed: false,
          message: `You've reached your limit of ${stats.threads.limit} threads. Upgrade to Pro for unlimited threads.`,
        };
      }
      break;
    case 'moment':
      if (!stats.canCreateMoment) {
        return {
          allowed: false,
          message: `You've reached your limit of ${stats.moments.limit} moments. Upgrade to Pro to save unlimited moments.`,
        };
      }
      break;
  }
  
  return { allowed: true };
}
