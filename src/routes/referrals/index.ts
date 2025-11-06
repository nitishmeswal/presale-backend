import { Router, Request, Response } from 'express';
import { referralService } from '../../services/referralService';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import { verifyReferralValidator } from '../../utils/validators';
import { sendSuccess, sendError } from '../../utils/helpers';

const router = Router();

// Verify referral code - GET with URL param (primary) - PUBLIC ENDPOINT
router.get('/verify/:code', async (req: Request, res: Response) => {
  try {
    const referralCode = req.params.code?.trim().toUpperCase();
    
    console.log('🔍 Verify GET - Received code:', referralCode, 'Length:', referralCode?.length);
    
    if (!referralCode || referralCode.length < 6 || referralCode.length > 10) {
      return sendError(res, 'Invalid referral code', 'Code must be 6-10 characters', 400);
    }
    
    const result = await referralService.verifyReferralCode(referralCode);
    
    if (!result.valid) {
      return sendError(res, 'Invalid referral code', result.message || 'Code not found', 400);
    }
    
    sendSuccess(res, 'Referral code verified', result);
  } catch (error: any) {
    sendError(res, 'Failed to verify referral code', error.message, 400);
  }
});

// Verify referral code - POST with body (alternative) - PUBLIC ENDPOINT
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const referralCode = req.body.referralCode?.trim().toUpperCase();
    
    console.log('🔍 Verify POST - Received code:', referralCode, 'Length:', referralCode?.length);
    console.log('🔍 Full body:', req.body);
    
    if (!referralCode || referralCode.length < 6 || referralCode.length > 10) {
      return sendError(res, 'Invalid referral code', 'Code must be 6-10 characters', 400);
    }
    
    const result = await referralService.verifyReferralCode(referralCode);
    
    if (!result.valid) {
      return sendError(res, 'Invalid referral code', result.message || 'Code not found', 400);
    }
    
    sendSuccess(res, 'Referral code verified', result);
  } catch (error: any) {
    sendError(res, 'Failed to verify referral code', error.message, 400);
  }
});

// Protected routes
router.use(authenticate);

// Get who referred me
router.get('/my-referrer', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId!;
    
    const { data: referral } = await referralService.getMyReferrer(userId);
    
    if (!referral) {
      return sendSuccess(res, 'Not referred by anyone', { referred: false });
    }
    
    sendSuccess(res, 'Referrer information retrieved', {
      referred: true,
      referrer: {
        id: referral.referrer_id,
        username: referral.referrer_username
      }
    });
  } catch (error: any) {
    sendError(res, 'Failed to get referrer information', error.message, 400);
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId!;
    const referrals = await referralService.getReferrals(userId);
    sendSuccess(res, 'Referrals retrieved successfully', referrals);
  } catch (error: any) {
    sendError(res, 'Failed to get referrals', error.message, 400);
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId!;
    const stats = await referralService.getReferralStats(userId);
    sendSuccess(res, 'Referral stats retrieved successfully', stats);
  } catch (error: any) {
    sendError(res, 'Failed to get referral stats', error.message, 400);
  }
});

// Get detailed referral breakdown (only Tier 1 names shown)
router.get('/breakdown', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId!;
    const breakdown = await referralService.getReferralBreakdown(userId);
    sendSuccess(res, 'Referral breakdown retrieved successfully', breakdown);
  } catch (error: any) {
    sendError(res, 'Failed to get referral breakdown', error.message, 400);
  }
});

// Claim pending referral rewards
router.post('/claim', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId!;
    const { earning_type = 'referral' } = req.body;
    const result = await referralService.claimReferralRewards(userId, earning_type);
    sendSuccess(res, result.message, result);
  } catch (error: any) {
    sendError(res, 'Failed to claim referral rewards', error.message, 400);
  }
});

// Use referral code AFTER signup (claim referrer relationship)
router.post('/use-code', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId!;
    const referralCode = req.body.referralCode?.trim().toUpperCase();
    
    console.log('🔗 Use code - User:', userId, 'Code:', referralCode, 'Length:', referralCode?.length);
    
    if (!referralCode || referralCode.length < 6 || referralCode.length > 10) {
      return sendError(res, 'Invalid referral code', 'Code must be 6-10 characters', 400);
    }
    
    const result = await referralService.useReferralCode(userId, referralCode);
    sendSuccess(res, result.message, result);
  } catch (error: any) {
    sendError(res, 'Failed to use referral code', error.message, 400);
  }
});

export default router;
