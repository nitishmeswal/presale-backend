import { createClient } from '@supabase/supabase-js';
import logger from '../utils/logger';

// Compute App Supabase client (separate from NeuroSwarm Supabase)
const COMPUTE_URL = process.env.COMPUTE_SUPABASE_URL || '';
const COMPUTE_KEY = process.env.COMPUTE_SUPABASE_ANON_KEY || '';

if (!COMPUTE_URL || !COMPUTE_KEY) {
  logger.warn('⚠️ COMPUTE_SUPABASE_URL or COMPUTE_SUPABASE_ANON_KEY not set. Plan sync will fail silently.');
}

const computeSupabase = createClient(COMPUTE_URL, COMPUTE_KEY);

export const computeAppSync = {
  /**
   * Get user's subscription plan from Compute App's unified_users table
   * @param email - User's email (swarm_user_email in unified_users)
   * @returns Plan name ('free' | 'basic' | 'ultimate' | 'enterprise')
   */
  async getUserPlan(email: string): Promise<string> {
    try {
      logger.info(`🔄 Syncing plan from Compute App for: ${email}`);

      const { data, error } = await computeSupabase
        .from('unified_users')
        .select('plan, app_user_email')
        .eq('swarm_user_email', email)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No unified account found - user hasn't linked yet
          logger.info(`ℹ️ No unified account for ${email}, using free plan`);
          return 'free';
        }
        logger.error(`Error fetching plan from Compute App: ${error.message || JSON.stringify(error)}`);
        return 'free';
      }

      if (!data) {
        logger.info(`ℹ️ No unified account for ${email}, using free plan`);
        return 'free';
      }

      const plan = data.plan || 'free';
      logger.info(`✅ Plan synced: ${email} → ${plan} (linked to ${data.app_user_email})`);
      return plan;
    } catch (error: any) {
      logger.error(`Exception in getUserPlan: ${error.message || JSON.stringify(error)}`);
      return 'free'; // Fail safe to free plan
    }
  },

  /**
   * Check if user has linked their Compute App account
   * @param email - User's email
   * @returns Boolean indicating if account is linked
   */
  async isAccountLinked(email: string): Promise<boolean> {
    try {
      const { data, error } = await computeSupabase
        .from('unified_users')
        .select('id')
        .eq('swarm_user_email', email)
        .single();

      return !error && !!data;
    } catch (error: any) {
      logger.error(`Error checking account link: ${error.message || JSON.stringify(error)}`);
      return false;
    }
  },

  /**
   * Get plan limits based on plan name
   * @param plan - Plan name
   * @returns Object with device and runtime limits
   */
  getPlanLimits(plan: string): {
    maxDevices: number;
    runtimePerDevice: number; // in seconds
    multiDevice: boolean;
  } {
    const limits: Record<string, any> = {
      free: {
        maxDevices: 1,
        runtimePerDevice: 4 * 60 * 60, // 4 hours
        multiDevice: false,
      },
      basic: {
        maxDevices: 1,
        runtimePerDevice: 10 * 60 * 60, // 10 hours (4 base + 6 extra)
        multiDevice: false,
      },
      ultimate: {
        maxDevices: 2,
        runtimePerDevice: 12 * 60 * 60, // 12 hours (4 base + 8 extra)
        multiDevice: true,
      },
      enterprise: {
        maxDevices: 6,
        runtimePerDevice: 24 * 60 * 60, // 24 hours
        multiDevice: true,
      },
    };

    return limits[plan.toLowerCase()] || limits.free;
  },

  /**
   * Batch sync plans for multiple users
   * @param emails - Array of user emails
   * @returns Map of email to plan
   */
  async batchSyncPlans(emails: string[]): Promise<Map<string, string>> {
    try {
      if (!COMPUTE_URL || !COMPUTE_KEY) {
        logger.info('⏭️ Skipping batch sync - Compute App credentials not configured');
        // Return all as free plan
        const planMap = new Map<string, string>();
        emails.forEach(email => planMap.set(email, 'free'));
        return planMap;
      }

      logger.info(`🔄 Batch syncing ${emails.length} user plans...`);

      const { data, error } = await computeSupabase
        .from('unified_users')
        .select('swarm_user_email, plan')
        .in('swarm_user_email', emails);

      if (error) {
        logger.error(`Error in batch sync: ${error.message || JSON.stringify(error)}`);
        logger.error('Hint: Check COMPUTE_SUPABASE_URL and COMPUTE_SUPABASE_ANON_KEY in .env');
        return new Map();
      }

      const planMap = new Map<string, string>();
      data?.forEach((row) => {
        planMap.set(row.swarm_user_email, row.plan || 'free');
      });

      // Add free plan for users not in unified_users
      emails.forEach((email) => {
        if (!planMap.has(email)) {
          planMap.set(email, 'free');
        }
      });

      logger.info(`✅ Batch sync complete: ${planMap.size} plans synced`);
      return planMap;
    } catch (error: any) {
      logger.error(`Exception in batchSyncPlans: ${error.message || JSON.stringify(error)}`);
      return new Map();
    }
  },
};
