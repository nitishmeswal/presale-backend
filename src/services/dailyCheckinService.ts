import { supabaseAdmin } from '../config/database';
import logger from '../utils/logger';

export const dailyCheckinService = {
  // Get user's current streak information
  async getStreak(userId: string): Promise<any> {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      // Get last check-in
      const { data: checkins } = await supabaseAdmin
        .from('daily_checkins')
        .select('*')
        .eq('user_id', userId)
        .order('check_in_date', { ascending: false })
        .limit(1);

      const lastCheckin = checkins?.[0] || null;

      // No check-ins yet
      if (!lastCheckin) {
        logger.info(`📊 ${userId}: First time - Day 1 next`);
        return {
          currentStreak: 0,
          lastCheckinDate: null,
          nextRewardDay: 1,
          canCheckIn: true,
          canCheckInToday: true
        };
      }

      const lastDate = lastCheckin.check_in_date;
      
      // Already checked in today
      if (lastDate === today) {
        logger.info(`📊 ${userId}: Already checked in today`);
        return {
          currentStreak: lastCheckin.streak_count,
          lastCheckinDate: lastDate,
          nextRewardDay: lastCheckin.day_number,
          canCheckIn: false,
          canCheckInToday: false
        };
      }

      // Calculate if streak continues (yesterday) or breaks
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const streakContinues = (lastDate === yesterdayStr);
      const currentStreak = streakContinues ? lastCheckin.streak_count : 0;
      const nextDay = streakContinues ? (lastCheckin.day_number % 7) + 1 : 1;

      logger.info(`📊 ${userId}: Can check in - Day ${nextDay} next (streak ${streakContinues ? 'continues' : 'broken'})`);

      return {
        currentStreak,
        lastCheckinDate: lastDate,
        nextRewardDay: nextDay,
        canCheckIn: true,
        canCheckInToday: true
      };
    } catch (error: any) {
      logger.error(`Error getting streak: ${error.message || JSON.stringify(error)}`);
      throw error;
    }
  },

  // Perform daily check-in
  async performCheckin(userId: string): Promise<any> {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Get streak info (calculates next day & blocks if already checked in)
      const streakInfo = await this.getStreak(userId);

      // Block if already checked in today
      if (!streakInfo.canCheckIn) {
        logger.info(`❌ ${userId}: Already checked in today`);
        return {
          message: 'You have already checked in today',
          data: streakInfo
        };
      }

      // Calculate values
      const newStreak = streakInfo.currentStreak + 1;
      const dayNumber = streakInfo.nextRewardDay; // Already calculated by getStreak
      const rewardsByDay = [5, 10, 15, 20, 25, 30, 50]; // Day 1-7
      const reward = rewardsByDay[dayNumber - 1];

      logger.info(`🔄 ${userId}: Check-in Day ${dayNumber}, Streak ${newStreak}, Reward ${reward} SP`);

      // Insert check-in record
      const { error: checkinError } = await supabaseAdmin
        .from('daily_checkins')
        .insert({
          user_id: userId,
          check_in_date: today,
          day_number: dayNumber,
          streak_count: newStreak,
          reward_amount: reward
        });

      if (checkinError) {
        logger.error(`❌ ${userId}: Insert failed: ${checkinError.message || JSON.stringify(checkinError)}`);
        throw new Error(`Failed to save check-in: ${checkinError.message}`);
      }

      // Add to earnings
      await supabaseAdmin
        .from('earnings')
        .insert({
          user_id: userId,
          amount: reward,
          earning_type: 'daily_checkin',
          reward_type: 'daily_checkin',
          is_claimed: false,
          description: `Day ${dayNumber} check-in reward`
        });

      // Update unclaimed_reward
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('unclaimed_reward')
        .eq('id', userId)
        .single();

      if (profile) {
        await supabaseAdmin
          .from('user_profiles')
          .update({ unclaimed_reward: (profile.unclaimed_reward || 0) + reward })
          .eq('id', userId);
      }

      logger.info(`✅ ${userId}: Check-in complete!`);

      return {
        message: `Day ${dayNumber} reward: ${reward} SP!`,
        data: {
          currentStreak: newStreak,
          dayNumber,
          reward,
          nextRewardDay: (dayNumber % 7) + 1,
          canCheckIn: false,
          canCheckInToday: false
        }
      };
    } catch (error: any) {
      logger.error(`Check-in error: ${error.message || JSON.stringify(error)}`);
      throw error;
    }
  }
};
