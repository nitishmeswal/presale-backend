import { supabaseAdmin } from '../config/database';
import { deviceService } from './deviceService';
import logger from '../utils/logger';

export const subscriptionService = {
  // Get current active subscription for user
  async getCurrentSubscription(userId: string): Promise<any> {
    try {
      logger.info(`📊 Fetching subscription for user ${userId}`);

      // Get user profile with subscription plan
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('subscription_plan')
        .eq('id', userId)
        .single();

      if (profileError || !profile) {
        logger.warn(`No profile found for user ${userId}, returning free tier`);
        return {
          plan_name: 'free',
          status: 'active',
          max_uptime: 14400,
          max_daily_earnings: 100
        };
      }

      const tier = profile.subscription_plan || 'free';
      const status = 'active'; // Plan is always active if it exists

      // Map tier to limits (case-insensitive)
      const planLimits = this.getPlanLimits(tier.toLowerCase());

      return {
        plan_name: tier,
        status: status,
        max_uptime: planLimits.maxUptime,
        max_daily_earnings: planLimits.maxDailyEarnings
      };
    } catch (error: any) {
      logger.error(`Error fetching subscription: ${error.message || JSON.stringify(error)}`);
      throw error;
    }
  },

  // Get plan limits based on tier
  getPlanLimits(tier: string): { maxUptime: number; maxDailyEarnings: number } {
    const limits: { [key: string]: { maxUptime: number; maxDailyEarnings: number } } = {
      free: { maxUptime: 14400, maxDailyEarnings: 100 },         // 4 hours, 100 SP
      basic: { maxUptime: 36000, maxDailyEarnings: 250 },        // 10 hours, 250 SP
      ultimate: { maxUptime: 64800, maxDailyEarnings: 450 },     // 18 hours, 450 SP
      enterprise: { maxUptime: 86400, maxDailyEarnings: 600 },   // 24 hours, 600 SP
      // Legacy support
      elite: { maxUptime: 86400, maxDailyEarnings: 600 },        // Maps to enterprise
      pro: { maxUptime: 64800, maxDailyEarnings: 450 }           // Maps to ultimate
    };

    return limits[tier] || limits.free;
  },

  // Handle plan upgrade - reset device uptime to new plan limits
  async upgradePlan(userId: string, newPlan: string): Promise<any> {
    try {
      logger.info(`🚀 Plan upgrade initiated: User ${userId} → ${newPlan}`);

      // Update user's plan in database
      const { error: updateError } = await supabaseAdmin
        .from('user_profiles')
        .update({ 
          subscription_plan: newPlan.toLowerCase(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        throw new Error(`Failed to update user plan: ${updateError.message}`);
      }

      // Reset all user's devices to new plan's full uptime allowance
      await deviceService.updateDeviceUptimeForPlanUpgrade(userId, newPlan);

      // Get updated subscription details
      const updatedSubscription = await this.getCurrentSubscription(userId);

      logger.info(`✅ Plan upgrade complete: User ${userId} upgraded to ${newPlan}`);

      return {
        message: `Successfully upgraded to ${newPlan} plan`,
        subscription: updatedSubscription,
        uptime_reset: true
      };
    } catch (error: any) {
      logger.error(`Error upgrading plan: ${error.message || JSON.stringify(error)}`);
      throw error;
    }
  }
};
