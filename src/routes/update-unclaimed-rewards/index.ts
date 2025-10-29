import { Router } from 'express';
import { supabaseAdmin } from '../../config/database';
import logger from '../../utils/logger';

const router = Router();

// POST /api/v1/update-unclaimed-rewards - Update unclaimed rewards
router.post('/', async (req, res) => {
  try {
    const { user_id, reward_amount } = req.body;

    if (!user_id || reward_amount === undefined) {
      return res.status(400).json({
        error: 'Missing required parameters: user_id and reward_amount'
      });
    }

    // Fetch current unclaimed reward
    const { data: profile, error: fetchError } = await supabaseAdmin
      .from('user_profiles')
      .select('unclaimed_reward')
      .eq('id', user_id)
      .single();

    if (fetchError || !profile) {
      logger.error('Error fetching profile:', fetchError);
      return res.status(500).json({
        error: 'Failed to fetch user profile'
      });
    }

    const newUnclaimed = (profile.unclaimed_reward || 0) + reward_amount;

    const { error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update({ unclaimed_reward: newUnclaimed })
      .eq('id', user_id);

    if (updateError) {
      logger.error('Error updating unclaimed reward:', updateError);
      return res.status(500).json({
        error: 'Failed to update unclaimed reward'
      });
    }

    res.json({
      success: true,
      message: 'Unclaimed reward updated!',
      data: {
        user_id,
        new_unclaimed_reward: newUnclaimed
      }
    });
  } catch (error: any) {
    logger.error('Unexpected error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

export default router;
