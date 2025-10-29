import { supabaseAdmin } from '../config/database';
import logger from '../utils/logger';

export const dailyCheckinService = {
  // Get user's current streak information
  async getStreak(userId: string): Promise<any> {
    try {
      // Get the most recent check-in for this user
      const { data: latestCheckin } = await supabaseAdmin
        .from('daily_checkins')
        .select('*')
        .eq('user_id', userId)
        .order('check_in_date', { ascending: false })
        .limit(1)
        .single();

      if (!latestCheckin) {
        return {
          currentStreak: 0,
          lastCheckinDate: null,
          nextRewardDay: 1,
          canCheckinToday: true
        };
      }

      // Check if user has already checked in today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const lastCheckinDate = new Date(latestCheckin.check_in_date);
      lastCheckinDate.setHours(0, 0, 0, 0);

      const canCheckinToday = lastCheckinDate < today;

      // Calculate current streak
      let currentStreak = latestCheckin.streak_count || 0;
      
      // If last check-in was not yesterday, streak is broken
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (lastCheckinDate < yesterday && canCheckinToday) {
        currentStreak = 0; // Streak broken
      }

      return {
        currentStreak,
        lastCheckinDate: latestCheckin.check_in_date,
        nextRewardDay: (currentStreak % 7) + 1, // Cycle every 7 days
        canCheckinToday,
        dayNumber: latestCheckin.day_number
      };
    } catch (error) {
      logger.error('Error getting streak:', error);
      throw error;
    }
  },

  // Perform daily check-in
  async performCheckin(userId: string): Promise<any> {
    try {
      // Get current streak info
      const streakInfo = await this.getStreak(userId);

      if (!streakInfo.canCheckinToday) {
        return {
          message: 'You have already checked in today',
          data: streakInfo
        };
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Calculate new streak
      const newStreak = streakInfo.currentStreak + 1;
      const dayNumber = ((newStreak - 1) % 7) + 1; // 1-7 cycle

      // Reward amounts by day (7-day cycle)
      const rewardsByDay = [1, 2, 3, 5, 8, 13, 21]; // Fibonacci-like progression
      const reward = rewardsByDay[dayNumber - 1];

      // Insert new check-in record
      const { data: checkin, error: checkinError } = await supabaseAdmin
        .from('daily_checkins')
        .insert({
          user_id: userId,
          check_in_date: today.toISOString().split('T')[0], // YYYY-MM-DD format
          streak_count: newStreak,
          day_number: dayNumber,
          reward_amount: reward
        })
        .select()
        .single();

      if (checkinError) {
        logger.error('Error creating check-in record:', checkinError);
        throw new Error('Failed to create check-in record');
      }

      // Create earning record
      await supabaseAdmin
        .from('earnings')
        .insert({
          user_id: userId,
          amount: reward,
          reward_type: 'daily_checkin',
          is_claimed: false,
          description: `Daily check-in Day ${dayNumber} - ${newStreak} day streak`
        });

      return {
        message: `Check-in successful! Day ${dayNumber} reward: ${reward} SP`,
        data: {
          currentStreak: newStreak,
          dayNumber,
          reward,
          nextRewardDay: (newStreak % 7) + 1,
          canCheckinToday: false
        }
      };
    } catch (error) {
      logger.error('Error performing check-in:', error);
      throw error;
    }
  }
};
