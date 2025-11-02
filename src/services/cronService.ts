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
      
      // Start plan sync cron (every 5 minutes)
      planSyncCron.start();
      
      logger.info('🕐 Cron jobs started (uptime reset + plan sync)');
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
        const { data: profiles, error: profileError } = await supabaseAdmin
          .from('user_profiles')
          .select('id, plan');

        if (profileError) {
          logger.error('❌ Error fetching profiles for uptime reset:', profileError);
          return;
        }

        let resetCount = 0;

        // Reset uptime for each user based on their plan
        for (const profile of profiles || []) {
          const maxUptime = this.getMaxUptimeForPlan((profile.plan || 'free').toLowerCase());

          const { error: updateError } = await supabaseAdmin
            .from('devices')
            .update({ uptime: maxUptime })
            .eq('user_id', profile.id);

          if (updateError) {
            logger.error(`❌ Error resetting uptime for user ${profile.id}:`, updateError);
          } else {
            resetCount++;
          }
        }

        logger.info(`✅ Daily uptime reset complete: ${resetCount} users updated`);
      } catch (error) {
        logger.error('❌ Exception in daily uptime reset:', error);
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
