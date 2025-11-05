import { supabaseAdmin } from '../config/database';
import { ERROR_MESSAGES } from '../utils/constants';
import { Earning } from '../types/api';
import logger from '../utils/logger';

export const earningService = {
  async trackEarning(
    userId: string,
    earningData: {
      sessionId?: string;
      taskId?: string;
      amount: number;
      type: 'task' | 'referral' | 'bonus';
      description?: string;
    }
  ): Promise<Earning> {
    const { data: earning, error } = await supabaseAdmin
      .from('earnings')
      .insert({
        user_id: userId,
        session_id: earningData.sessionId,
        task_id: earningData.taskId,
        amount: earningData.amount,
        type: earningData.type,
        status: 'pending',
        description: earningData.description,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return this.mapEarningFromDB(earning);
  },

  // ATOMIC claim from old MVP - prevents double-claiming
  async claimEarningsAtomic(userId: string): Promise<any> {
    try {
      // 1) Read current unclaimed_reward
      const { data: profile, error: fetchError } = await supabaseAdmin
        .from('user_profiles')
        .select('unclaimed_reward')
        .eq('id', userId)
        .single();

      if (fetchError) {
        logger.error('Error fetching current unclaimed rewards:', fetchError);
        return {
          success: false,
          error: 'Failed to fetch current rewards'
        };
      }

      const unclaimedAmount = Number(profile?.unclaimed_reward) || 0;

      if (unclaimedAmount <= 0) {
        return {
          success: false,
          message: 'No rewards to claim'
        };
      }

      // 2) Conditionally reset to 0 only if the amount still matches (prevents double-claim in race)
      const { data: resetRow, error: conditionalUpdateError } = await supabaseAdmin
        .from('user_profiles')
        .update({ unclaimed_reward: 0 })
        .eq('id', userId)
        .eq('unclaimed_reward', unclaimedAmount) // CRITICAL: prevents double-claiming
        .select('unclaimed_reward')
        .maybeSingle();

      if (conditionalUpdateError) {
        logger.error('Error resetting unclaimed rewards (conditional):', conditionalUpdateError);
        return {
          success: false,
          error: 'Failed to reset unclaimed rewards'
        };
      }

      // If no row was updated (someone else already claimed), treat as no rewards
      if (!resetRow) {
        return {
          success: false,
          message: 'No rewards to claim'
        };
      }

      // Mark all unclaimed earnings as claimed (optional - best effort)
      const { error: markClaimedError } = await supabaseAdmin
        .from('earnings')
        .update({ is_claimed: true })
        .eq('user_id', userId)
        .eq('is_claimed', false);

      if (markClaimedError) {
        logger.warn('⚠️ Could not mark earnings as claimed:', markClaimedError);
        // Don't fail - continue
      }

      // Get current total earnings from earnings_history (THIS IS CRITICAL!)
      let currentEarnings = 0;
      const { data: history } = await supabaseAdmin
        .from('earnings_history')  // ✅ READ FROM earnings_history!
        .select('total_amount')
        .eq('user_id', userId)
        .single();

      if (history) {
        currentEarnings = parseFloat(history.total_amount?.toString() || '0');
      }

      const newTotalEarnings = currentEarnings + unclaimedAmount;

      logger.info(`💰 Claim calculation: Previous=${currentEarnings}, Claiming=${unclaimedAmount}, New Total=${newTotalEarnings}`);

      // Removed earnings_leaderboard update - using earnings_history only

      // Try to update earnings history (optional - don't fail if table doesn't exist)
      const { error: historyError } = await supabaseAdmin
        .from('earnings_history')
        .upsert({
          user_id: userId,
          total_amount: newTotalEarnings,
          timestamp: new Date().toISOString(),
          payout_status: 'pending'
        }, { onConflict: 'user_id' });

      if (historyError) {
        logger.warn('⚠️ Could not update earnings history:', historyError);
        // Don't fail - history is optional
      }

      logger.info(`✅ Claimed ${unclaimedAmount} SP, new total: ${newTotalEarnings} SP`);

      return {
        success: true,
        message: 'Rewards claimed successfully',
        data: {
          claimed_amount: unclaimedAmount,
          new_total_earnings: newTotalEarnings
        }
      };
    } catch (error) {
      logger.error('Exception in claimEarningsAtomic:', error);
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  },

  async getEarningHistory(userId: string): Promise<Earning[]> {
    const { data: earnings, error } = await supabaseAdmin
      .from('earnings')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return earnings.map(this.mapEarningFromDB);
  },

  async getTotalEarnings(userId: string): Promise<number> {
    try {
      // Get latest total earnings from earnings_history (from old MVP)
      const { data, error } = await supabaseAdmin
        .from('earnings_history')
        .select('total_amount')
        .eq('user_id', userId)
        .single();

      if (error) {
        // If no record exists yet, return 0
        if (error.code === 'PGRST116') {
          return 0;
        }
        logger.error('Error loading earnings:', error);
        return 0;
      }

      return Number(data?.total_amount) || 0;
    } catch (error) {
      logger.error('Exception in getTotalEarnings:', error);
      return 0;
    }
  },

  // Get earnings summary for frontend
  async getEarningsSummary(userId: string): Promise<{
    total_balance: number;
    total_unclaimed_reward: number;
    total_earnings: number;
    total_tasks: number;
  }> {
    try {
      // Get unclaimed rewards AND task_completed from user_profiles
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('unclaimed_reward, task_completed')
        .eq('id', userId)
        .single();

      if (profileError) {
        logger.error('Error fetching unclaimed reward:', profileError);
      }

      const unclaimedReward = Number(profile?.unclaimed_reward) || 0;
      const totalTasks = Number(profile?.task_completed) || 0;

      // Get total claimed earnings from earnings_history
      const { data: history, error: historyError } = await supabaseAdmin
        .from('earnings_history')
        .select('total_amount')
        .eq('user_id', userId)
        .single();

      if (historyError && historyError.code !== 'PGRST116') {
        logger.error('Error fetching earnings history:', historyError);
      }

      const totalBalance = Number(history?.total_amount) || 0;
      const totalEarnings = totalBalance + unclaimedReward;

      logger.info(`📊 Earnings summary for ${userId}: Balance=${totalBalance}, Unclaimed=${unclaimedReward}, Total=${totalEarnings}, Tasks=${totalTasks}`);

      return {
        total_balance: totalBalance,
        total_unclaimed_reward: unclaimedReward,
        total_earnings: totalEarnings,
        total_tasks: totalTasks
      };
    } catch (error) {
      logger.error('Exception in getEarningsSummary:', error);
      return {
        total_balance: 0,
        total_unclaimed_reward: 0,
        total_earnings: 0,
        total_tasks: 0
      };
    }
  },

  // Get detailed earnings stats for frontend stats page
  async getDetailedStats(userId: string): Promise<{
    totalTasksCompleted: number;
    totalEarnings: number;
    todayTasksCompleted: number;
    todayEarnings: number;
    averageEarningsPerTask: number;
    totalBalance: number;
    unclaimedReward: number;
    tasksByType: {
      text: number;
      image: number;
      three_d: number;
      video: number;
    };
  }> {
    try {
      // Get user profile with task count and unclaimed
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('task_completed, unclaimed_reward')
        .eq('id', userId)
        .single();

      const totalTasks = Number(profile?.task_completed) || 0;
      const unclaimedReward = Number(profile?.unclaimed_reward) || 0;

      // Get total balance from earnings_history
      const { data: history } = await supabaseAdmin
        .from('earnings_history')
        .select('total_amount')
        .eq('user_id', userId)
        .single();

      const totalBalance = Number(history?.total_amount) || 0;
      const totalEarnings = totalBalance + unclaimedReward;

      // Get today's tasks and earnings
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: todayEarnings } = await supabaseAdmin
        .from('earnings')
        .select('amount')
        .eq('user_id', userId)
        .gte('created_at', today.toISOString());

      const todayTotal = todayEarnings?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const todayTasks = todayEarnings?.length || 0;

      // Calculate average
      const avgPerTask = totalTasks > 0 ? totalEarnings / totalTasks : 0;

      // Get task breakdown by type (mock for now - can enhance later)
      const tasksByType = {
        text: Math.floor(totalTasks * 0.4),
        image: Math.floor(totalTasks * 0.3),
        three_d: Math.floor(totalTasks * 0.2),
        video: Math.floor(totalTasks * 0.1)
      };

      return {
        totalTasksCompleted: totalTasks,
        totalEarnings: Number(totalEarnings.toFixed(2)),
        todayTasksCompleted: todayTasks,
        todayEarnings: Number(todayTotal.toFixed(2)),
        averageEarningsPerTask: Number(avgPerTask.toFixed(2)),
        totalBalance: Number(totalBalance.toFixed(2)),
        unclaimedReward: Number(unclaimedReward.toFixed(2)),
        tasksByType
      };
    } catch (error) {
      logger.error('Exception in getDetailedStats:', error);
      return {
        totalTasksCompleted: 0,
        totalEarnings: 0,
        todayTasksCompleted: 0,
        todayEarnings: 0,
        averageEarningsPerTask: 0,
        totalBalance: 0,
        unclaimedReward: 0,
        tasksByType: { text: 0, image: 0, three_d: 0, video: 0 }
      };
    }
  },

  // Get leaderboard (OLD - use leaderboardService instead)
  async getLeaderboard(limit: number = 100): Promise<any[]> {
    try {
      // Use earnings_history instead of earnings_leaderboard
      const { data, error } = await supabaseAdmin
        .from('earnings_history')
        .select(`
          user_id,
          total_amount,
          user_profiles!inner (
            user_name
          )
        `)
        .order('total_amount', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((item: any, index) => ({
        rank: index + 1,
        user_id: item.user_id,
        username: item.user_profiles?.user_name || 'Anonymous',
        total_earnings: Number(item.total_amount) || 0,
      }));
    } catch (error) {
      logger.error('Error getting leaderboard:', error);
      return [];
    }
  },

  // Get earnings chart data (daily/monthly/yearly)
  async getEarningsChart(userId: string, period: 'daily' | 'monthly' | 'yearly' = 'daily', limit: number = 30): Promise<any[]> {
    try {
      // Fetch all earnings for the user with timestamps
      const { data: earnings, error } = await supabaseAdmin
        .from('earnings')
        .select('amount, created_at, earning_type, reward_type')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1000); // Get last 1000 records

      if (error) {
        logger.error('Error fetching earnings for chart:', error);
        return [];
      }

      if (!earnings || earnings.length === 0) {
        return [];
      }

      // Group earnings by date and type
      const groupedData: any = {};
      const typeSummary: any = {
        task: 0,
        daily_checkin: 0,
        referral: 0,
        referral_tier1: 0,
        referral_tier2: 0,
        referral_tier3: 0,
        bonus: 0,
        other: 0
      };

      earnings.forEach(earning => {
        const date = new Date(earning.created_at);
        let dateKey: string;

        // Format date based on period
        if (period === 'daily') {
          dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
        } else if (period === 'monthly') {
          dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
        } else { // yearly
          dateKey = String(date.getFullYear()); // YYYY
        }

        // Determine earning type and normalize to frontend format
        let type = earning.earning_type || earning.reward_type || 'other';
        
        // Normalize field names to match frontend expectations
        if (type === 'task_completion') type = 'task';
        if (type === 'referral_tier_1') type = 'referral_tier1';
        if (type === 'referral_tier_2') type = 'referral_tier2';
        if (type === 'referral_tier_3') type = 'referral_tier3';
        
        const amount = parseFloat(earning.amount?.toString() || '0');

        // Initialize date group if not exists
        if (!groupedData[dateKey]) {
          groupedData[dateKey] = {
            date: dateKey,
            earnings: 0,  // Frontend expects 'earnings' not 'total'
            task: 0,
            daily_checkin: 0,
            referral: 0,
            referral_tier1: 0,
            referral_tier2: 0,
            referral_tier3: 0,
            bonus: 0,
            other: 0
          };
        }

        // Add to totals
        groupedData[dateKey].earnings += amount;
        groupedData[dateKey][type] = (groupedData[dateKey][type] || 0) + amount;
        typeSummary[type] = (typeSummary[type] || 0) + amount;
      });

      // Convert to array and sort by date
      const chartData = Object.values(groupedData)
        .sort((a: any, b: any) => a.date.localeCompare(b.date))
        .slice(-limit); // Take last N periods

      logger.info(`📊 Chart data generated: ${chartData.length} periods for user ${userId}`);

      // Return just the array for frontend (wrapped in sendSuccess by controller)
      return chartData;
    } catch (error) {
      logger.error('Exception getting earnings chart:', error);
      return [];
    }
  },

  // Get transactions from earnings table (all earning sources)
  async getTransactions(userId: string): Promise<any[]> {
    try {
      const { data: earnings, error } = await supabaseAdmin
        .from('earnings')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        logger.error('Error fetching transactions:', error);
        return [];
      }

      // Map to frontend-friendly format
      return (earnings || []).map(e => ({
        id: e.id,
        amount: parseFloat(e.amount?.toString() || '0'),
        type: e.reward_type || e.earning_type || e.type || 'other',
        description: e.description || this.getDescriptionForType(e.reward_type || e.earning_type),
        timestamp: e.created_at || e.timestamp,
        is_claimed: e.is_claimed || false,
        status: e.status || 'completed'
      }));
    } catch (error) {
      logger.error('Exception getting transactions:', error);
      return [];
    }
  },

  // Helper to generate descriptions
  getDescriptionForType(type: string): string {
    const descriptions: Record<string, string> = {
      'task_completion': 'Task Completion Reward',
      'daily_checkin': 'Daily Check-in Bonus',
      'referral': 'Referral Bonus',
      'referral_tier': 'Referral Tier Reward',
      'bonus': 'Special Bonus',
      'other': 'Earning'
    };
    return descriptions[type] || 'Earning';
  },

  mapEarningFromDB(dbEarning: any): Earning {
    return {
      id: dbEarning.id,
      userId: dbEarning.user_id,
      sessionId: dbEarning.session_id,
      taskId: dbEarning.task_id,
      amount: dbEarning.amount,
      type: dbEarning.type,
      status: dbEarning.status,
      description: dbEarning.description,
      createdAt: dbEarning.created_at,
      claimedAt: dbEarning.claimed_at,
    };
  },
};
