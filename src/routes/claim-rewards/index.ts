import { Router } from 'express';
import { supabaseAdmin } from '../../config/database';
import logger from '../../utils/logger';

const router = Router();

// POST /api/v1/claim-rewards - Claim rewards (migrated from edge function)
router.post('/', async (req, res) => {
  try {
    const { reward_type, amount, user_id } = req.body;

    // Validate required parameters
    if (!reward_type || !amount || !user_id) {
      return res.status(400).json({
        error: 'Missing required parameters: reward_type, amount, user_id'
      });
    }

    // Validate amount is positive
    if (amount <= 0) {
      return res.status(400).json({
        error: 'Amount must be greater than 0'
      });
    }

    // Add earnings entry
    const { data: earningsData, error: earningsError } = await supabaseAdmin
      .from('earnings')
      .insert({
        user_id: user_id,
        amount: amount,
        earning_type: reward_type
      })
      .select()
      .single();

    if (earningsError) {
      logger.error('Error inserting earnings:', earningsError);
      return res.status(500).json({
        error: 'Failed to create earnings entry'
      });
    }

    // Get current total for the user (if exists)
    const { data: existingHistory } = await supabaseAdmin
      .from('earnings_history')
      .select('total_amount')
      .eq('user_id', user_id)
      .maybeSingle();

    const currentTotal = existingHistory ? parseFloat(existingHistory.total_amount) : 0;
    const newTotal = currentTotal + amount;

    // Upsert earnings history
    const { data: historyData, error: historyError } = await supabaseAdmin
      .from('earnings_history')
      .upsert({
        user_id: user_id,
        total_amount: newTotal,
        timestamp: new Date().toISOString(),
        payout_status: 'pending'
      }, {
        onConflict: 'user_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (historyError) {
      logger.error('Error updating earnings history:', historyError);
      // Rollback: Delete the earnings entry we just created
      await supabaseAdmin.from('earnings').delete().eq('id', earningsData.id);
      return res.status(500).json({
        error: 'Failed to update earnings history'
      });
    }

    res.json({
      success: true,
      message: 'Reward claimed successfully',
      data: {
        earnings_id: earningsData.id,
        amount_added: amount,
        new_total: historyData.total_amount,
        reward_type: reward_type,
        timestamp: earningsData.created_at
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
