import { supabaseAdmin } from '../config/database';
import { ERROR_MESSAGES, EARNINGS_CONFIG, SUCCESS_MESSAGES } from '../utils/constants';
import { Referral } from '../types/api';

export const referralService = {
  async verifyReferralCode(referralCode: string): Promise<{ valid: boolean; referrerId?: string }> {
    const { data: user } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('referral_code', referralCode)
      .single();

    if (!user) {
      return { valid: false };
    }

    return { valid: true, referrerId: user.id };
  },

  async createReferral(referrerId: string, referredUserId: string, referralCode: string): Promise<Referral> {
    // Check if referral already exists
    const { data: existing } = await supabaseAdmin
      .from('referrals')
      .select('*')
      .eq('referral_code', referralCode)
      .eq('referred_user_id', referredUserId)
      .single();

    if (existing) {
      throw new Error(ERROR_MESSAGES.REFERRAL_ALREADY_USED);
    }

    const { data: referral, error } = await supabaseAdmin
      .from('referrals')
      .insert({
        referrer_id: referrerId,
        referred_user_id: referredUserId,
        referral_code: referralCode,
        status: 'active',
        reward_amount: EARNINGS_CONFIG.REFERRAL_BONUS,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // Create bonus earning for referrer
    await supabaseAdmin.from('earnings').insert({
      user_id: referrerId,
      amount: EARNINGS_CONFIG.REFERRAL_BONUS,
      type: 'referral',
      reward_type: 'referral',  // Keep for backwards compatibility
      earning_type: 'referral',  // ✅ Use earning_type for chart grouping
      status: 'confirmed',
      is_claimed: false,
      description: `Referral bonus for inviting user ${referredUserId}`,
    });

    return this.mapReferralFromDB(referral);
  },

  async getReferrals(userId: string): Promise<Referral[]> {
    const { data: referrals, error } = await supabaseAdmin
      .from('referrals')
      .select('*')
      .eq('referrer_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return referrals.map(this.mapReferralFromDB);
  },

  async getReferralStats(userId: string): Promise<{
    totalReferrals: number;
    activeReferrals: number;
    totalRewards: number;
  }> {
    const { data: referrals } = await supabaseAdmin
      .from('referrals')
      .select('*')
      .eq('referrer_id', userId);

    const activeReferrals = referrals?.filter((r) => r.status === 'active').length || 0;
    const totalRewards = referrals?.reduce((sum, r) => sum + (r.reward_amount || 0), 0) || 0;

    return {
      totalReferrals: referrals?.length || 0,
      activeReferrals,
      totalRewards,
    };
  },

  mapReferralFromDB(dbReferral: any): Referral {
    return {
      id: dbReferral.id,
      referrerId: dbReferral.referrer_id,
      referredUserId: dbReferral.referred_user_id,
      referralCode: dbReferral.referral_code,
      status: dbReferral.status,
      rewardAmount: dbReferral.reward_amount,
      createdAt: dbReferral.created_at,
      usedAt: dbReferral.used_at,
    };
  },
};
