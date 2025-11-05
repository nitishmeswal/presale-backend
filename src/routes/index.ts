import { Router } from 'express';
import authRoutes from './auth/index';
import deviceRoutes from './devices/index';
import sessionRoutes from './sessions/index';
import taskRoutes from './tasks/index';
import earningRoutes from './earnings/index';
import referralRoutes from './referrals/index';
import analyticsRoutes from './analytics/index';
import profileRoutes from './profile/index';
import nodeUptimeRoutes from './node-uptime/index';
import globalStatsRoutes from './global-stats/index';
import updateDeviceUptimeRoutes from './update-device-uptime/index';
import dailyCheckinRoutes from './daily-checkins/index';
import supportRoutes from './support/index';
import subscriptionRoutes from './subscriptions/index';
import leaderboardRoutes from './leaderboard/index';
import settingsRoutes from './settings/index';
// ⚠️ DEPRECATED - Kept for compatibility
import claimRewardsRoutes from './claim-rewards/index';
import updateUnclaimedRewardsRoutes from './update-unclaimed-rewards/index';

const router = Router();

// Health check
router.get('/', (req, res) => {
  res.json({
    message: 'NeuroSwarm API v1',
    status: 'active',
    timestamp: new Date().toISOString(),
  });
});

// Mount routes - matching old MVP API structure
router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/settings', settingsRoutes); // User settings (delete account, change password)
router.use('/devices', deviceRoutes);
router.use('/device-session', sessionRoutes); // Changed to match old API
router.use('/complete-task', taskRoutes); // Direct endpoint for POST
router.use('/tasks', taskRoutes); // For GET /tasks/stats
router.use('/earnings', earningRoutes);
router.use('/leaderboard', leaderboardRoutes); // Top 10 leaderboard + user rank
router.use('/daily-checkins', dailyCheckinRoutes); // Daily check-in streak
router.use('/support', supportRoutes); // Support tickets
router.use('/support-tickets', supportRoutes); // Support tickets (alternative path)
router.use('/subscriptions', subscriptionRoutes); // User subscriptions
// ⚠️ DEPRECATED - Use POST /earnings instead (kept for compatibility)
router.use('/claim-rewards', claimRewardsRoutes); // Migrated from edge function
router.use('/node-uptime', nodeUptimeRoutes);
router.use('/referrals', referralRoutes);
router.use('/analytics', analyticsRoutes);

// NEW: Migrated edge functions to Express routes
router.use('/global-stats', globalStatsRoutes); // Get global stats
router.use('/global-statistics', globalStatsRoutes); // Get global statistics (alternative path)
router.use('/update-device-uptime', updateDeviceUptimeRoutes); // Update device uptime
// ⚠️ DEPRECATED - Auto-handled when tasks complete (kept for compatibility)
router.use('/update-unclaimed-rewards', updateUnclaimedRewardsRoutes); // Update unclaimed rewards

export default router;
