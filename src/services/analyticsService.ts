import { supabaseAdmin } from '../config/database';

export const analyticsService = {
  async getDashboard(userId: string) {
    const { data: user } = await supabaseAdmin.from('user_profiles').select('*').eq('id', userId).single();
    const { data: earnings } = await supabaseAdmin.from('earnings').select('amount, payout_status').eq('user_id', userId);
    const totalEarnings = earnings?.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0) || 0;
    const pendingEarnings = earnings?.filter((e) => e.payout_status === 'pending').reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0) || 0;
    
    const { count: deviceCount } = await supabaseAdmin.from('devices').select('*', { count: 'exact', head: true }).eq('owner', userId);
    const totalTasks = user?.task_completed || 0;
    
    const { count: referralCount } = await supabaseAdmin.from('referrals').select('*', { count: 'exact', head: true }).eq('referrer_id', userId);

    return {
      user: { username: user?.user_name, email: user?.email, referralCode: user?.referral_code },
      earnings: { total: totalEarnings, pending: pendingEarnings, claimed: totalEarnings - pendingEarnings },
      activity: { devices: deviceCount || 0, tasksCompleted: totalTasks },
      referrals: { total: referralCount || 0 },
    };
  },

  async getGlobalStats() {
    const { count: totalUsers } = await supabaseAdmin.from('user_profiles').select('*', { count: 'exact', head: true });
    const { count: totalDevices } = await supabaseAdmin.from('devices').select('*', { count: 'exact', head: true });
    const { data: earnings } = await supabaseAdmin.from('earnings_history').select('total_amount');
    const totalEarnings = earnings?.reduce((sum, e) => sum + parseFloat(e.total_amount.toString()), 0) || 0;
    const { count: activeSessions } = await supabaseAdmin.from('devices').select('*', { count: 'exact', head: true }).eq('status', 'online');

    // Get total tasks from global_stats table
    const { data: globalStats } = await supabaseAdmin.from('global_stats').select('total_tasks_completed').eq('id', 'global').single();
    const totalTasks = globalStats?.total_tasks_completed || 0;

    return { totalUsers: totalUsers || 0, totalDevices: totalDevices || 0, activeSessions: activeSessions || 0, totalTasks: totalTasks, totalEarnings };
  },

  async getLeaderboard(limit: number = 10, period: string = 'all') {
    // Get users ordered by total earnings from earnings_history
    const { data: earningsData, error } = await supabaseAdmin
      .from('earnings_history')
      .select('user_id, total_amount')
      .order('total_amount', { ascending: false })
      .limit(limit);
    
    if (error) throw new Error(error.message);
    
    // Get user details
    const userIds = earningsData?.map(e => e.user_id) || [];
    const { data: users } = await supabaseAdmin
      .from('user_profiles')
      .select('id, user_name, email, task_completed')
      .in('id', userIds);

    const usersMap = new Map(users?.map(u => [u.id, u]));
    
    return earningsData?.map((earning, index) => {
      const user = usersMap.get(earning.user_id);
      return {
        rank: index + 1,
        username: user?.user_name || 'Anonymous',
        total_earnings: earning.total_amount || 0,
        tasks_completed: user?.task_completed || 0
      };
    }) || [];
  },
};
