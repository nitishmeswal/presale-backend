import { supabaseAdmin } from '../config/database';
import { ERROR_MESSAGES, EARNINGS_CONFIG, SUCCESS_MESSAGES } from '../utils/constants';
import { Referral } from '../types/api';
import logger from '../utils/logger';

export const referralService = {
  async verifyReferralCode(referralCode: string): Promise<{ valid: boolean; referrer?: { id: string; username: string } }> {
    const { data: user } = await supabaseAdmin
      .from('user_profiles')
      .select('id, user_name')
      .eq('referral_code', referralCode)
      .single();

    if (!user) {
      return { valid: false };
    }

    return { 
      valid: true, 
      referrer: {
        id: user.id,
        username: user.user_name
      }
    };
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
        reward_amount: EARNINGS_CONFIG.REFERRER_SIGNUP_BONUS,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // 1. Give 250 SP signup bonus to referrer
    await supabaseAdmin.from('earnings').insert({
      user_id: referrerId,
      amount: EARNINGS_CONFIG.REFERRER_SIGNUP_BONUS,
      earning_type: 'other',
      reward_type: 'referral',
      is_claimed: false,
      description: `Referral signup bonus for inviting user`,
      metadata: { referred_user_id: referredUserId, type: 'signup_bonus' }
    });

    // 2. Give 500 SP signup bonus to referred user
    await supabaseAdmin.from('earnings').insert({
      user_id: referredUserId,
      amount: EARNINGS_CONFIG.REFERRED_SIGNUP_BONUS,
      earning_type: 'other',
      reward_type: 'referral',
      is_claimed: false,
      description: `Welcome bonus for joining via referral`,
      metadata: { referrer_id: referrerId, type: 'welcome_bonus' }
    });

    // Update unclaimed rewards for both users
    await this.updateUnclaimedRewards(referrerId, EARNINGS_CONFIG.REFERRER_SIGNUP_BONUS);
    await this.updateUnclaimedRewards(referredUserId, EARNINGS_CONFIG.REFERRED_SIGNUP_BONUS);

    return this.mapReferralFromDB(referral);
  },

  async updateUnclaimedRewards(userId: string, amount: number): Promise<void> {
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('unclaimed_reward')
      .eq('id', userId)
      .single();

    const currentUnclaimed = profile?.unclaimed_reward || 0;
    await supabaseAdmin
      .from('user_profiles')
      .update({ unclaimed_reward: currentUnclaimed + amount })
      .eq('id', userId);
  },

  // Distribute royalty earnings when someone completes a task
  async distributeRoyaltyEarnings(userId: string, earnedAmount: number): Promise<void> {
    // Find who referred this user (Tier 1)
    const { data: tier1Referral } = await supabaseAdmin
      .from('referrals')
      .select('referrer_id')
      .eq('referred_user_id', userId)
      .eq('status', 'active')
      .single();

    if (!tier1Referral) return;

    const tier1ReferrerId = tier1Referral.referrer_id;
    const tier1Amount = earnedAmount * EARNINGS_CONFIG.TIER_1_PERCENTAGE;

    // Give Tier 1 royalty (10%)
    await supabaseAdmin.from('earnings').insert({
      user_id: tier1ReferrerId,
      amount: tier1Amount,
      earning_type: 'other',
      reward_type: 'referral',
      is_claimed: false,
      description: `Tier 1 royalty (10% from direct referral)`,
      metadata: { 
        referral_user_id: userId, 
        tier: 1, 
        base_earning: earnedAmount,
        percentage: EARNINGS_CONFIG.TIER_1_PERCENTAGE 
      }
    });

    await this.updateUnclaimedRewards(tier1ReferrerId, tier1Amount);

    // Find who referred tier1 user (Tier 2)
    const { data: tier2Referral } = await supabaseAdmin
      .from('referrals')
      .select('referrer_id')
      .eq('referred_user_id', tier1ReferrerId)
      .eq('status', 'active')
      .single();

    if (!tier2Referral) return;

    const tier2ReferrerId = tier2Referral.referrer_id;
    const tier2Amount = earnedAmount * EARNINGS_CONFIG.TIER_2_PERCENTAGE;

    // Give Tier 2 royalty (5%)
    await supabaseAdmin.from('earnings').insert({
      user_id: tier2ReferrerId,
      amount: tier2Amount,
      earning_type: 'other',
      reward_type: 'referral',
      is_claimed: false,
      description: `Tier 2 royalty (5% from tier 1's referral)`,
      metadata: { 
        referral_user_id: userId, 
        tier: 2, 
        base_earning: earnedAmount,
        percentage: EARNINGS_CONFIG.TIER_2_PERCENTAGE 
      }
    });

    await this.updateUnclaimedRewards(tier2ReferrerId, tier2Amount);

    // Find who referred tier2 user (Tier 3)
    const { data: tier3Referral } = await supabaseAdmin
      .from('referrals')
      .select('referrer_id')
      .eq('referred_user_id', tier2ReferrerId)
      .eq('status', 'active')
      .single();

    if (!tier3Referral) return;

    const tier3ReferrerId = tier3Referral.referrer_id;
    const tier3Amount = earnedAmount * EARNINGS_CONFIG.TIER_3_PERCENTAGE;

    // Give Tier 3 royalty (2.5%)
    await supabaseAdmin.from('earnings').insert({
      user_id: tier3ReferrerId,
      amount: tier3Amount,
      earning_type: 'other',
      reward_type: 'referral',
      is_claimed: false,
      description: `Tier 3 royalty (2.5% from tier 2's referral)`,
      metadata: { 
        referral_user_id: userId, 
        tier: 3, 
        base_earning: earnedAmount,
        percentage: EARNINGS_CONFIG.TIER_3_PERCENTAGE 
      }
    });

    await this.updateUnclaimedRewards(tier3ReferrerId, tier3Amount);
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
    claimedRewards: number;
    pendingRewards: number;
    tier1: { count: number; earnings: number };
    tier2: { count: number; earnings: number };
    tier3: { count: number; earnings: number };
  }> {
    // Get direct referrals (Tier 1)
    const { data: tier1Referrals } = await supabaseAdmin
      .from('referrals')
      .select('*')
      .eq('referrer_id', userId);

    // Calculate Tier 1 earnings from referral rewards
    const { data: tier1Earnings } = await supabaseAdmin
      .from('earnings')
      .select('amount, metadata')
      .eq('user_id', userId)
      .eq('reward_type', 'referral');

    const tier1RoyaltyEarnings = tier1Earnings
      ?.filter((e: any) => e.metadata?.tier === 1)
      ?.reduce((sum, e) => sum + parseFloat(e.amount?.toString() || '0'), 0) || 0;

    const tier2RoyaltyEarnings = tier1Earnings
      ?.filter((e: any) => e.metadata?.tier === 2)
      ?.reduce((sum, e) => sum + parseFloat(e.amount?.toString() || '0'), 0) || 0;

    const tier3RoyaltyEarnings = tier1Earnings
      ?.filter((e: any) => e.metadata?.tier === 3)
      ?.reduce((sum, e) => sum + parseFloat(e.amount?.toString() || '0'), 0) || 0;

    // Count tier 2 and 3 (indirect referrals)
    let tier2Count = 0;
    let tier3Count = 0;

    if (tier1Referrals) {
      for (const tier1 of tier1Referrals) {
        const { data: tier2Refs } = await supabaseAdmin
          .from('referrals')
          .select('referred_user_id')
          .eq('referrer_id', tier1.referred_user_id);
        
        tier2Count += tier2Refs?.length || 0;

        if (tier2Refs) {
          for (const tier2 of tier2Refs) {
            const { data: tier3Refs } = await supabaseAdmin
              .from('referrals')
              .select('referred_user_id')
              .eq('referrer_id', tier2.referred_user_id);
            
            tier3Count += tier3Refs?.length || 0;
          }
        }
      }
    }

    const activeReferrals = tier1Referrals?.filter((r) => r.status === 'active').length || 0;
    const signupBonuses = tier1Referrals?.reduce((sum, r) => sum + (r.reward_amount || 0), 0) || 0;
    const totalRoyalty = tier1RoyaltyEarnings + tier2RoyaltyEarnings + tier3RoyaltyEarnings;

    // Calculate claimed and pending rewards
    const { data: claimedEarnings } = await supabaseAdmin
      .from('earnings')
      .select('amount')
      .eq('user_id', userId)
      .eq('reward_type', 'referral')
      .eq('is_claimed', true);

    const { data: pendingEarnings } = await supabaseAdmin
      .from('earnings')
      .select('amount')
      .eq('user_id', userId)
      .eq('reward_type', 'referral')
      .eq('is_claimed', false);

    const claimedRewards = claimedEarnings?.reduce((sum, e) => sum + parseFloat(e.amount?.toString() || '0'), 0) || 0;
    const pendingRewards = pendingEarnings?.reduce((sum, e) => sum + parseFloat(e.amount?.toString() || '0'), 0) || 0;

    return {
      totalReferrals: tier1Referrals?.length || 0,
      activeReferrals,
      totalRewards: signupBonuses + totalRoyalty,
      claimedRewards,
      pendingRewards,
      tier1: { 
        count: tier1Referrals?.length || 0, 
        earnings: tier1RoyaltyEarnings 
      },
      tier2: { 
        count: tier2Count, 
        earnings: tier2RoyaltyEarnings 
      },
      tier3: { 
        count: tier3Count, 
        earnings: tier3RoyaltyEarnings 
      },
    };
  },

  // Get detailed breakdown with Tier 1 names (privacy: Tier 2/3 hidden)
  async getReferralBreakdown(userId: string): Promise<{
    tier1: Array<{ username: string; earnings: number; joinedAt: string }>;
    tier2: { count: number; earnings: number };
    tier3: { count: number; earnings: number };
  }> {
    // Get Tier 1 referrals with user info
    const { data: tier1Referrals } = await supabaseAdmin
      .from('referrals')
      .select(`
        referred_user_id,
        created_at,
        user_profiles!referrals_referred_user_id_fkey (
          user_name
        )
      `)
      .eq('referrer_id', userId);

    // Get Tier 1 earnings for each referral
    const tier1Details = [];
    if (tier1Referrals) {
      for (const ref of tier1Referrals) {
        const { data: earnings } = await supabaseAdmin
          .from('earnings')
          .select('amount')
          .eq('user_id', userId)
          .eq('reward_type', 'referral')
          .contains('metadata', { referral_user_id: ref.referred_user_id, tier: 1 });

        const totalEarnings = earnings?.reduce((sum, e) => sum + parseFloat(e.amount?.toString() || '0'), 0) || 0;

        tier1Details.push({
          username: (ref.user_profiles as any)?.user_name || 'Anonymous',
          earnings: totalEarnings,
          joinedAt: ref.created_at
        });
      }
    }

    // Get stats for tier 2 and 3 (no names for privacy)
    const stats = await this.getReferralStats(userId);

    return {
      tier1: tier1Details,
      tier2: stats.tier2,
      tier3: stats.tier3
    };
  },

  // Claim pending referral rewards
  async claimReferralRewards(userId: string): Promise<{ claimedAmount: number; message: string }> {
    try {
      // Get all pending referral earnings
      const { data: pendingEarnings, error: fetchError } = await supabaseAdmin
        .from('earnings')
        .select('id, amount')
        .eq('user_id', userId)
        .eq('reward_type', 'referral')
        .eq('is_claimed', false);

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      if (!pendingEarnings || pendingEarnings.length === 0) {
        return { claimedAmount: 0, message: 'No pending rewards to claim' };
      }

      // Calculate total amount
      const totalAmount = pendingEarnings.reduce((sum, e) => sum + parseFloat(e.amount?.toString() || '0'), 0);

      // Update all to claimed
      const { error: updateError } = await supabaseAdmin
        .from('earnings')
        .update({ is_claimed: true })
        .eq('user_id', userId)
        .eq('reward_type', 'referral')
        .eq('is_claimed', false);

      if (updateError) {
        throw new Error(updateError.message);
      }

      // Update user's unclaimed_reward balance
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('unclaimed_reward')
        .eq('id', userId)
        .single();

      const currentUnclaimed = profile?.unclaimed_reward || 0;
      await supabaseAdmin
        .from('user_profiles')
        .update({ unclaimed_reward: currentUnclaimed + totalAmount })
        .eq('id', userId);

      logger.info(`✅ Claimed ${totalAmount} SP referral rewards for user ${userId}`);

      return {
        claimedAmount: totalAmount,
        message: `Successfully claimed ${totalAmount.toFixed(2)} SP`
      };
    } catch (error) {
      logger.error('Error claiming referral rewards:', error);
      throw error;
    }
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
