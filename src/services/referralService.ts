import { supabaseAdmin } from '../config/database';
import { ERROR_MESSAGES, EARNINGS_CONFIG, SUCCESS_MESSAGES } from '../utils/constants';
import { Referral } from '../types/api';
import logger from '../utils/logger';

export const referralService = {
  async verifyReferralCode(referralCode: string): Promise<{ valid: boolean; referrer?: { id: string; username: string }; message?: string }> {
    logger.info(`🔍 Verifying referral code: ${referralCode}`);
    
    const { data: user, error } = await supabaseAdmin
      .from('user_profiles')
      .select('id, user_name')
      .eq('referral_code', referralCode)
      .single();

    if (error || !user) {
      logger.warn(`❌ Referral code not found: ${referralCode}`);
      return { valid: false, message: 'Referral code not found' };
    }

    logger.info(`✅ Valid referral code: ${referralCode} → User: ${user.user_name}`);
    
    return { 
      valid: true, 
      referrer: {
        id: user.id,
        username: user.user_name
      }
    };
  },

  async createReferral(referrerId: string, referredUserId: string, referralCode: string): Promise<Referral> {
    logger.info(`🔨 createReferral called - referrerId: ${referrerId}, referredUserId: ${referredUserId}, code: ${referralCode}`);
    
    // Validate inputs
    if (!referrerId) {
      logger.error('❌ referrerId is null/undefined!');
      throw new Error('Invalid referrer ID');
    }
    if (!referredUserId) {
      logger.error('❌ referredUserId is null/undefined!');
      throw new Error('Invalid referred user ID');
    }
    
    // Prevent self-referral
    if (referrerId === referredUserId) {
      throw new Error('Cannot refer yourself');
    }

    // Check if referral already exists
    const { data: existing } = await supabaseAdmin
      .from('referrals')
      .select('*')
      .eq('referred_id', referredUserId)  // ✅ Fixed: was referred_user_id
      .single();

    if (existing) {
      throw new Error('You have already been referred by someone else');
    }

    logger.info(`📤 Inserting referral: referrer_id=${referrerId}, referred_id=${referredUserId}, code=${referralCode}`);

    const { data: referral, error } = await supabaseAdmin
      .from('referrals')
      .insert({
        referrer_id: referrerId,
        referred_id: referredUserId,  // ✅ Fixed: was referred_user_id
        referral_code: referralCode,
        status: 'active',
        reward_amount: EARNINGS_CONFIG.REFERRER_SIGNUP_BONUS,
      })
      .select()
      .single();

    if (error) {
      logger.error('❌ Database error inserting referral:', error);
      throw new Error(error.message);
    }

    logger.info(`💰 Awarding bonuses - Referrer: ${EARNINGS_CONFIG.REFERRER_SIGNUP_BONUS} SP, Referred: ${EARNINGS_CONFIG.REFERRED_SIGNUP_BONUS} SP`);

    // 1. Give 250 SP signup bonus to referrer
    const { error: referrerEarningError } = await supabaseAdmin.from('earnings').insert({
      user_id: referrerId,
      amount: EARNINGS_CONFIG.REFERRER_SIGNUP_BONUS,
      earning_type: 'other',
      reward_type: 'referral',
      is_claimed: false,
      description: `Referral signup bonus for inviting user`,
      metadata: { referred_user_id: referredUserId, type: 'signup_bonus' }
    });

    if (referrerEarningError) {
      logger.error('❌ Failed to create referrer earning:', referrerEarningError);
      throw new Error(`Failed to award referrer bonus: ${referrerEarningError.message}`);
    }

    // 2. Give 500 SP signup bonus to referred user
    const { error: referredEarningError } = await supabaseAdmin.from('earnings').insert({
      user_id: referredUserId,
      amount: EARNINGS_CONFIG.REFERRED_SIGNUP_BONUS,
      earning_type: 'other',
      reward_type: 'referral',
      is_claimed: false,
      description: `Welcome bonus for joining via referral`,
      metadata: { referrer_id: referrerId, type: 'welcome_bonus' }
    });

    if (referredEarningError) {
      logger.error('❌ Failed to create referred user earning:', referredEarningError);
      throw new Error(`Failed to award welcome bonus: ${referredEarningError.message}`);
    }

    logger.info(`✅ Earnings created successfully`);

    // Update unclaimed rewards for both users
    await this.updateUnclaimedRewards(referrerId, EARNINGS_CONFIG.REFERRER_SIGNUP_BONUS);
    await this.updateUnclaimedRewards(referredUserId, EARNINGS_CONFIG.REFERRED_SIGNUP_BONUS);

    logger.info(`✅ Updated unclaimed rewards for both users`);

    return this.mapReferralFromDB(referral);
  },

  async updateUnclaimedRewards(userId: string, amount: number): Promise<void> {
    logger.info(`💵 Updating unclaimed rewards - User: ${userId}, Adding: ${amount} SP`);
    
    const { data: profile, error: selectError } = await supabaseAdmin
      .from('user_profiles')
      .select('unclaimed_reward')
      .eq('id', userId)
      .single();

    if (selectError) {
      logger.error('❌ Failed to fetch user profile:', selectError);
      throw new Error(`Failed to fetch profile for unclaimed rewards: ${selectError.message}`);
    }

    const currentUnclaimed = profile?.unclaimed_reward || 0;
    const newUnclaimed = currentUnclaimed + amount;
    
    logger.info(`📊 Current: ${currentUnclaimed} SP → New: ${newUnclaimed} SP`);
    
    const { error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update({ unclaimed_reward: newUnclaimed })
      .eq('id', userId);

    if (updateError) {
      logger.error('❌ Failed to update unclaimed_reward:', updateError);
      throw new Error(`Failed to update unclaimed rewards: ${updateError.message}`);
    }

    logger.info(`✅ Unclaimed rewards updated successfully`);
  },

  // Distribute royalty earnings when someone completes a task
  async distributeRoyaltyEarnings(userId: string, earnedAmount: number): Promise<void> {
    logger.info(`💸 Distributing royalty earnings - User: ${userId}, Amount: ${earnedAmount}`);
    
    // Find who referred this user (Tier 1)
    const { data: tier1Referral } = await supabaseAdmin
      .from('referrals')
      .select('referrer_id')
      .eq('referred_id', userId)
      .eq('status', 'active')
      .single();

    if (!tier1Referral) {
      logger.info(`ℹ️ No Tier 1 referrer found for user ${userId}`);
      return;
    }

    const tier1ReferrerId = tier1Referral.referrer_id;
    const tier1Amount = earnedAmount * EARNINGS_CONFIG.TIER_1_PERCENTAGE;

    logger.info(`💰 Tier 1: Awarding ${tier1Amount} SP to ${tier1ReferrerId}`);

    // Give Tier 1 royalty (10%)
    const { error: tier1Error } = await supabaseAdmin.from('earnings').insert({
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

    if (tier1Error) {
      logger.error('❌ Failed to create Tier 1 earning:', tier1Error);
      return; // Don't continue if tier 1 fails
    }

    await this.updateUnclaimedRewards(tier1ReferrerId, tier1Amount);

    // Find who referred tier1 user (Tier 2)
    const { data: tier2Referral } = await supabaseAdmin
      .from('referrals')
      .select('referrer_id')
      .eq('referred_id', tier1ReferrerId)
      .eq('status', 'active')
      .single();

    if (!tier2Referral) return;

    const tier2ReferrerId = tier2Referral.referrer_id;
    const tier2Amount = earnedAmount * EARNINGS_CONFIG.TIER_2_PERCENTAGE;

    logger.info(`💰 Tier 2: Awarding ${tier2Amount} SP to ${tier2ReferrerId}`);

    // Give Tier 2 royalty (5%)
    const { error: tier2Error } = await supabaseAdmin.from('earnings').insert({
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

    if (tier2Error) {
      logger.error('❌ Failed to create Tier 2 earning:', tier2Error);
      return; // Don't continue if tier 2 fails
    }

    await this.updateUnclaimedRewards(tier2ReferrerId, tier2Amount);

    // Find who referred tier2 user (Tier 3)
    const { data: tier3Referral } = await supabaseAdmin
      .from('referrals')
      .select('referrer_id')
      .eq('referred_id', tier2ReferrerId)
      .eq('status', 'active')
      .single();

    if (!tier3Referral) return;

    const tier3ReferrerId = tier3Referral.referrer_id;
    const tier3Amount = earnedAmount * EARNINGS_CONFIG.TIER_3_PERCENTAGE;

    logger.info(`💰 Tier 3: Awarding ${tier3Amount} SP to ${tier3ReferrerId}`);

    // Give Tier 3 royalty (2.5%)
    const { error: tier3Error } = await supabaseAdmin.from('earnings').insert({
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

    if (tier3Error) {
      logger.error('❌ Failed to create Tier 3 earning:', tier3Error);
      return;
    }

    await this.updateUnclaimedRewards(tier3ReferrerId, tier3Amount);
    logger.info(`✅ All royalty earnings distributed successfully`);
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

    return referrals?.map(this.mapReferralFromDB) || [];
  },

  async getMyReferrer(userId: string): Promise<{ data: any } | { data: null }> {
    const { data: referral, error } = await supabaseAdmin
      .from('referrals')
      .select(`
        referrer_id,
        referral_code,
        created_at
      `)
      .eq('referred_id', userId)
      .single();

    if (error || !referral) {
      return { data: null };
    }

    // Get referrer username
    const { data: referrerProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('user_name')
      .eq('id', referral.referrer_id)
      .single();

    return {
      data: {
        referrer_id: referral.referrer_id,
        referrer_username: referrerProfile?.user_name || 'Unknown',
        referral_code: referral.referral_code,
        referred_at: referral.created_at
      }
    };
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
          .select('referred_id')
          .eq('referrer_id', tier1.referred_id);
        
        tier2Count += tier2Refs?.length || 0;

        if (tier2Refs) {
          for (const tier2 of tier2Refs) {
            const { data: tier3Refs } = await supabaseAdmin
              .from('referrals')
              .select('referred_id')
              .eq('referrer_id', tier2.referred_id);
            
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
    try {
      // Get Tier 1 referrals
      const { data: tier1Referrals, error: refError } = await supabaseAdmin
        .from('referrals')
        .select('referred_id, created_at')
        .eq('referrer_id', userId);

      if (refError) {
        logger.error('Error fetching tier1 referrals:', refError);
        throw new Error(refError.message);
      }

      logger.info(`📊 Found ${tier1Referrals?.length || 0} tier 1 referrals`);

      // Get Tier 1 earnings for each referral
      const tier1Details = [];
      if (tier1Referrals && tier1Referrals.length > 0) {
        for (const ref of tier1Referrals) {
          // Get user info
          const { data: userProfile } = await supabaseAdmin
            .from('user_profiles')
            .select('user_name')
            .eq('id', ref.referred_id)
            .single();

          // Get earnings from this specific referral
          const { data: earnings } = await supabaseAdmin
            .from('earnings')
            .select('amount, metadata')
            .eq('user_id', userId)
            .eq('reward_type', 'referral');

          // Filter earnings for this specific tier 1 referral
          const tier1Earnings = earnings?.filter((e: any) => 
            e.metadata?.tier === 1 && e.metadata?.referral_user_id === ref.referred_id
          ) || [];

          const totalEarnings = tier1Earnings.reduce((sum, e) => sum + parseFloat(e.amount?.toString() || '0'), 0);

          tier1Details.push({
            username: userProfile?.user_name || 'Anonymous',
            earnings: totalEarnings,
            joinedAt: ref.created_at
          });
        }
      }

      logger.info(`✅ Breakdown tier1: ${tier1Details.length} users`);

      // Get stats for tier 2 and 3 (no names for privacy)
      const stats = await this.getReferralStats(userId);

      return {
        tier1: tier1Details,
        tier2: stats.tier2,
        tier3: stats.tier3
      };
    } catch (error) {
      logger.error('Error getting referral breakdown:', error);
      // Return empty data instead of throwing
      return {
        tier1: [],
        tier2: { count: 0, earnings: 0 },
        tier3: { count: 0, earnings: 0 }
      };
    }
  },

  // Claim pending referral rewards
  async claimReferralRewards(userId: string, earningType: string = 'referral'): Promise<{ claimedAmount: number; message: string }> {
    try {
      logger.info(`📥 Claiming rewards for user ${userId}, type: ${earningType}`);

      // Build the query based on earning_type
      let query = supabaseAdmin
        .from('earnings')
        .select('id, amount, earning_type')
        .eq('user_id', userId)
        .eq('is_claimed', false);

      // Filter by earning type
      if (earningType === 'referral') {
        // For referral type, match all tier referral types
        query = query.or('earning_type.eq.referral,reward_type.eq.referral');
      } else {
        // For other types, exact match
        query = query.eq('earning_type', earningType);
      }

      const { data: pendingEarnings, error: fetchError } = await query;

      if (fetchError) {
        logger.error('Error fetching pending earnings:', fetchError);
        throw new Error(fetchError.message);
      }

      logger.info(`📊 Found ${pendingEarnings?.length || 0} pending earnings`);

      if (!pendingEarnings || pendingEarnings.length === 0) {
        return { claimedAmount: 0, message: 'No pending rewards to claim' };
      }

      // Calculate total amount
      const totalAmount = pendingEarnings.reduce((sum, e) => sum + parseFloat(e.amount?.toString() || '0'), 0);
      logger.info(`💰 Total amount to claim: ${totalAmount}`);

      // Update all to claimed
      const earningIds = pendingEarnings.map(e => e.id);
      const { error: updateError } = await supabaseAdmin
        .from('earnings')
        .update({ is_claimed: true })
        .in('id', earningIds);

      if (updateError) {
        logger.error('Error updating earnings:', updateError);
        throw new Error(updateError.message);
      }

      // Update user's unclaimed_reward balance
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('unclaimed_reward')
        .eq('id', userId)
        .single();

      const currentUnclaimed = parseFloat(profile?.unclaimed_reward?.toString() || '0');
      const newUnclaimed = currentUnclaimed + totalAmount;

      await supabaseAdmin
        .from('user_profiles')
        .update({ unclaimed_reward: newUnclaimed })
        .eq('id', userId);

      logger.info(`✅ Claimed ${totalAmount} SP rewards for user ${userId}. New unclaimed: ${newUnclaimed}`);

      return {
        claimedAmount: Number(totalAmount.toFixed(2)),
        message: `Successfully claimed ${totalAmount.toFixed(2)} SP from ${earningType} rewards`
      };
    } catch (error: any) {
      logger.error('Error claiming referral rewards:', error);
      return {
        claimedAmount: 0,
        message: error.message || 'Failed to claim rewards'
      };
    }
  },

  // Use a referral code AFTER signup
  async useReferralCode(userId: string, referralCode: string): Promise<{ success: boolean; message: string }> {
    try {
      logger.info(`🔗 User ${userId} attempting to use referral code: ${referralCode}`);

      // Check if user already has a referrer
      const { data: existingReferral } = await supabaseAdmin
        .from('referrals')
        .select('*')
        .eq('referred_id', userId)
        .single();

      if (existingReferral) {
        return {
          success: false,
          message: 'You have already been referred by someone else'
        };
      }

      // Verify the referral code
      const verification = await this.verifyReferralCode(referralCode);

      if (!verification.valid || !verification.referrer) {
        return {
          success: false,
          message: verification.message || 'Invalid referral code'
        };
      }

      // Prevent self-referral
      if (verification.referrer.id === userId) {
        return {
          success: false,
          message: 'Cannot use your own referral code'
        };
      }

      // Log what we're about to insert
      logger.info(`📝 Creating referral - Referrer ID: ${verification.referrer.id}, Referred User ID: ${userId}, Code: ${referralCode}`);

      // Create the referral relationship with bonuses
      await this.createReferral(
        verification.referrer.id,
        userId,
        referralCode
      );

      logger.info(`✅ Referral code used successfully: ${userId} → ${verification.referrer.username}`);

      return {
        success: true,
        message: `Successfully joined ${verification.referrer.username}'s referral network! You've earned ${EARNINGS_CONFIG.REFERRED_SIGNUP_BONUS} SP!`
      };
    } catch (error: any) {
      logger.error('Error using referral code:', error);
      return {
        success: false,
        message: error.message || 'Failed to use referral code'
      };
    }
  },

  mapReferralFromDB(dbReferral: any): Referral {
    return {
      id: dbReferral.id,
      referrerId: dbReferral.referrer_id,
      referredUserId: dbReferral.referred_id,  // ✅ Fixed: database column is referred_id
      referralCode: dbReferral.referral_code,
      status: dbReferral.status,
      rewardAmount: dbReferral.reward_amount,
      createdAt: dbReferral.created_at,
      usedAt: dbReferral.used_at,
    };
  },
};
