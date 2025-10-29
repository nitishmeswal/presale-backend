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

      // Get current total earnings
      const { data: earnings, error: earningsError } = await supabaseAdmin
        .from('earnings_leaderboard')
        .select('total_earnings')
        .eq('user_id', userId)
        .single();

      const currentEarnings = earnings?.total_earnings || 0;
      const newTotalEarnings = currentEarnings + unclaimedAmount;

      // Update or insert into earnings_leaderboard
      const { error: leaderboardError } = await supabaseAdmin
        .from('earnings_leaderboard')
        .upsert({
          user_id: userId,
          total_earnings: newTotalEarnings,
          updated_at: new Date().toISOString()
        });

      if (leaderboardError) {
        logger.error('Error updating earnings leaderboard:', leaderboardError);
        return {
          success: false,
          error: 'Failed to update earnings leaderboard'
        };
      }

      // Upsert into earnings_history
      const { error: historyError } = await supabaseAdmin
        .from('earnings_history')
        .upsert({
          user_id: userId,
          total_amount: newTotalEarnings,
          timestamp: new Date().toISOString(),
          payout_status: 'pending'
        }, { onConflict: 'user_id' });

      if (historyError) {
        logger.error('Error adding earnings history:', historyError);
        // Not returning an error here as the main operation succeeded
      }

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

  // Get leaderboard
  async getLeaderboard(limit: number = 100): Promise<any[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('earnings_leaderboard')
        .select('user_id, total_earnings, updated_at')
        .order('total_earnings', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error getting leaderboard:', error);
      return [];
    }
  },

  // Get earnings chart data
  async getEarningsChart(userId: string): Promise<any[]> {
    try {
      // TODO: Implement chart data from earnings_history or daily_stats
      return [];
    } catch (error) {
      logger.error('Error getting earnings chart:', error);
      return [];
    }
  },

  // Get transactions
  async getTransactions(userId: string): Promise<any[]> {
    try {
      // TODO: Implement transaction history
      return [];
    } catch (error) {
      logger.error('Error getting transactions:', error);
      return [];
    }
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
