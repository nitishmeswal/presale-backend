import { supabaseAdmin } from '../config/database';
import { computeAppSync } from './computeAppSync';
import logger from '../utils/logger';

/**
 * Cron service to periodically sync subscription plans from Compute App
 * Runs every 5 minutes for active users (logged in within last 24 hours)
 */
export const planSyncCron = {
  /**
   * Sync plans for all recently active users
   */
  async syncActiveUserPlans(): Promise<void> {
    try {
      logger.info('🔄 Starting plan sync cron job...');

      // Get users who logged in within last 2 hours (reduced from 24h)
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      
      const { data: activeUsers, error } = await supabaseAdmin
        .from('user_profiles')
        .select('id, email, plan')
        .gte('last_login_at', twoHoursAgo)
        .order('last_login_at', { ascending: false })
        .limit(50); // Reduced to 50 per sync to prevent overload

      if (error) {
        logger.error('Error fetching active users:', error);
        return;
      }

      if (!activeUsers || activeUsers.length === 0) {
        logger.info('No active users to sync');
        return;
      }

      logger.info(`📊 Found ${activeUsers.length} active users to sync`);

      // Batch sync plans
      const emails = activeUsers.map(u => u.email);
      const planMap = await computeAppSync.batchSyncPlans(emails);

      // Update users whose plans have changed
      let updatedCount = 0;
      for (const user of activeUsers) {
        const newPlan = planMap.get(user.email);
        if (newPlan && newPlan !== user.plan) {
          await supabaseAdmin
            .from('user_profiles')
            .update({ plan: newPlan })
            .eq('id', user.id);
          
          logger.info(`✅ Plan synced: ${user.email} ${user.plan} → ${newPlan}`);
          updatedCount++;
        }
      }

      logger.info(`✅ Plan sync complete: ${updatedCount}/${activeUsers.length} users updated`);
    } catch (error) {
      logger.error('Exception in plan sync cron:', error);
    }
  },

  /**
   * Start the cron job (runs every 5 minutes)
   */
  start(): void {
    // Run immediately on startup
    this.syncActiveUserPlans();

    // Then run every 15 minutes (reduced frequency)
    setInterval(() => {
      this.syncActiveUserPlans();
    }, 15 * 60 * 1000); // 15 minutes

    logger.info('✅ Plan sync cron job started (every 15 minutes)');
  },

  /**
   * Manual sync for a specific user (for testing)
   */
  async syncUserPlan(email: string): Promise<string> {
    try {
      logger.info(`🔄 Manual plan sync for: ${email}`);

      const newPlan = await computeAppSync.getUserPlan(email);

      const { data: user } = await supabaseAdmin
        .from('user_profiles')
        .select('id, plan')
        .eq('email', email)
        .single();

      if (user && user.plan !== newPlan) {
        await supabaseAdmin
          .from('user_profiles')
          .update({ plan: newPlan })
          .eq('id', user.id);
        
        logger.info(`✅ Manual sync: ${email} ${user.plan} → ${newPlan}`);
      }

      return newPlan;
    } catch (error) {
      logger.error('Error in manual plan sync:', error);
      return 'free';
    }
  },
};
