import { supabaseAdmin } from '../config/database';
import logger from '../utils/logger';

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  total_earnings: number;
  is_current_user: boolean;
}

interface LeaderboardResponse {
  top_10: LeaderboardEntry[];
  current_user?: LeaderboardEntry;
  total_users: number;
}

export const leaderboardService = {
  /**
   * SIMPLIFIED: Get top 10 leaderboard + current user's rank
   */
  async getLeaderboard(userId?: string): Promise<LeaderboardResponse> {
    try {
      // Get top 10 users with profiles in ONE query
      const { data: top10Data, error: top10Error } = await supabaseAdmin
        .from('earnings_history')
        .select(`
          user_id,
          total_amount,
          user_profiles!inner (
            user_name,
            email
          )
        `)
        .order('total_amount', { ascending: false })
        .limit(10);

      if (top10Error) {
        logger.error('Error fetching top 10:', top10Error);
        return { top_10: [], total_users: 0 };
      }

      // Build top 10 list
      const top10: LeaderboardEntry[] = (top10Data || []).map((item: any, index) => ({
        rank: index + 1,
        user_id: item.user_id,
        username: item.user_profiles?.user_name || 'Anonymous',
        total_earnings: Number(item.total_amount) || 0,
        is_current_user: item.user_id === userId,
      }));

      // Get total users count
      const { count } = await supabaseAdmin
        .from('earnings_history')
        .select('*', { count: 'exact', head: true });

      // Check if current user is in top 10
      const userInTop10 = top10.find(u => u.user_id === userId);

      let currentUser: LeaderboardEntry | undefined;

      // Only fetch current user if NOT in top 10
      if (userId && !userInTop10) {
        const { data: allUsers } = await supabaseAdmin
          .from('earnings_history')
          .select('user_id, total_amount')
          .order('total_amount', { ascending: false });

        if (allUsers && allUsers.length > 0) {
          const userRankIndex = allUsers.findIndex(u => u.user_id === userId);

          if (userRankIndex !== -1) {
            const { data: userData } = await supabaseAdmin
              .from('user_profiles')
              .select('user_name')
              .eq('id', userId)
              .single();

            currentUser = {
              rank: userRankIndex + 1,
              user_id: userId,
              username: userData?.user_name || 'Anonymous',
              total_earnings: Number(allUsers[userRankIndex].total_amount) || 0,
              is_current_user: true,
            };
          }
        }
      }

      return {
        top_10: top10,
        current_user: currentUser,
        total_users: count || 0,
      };
    } catch (error) {
      logger.error('Error getting leaderboard:', error);
      return { top_10: [], total_users: 0 };
    }
  },

  /**
   * Get user's current rank
   */
  async getUserRank(userId: string): Promise<{ rank: number; total_users: number; total_earnings: number } | null> {
    try {
      const { data: allRanked, error } = await supabaseAdmin
        .from('earnings_history')
        .select('user_id, total_amount')
        .order('total_amount', { ascending: false });

      if (error) throw new Error(error.message);

      const rankIndex = allRanked?.findIndex(e => e.user_id === userId);
      
      if (rankIndex === undefined || rankIndex === -1) {
        return null;
      }

      return {
        rank: rankIndex + 1,
        total_users: allRanked?.length || 0,
        total_earnings: Number(allRanked[rankIndex].total_amount) || 0,
      };
    } catch (error) {
      logger.error('Error getting user rank:', error);
      return null;
    }
  },
};
