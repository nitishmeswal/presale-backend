// NOTE: Run 'npm install node-cron @types/node-cron' to enable cron jobs
// import cron from 'node-cron';
import { supabaseAdmin } from '../config/database';
import logger from '../utils/logger';
import { planSyncCron } from './planSyncCron';

export const cronService = {
  // Start all cron jobs
  startJobs() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const cron = require('node-cron');
      this.dailyUptimeReset(cron);
      
      // Plan sync disabled - syncs on login instead (see authService.ts)
      // planSyncCron.start();
      
      logger.info('🕐 Cron jobs started (uptime reset only)');
    } catch (error) {
      logger.warn('⚠️ node-cron not installed. Run: npm install node-cron @types/node-cron');
      logger.warn('⚠️ Cron jobs disabled until package is installed');
    }
  },

  // Reset uptime daily at midnight UTC
  dailyUptimeReset(cron: any) {
    // Run at 00:00 UTC every day
    cron.schedule('0 0 * * *', async () => {
      try {
        logger.info('🔄 Starting daily uptime reset...');

        // Get all users with their subscription plans
        const { data: profiles, error } = await supabaseAdmin
          .from('user_profiles')
          .select('id, subscription_plan');

        if (error) {
          logger.error(`❌ Error fetching profiles for uptime reset: ${error.message || JSON.stringify(error)}`);
          return;
        }

        // OPTIMIZED: Batch reset uptime in parallel
        const batchSize = 20;
        let resetCount = 0;

        for (let i = 0; i < (profiles || []).length; i += batchSize) {
          const batch = profiles.slice(i, i + batchSize);
          
          const results = await Promise.allSettled(
            batch.map(profile => {
              // Reset to 0 = full time available (countdown system)
              return supabaseAdmin
                .from('devices')
                .update({ uptime: 0 })
                .eq('user_id', profile.id);
            })
          );

          // Count successes
          results.forEach((result, idx) => {
            if (result.status === 'fulfilled' && !result.value.error) {
              resetCount++;
            } else if (result.status === 'rejected' || result.value.error) {
              logger.error(`❌ Error resetting uptime for user ${batch[idx].id}`);
            }
          });
        }

        logger.info(`✅ Daily uptime reset complete: ${resetCount} users updated`);
      } catch (error: any) {
        logger.error(`❌ Exception in daily uptime reset: ${error.message || JSON.stringify(error)}`);
      }
    });

    logger.info('📅 Daily uptime reset cron job scheduled (00:00 UTC)');
  },

  // Get max uptime based on subscription tier
  getMaxUptimeForPlan(tier: string): number {
    const uptimeLimits: { [key: string]: number } = {
      free: 14400,         // 4 hours
      basic: 36000,        // 10 hours
      ultimate: 64800,     // 18 hours
      enterprise: 86400,   // 24 hours
      // Legacy support
      elite: 86400,        // Maps to enterprise
      pro: 64800          // Maps to ultimate
    };

    return uptimeLimits[tier] || 14400; // Default to free tier
  }
};
