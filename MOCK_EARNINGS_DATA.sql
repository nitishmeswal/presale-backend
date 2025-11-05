-- =====================================================
-- MOCK EARNINGS DATA FOR TESTING
-- =====================================================
-- This creates realistic earnings data spread over the past year
-- for testing the earnings chart and recent transactions

-- REPLACE 'YOUR_USER_ID_HERE' with your actual user ID from user_profiles table

-- =====================================================
-- STEP 1: Insert mock earnings (past year, month, day)
-- =====================================================

-- Daily Task Completions (last 30 days)
INSERT INTO earnings (user_id, amount, earning_type, reward_type, is_claimed, created_at) VALUES
-- Today
('YOUR_USER_ID_HERE', 15.50, 'task_completion', 'task', true, (NOW() AT TIME ZONE 'UTC') - INTERVAL '0 hours'),
('YOUR_USER_ID_HERE', 12.25, 'task_completion', 'task', true, (NOW() AT TIME ZONE 'UTC') - INTERVAL '2 hours'),
('YOUR_USER_ID_HERE', 8.75, 'task_completion', 'task', false, (NOW() AT TIME ZONE 'UTC') - INTERVAL '4 hours'),

-- Yesterday
('YOUR_USER_ID_HERE', 18.00, 'task_completion', 'task', true, NOW() - INTERVAL '1 day'),
('YOUR_USER_ID_HERE', 14.50, 'task_completion', 'task', true, NOW() - INTERVAL '1 day' - INTERVAL '3 hours'),
('YOUR_USER_ID_HERE', 10.25, 'daily_checkin', 'daily_checkin', true, NOW() - INTERVAL '1 day' - INTERVAL '6 hours'),

-- 2 days ago
('YOUR_USER_ID_HERE', 22.00, 'task_completion', 'task', true, NOW() - INTERVAL '2 days'),
('YOUR_USER_ID_HERE', 16.75, 'task_completion', 'task', true, NOW() - INTERVAL '2 days' - INTERVAL '4 hours'),
('YOUR_USER_ID_HERE', 5.50, 'referral_tier_1', 'referral', true, NOW() - INTERVAL '2 days' - INTERVAL '8 hours'),

-- 3 days ago
('YOUR_USER_ID_HERE', 19.50, 'task_completion', 'task', true, NOW() - INTERVAL '3 days'),
('YOUR_USER_ID_HERE', 13.25, 'task_completion', 'task', true, NOW() - INTERVAL '3 days' - INTERVAL '5 hours'),
('YOUR_USER_ID_HERE', 10.25, 'daily_checkin', 'daily_checkin', true, NOW() - INTERVAL '3 days' - INTERVAL '10 hours'),

-- 4 days ago
('YOUR_USER_ID_HERE', 25.00, 'task_completion', 'task', true, NOW() - INTERVAL '4 days'),
('YOUR_USER_ID_HERE', 15.50, 'task_completion', 'task', true, NOW() - INTERVAL '4 days' - INTERVAL '3 hours'),
('YOUR_USER_ID_HERE', 8.00, 'referral_tier_2', 'referral', true, NOW() - INTERVAL '4 days' - INTERVAL '7 hours'),

-- 5 days ago
('YOUR_USER_ID_HERE', 20.75, 'task_completion', 'task', true, NOW() - INTERVAL '5 days'),
('YOUR_USER_ID_HERE', 12.50, 'task_completion', 'task', true, NOW() - INTERVAL '5 days' - INTERVAL '4 hours'),
('YOUR_USER_ID_HERE', 10.25, 'daily_checkin', 'daily_checkin', true, NOW() - INTERVAL '5 days' - INTERVAL '8 hours'),
('YOUR_USER_ID_HERE', 50.00, 'bonus', 'bonus', true, NOW() - INTERVAL '5 days' - INTERVAL '12 hours'),

-- Last 7 days (week ago)
('YOUR_USER_ID_HERE', 17.50, 'task_completion', 'task', true, NOW() - INTERVAL '7 days'),
('YOUR_USER_ID_HERE', 14.25, 'task_completion', 'task', true, NOW() - INTERVAL '7 days' - INTERVAL '5 hours'),
('YOUR_USER_ID_HERE', 10.25, 'daily_checkin', 'daily_checkin', true, NOW() - INTERVAL '7 days' - INTERVAL '9 hours'),

-- Last 14 days (2 weeks ago)
('YOUR_USER_ID_HERE', 23.00, 'task_completion', 'task', true, NOW() - INTERVAL '14 days'),
('YOUR_USER_ID_HERE', 18.50, 'task_completion', 'task', true, NOW() - INTERVAL '14 days' - INTERVAL '3 hours'),
('YOUR_USER_ID_HERE', 12.00, 'referral_tier_1', 'referral', true, NOW() - INTERVAL '14 days' - INTERVAL '6 hours'),
('YOUR_USER_ID_HERE', 10.25, 'daily_checkin', 'daily_checkin', true, NOW() - INTERVAL '14 days' - INTERVAL '10 hours'),

-- Last 21 days (3 weeks ago)
('YOUR_USER_ID_HERE', 21.50, 'task_completion', 'task', true, NOW() - INTERVAL '21 days'),
('YOUR_USER_ID_HERE', 16.25, 'task_completion', 'task', true, NOW() - INTERVAL '21 days' - INTERVAL '4 hours'),
('YOUR_USER_ID_HERE', 10.25, 'daily_checkin', 'daily_checkin', true, NOW() - INTERVAL '21 days' - INTERVAL '8 hours'),

-- Last 30 days (1 month ago)
('YOUR_USER_ID_HERE', 19.00, 'task_completion', 'task', true, NOW() - INTERVAL '30 days'),
('YOUR_USER_ID_HERE', 15.50, 'task_completion', 'task', true, NOW() - INTERVAL '30 days' - INTERVAL '5 hours'),
('YOUR_USER_ID_HERE', 10.25, 'daily_checkin', 'daily_checkin', true, NOW() - INTERVAL '30 days' - INTERVAL '9 hours'),
('YOUR_USER_ID_HERE', 100.00, 'bonus', 'bonus', true, NOW() - INTERVAL '30 days' - INTERVAL '12 hours'),

-- Last 60 days (2 months ago)
('YOUR_USER_ID_HERE', 24.50, 'task_completion', 'task', true, NOW() - INTERVAL '60 days'),
('YOUR_USER_ID_HERE', 18.25, 'task_completion', 'task', true, NOW() - INTERVAL '60 days' - INTERVAL '6 hours'),
('YOUR_USER_ID_HERE', 15.00, 'referral_tier_3', 'referral', true, NOW() - INTERVAL '60 days' - INTERVAL '10 hours'),

-- Last 90 days (3 months ago)
('YOUR_USER_ID_HERE', 22.00, 'task_completion', 'task', true, NOW() - INTERVAL '90 days'),
('YOUR_USER_ID_HERE', 17.50, 'task_completion', 'task', true, NOW() - INTERVAL '90 days' - INTERVAL '4 hours'),
('YOUR_USER_ID_HERE', 10.25, 'daily_checkin', 'daily_checkin', true, NOW() - INTERVAL '90 days' - INTERVAL '8 hours'),

-- Last 180 days (6 months ago)
('YOUR_USER_ID_HERE', 25.50, 'task_completion', 'task', true, NOW() - INTERVAL '180 days'),
('YOUR_USER_ID_HERE', 19.25, 'task_completion', 'task', true, NOW() - INTERVAL '180 days' - INTERVAL '5 hours'),
('YOUR_USER_ID_HERE', 20.00, 'referral_tier_2', 'referral', true, NOW() - INTERVAL '180 days' - INTERVAL '9 hours'),

-- Last 365 days (1 year ago)
('YOUR_USER_ID_HERE', 28.00, 'task_completion', 'task', true, NOW() - INTERVAL '365 days'),
('YOUR_USER_ID_HERE', 21.50, 'task_completion', 'task', true, NOW() - INTERVAL '365 days' - INTERVAL '6 hours'),
('YOUR_USER_ID_HERE', 200.00, 'bonus', 'bonus', true, NOW() - INTERVAL '365 days' - INTERVAL '12 hours');

-- =====================================================
-- STEP 2: Update earnings_history with total
-- =====================================================

-- Calculate total from all claimed earnings
INSERT INTO earnings_history (user_id, total_amount, timestamp, payout_status)
SELECT 
  'YOUR_USER_ID_HERE',
  SUM(amount),
  NOW(),
  'pending'
FROM earnings
WHERE user_id = 'YOUR_USER_ID_HERE' AND is_claimed = true
ON CONFLICT (user_id) 
DO UPDATE SET 
  total_amount = EXCLUDED.total_amount,
  timestamp = EXCLUDED.timestamp;

-- =====================================================
-- STEP 3: Update user_profiles with stats
-- =====================================================

-- Update unclaimed rewards (sum of unclaimed earnings)
UPDATE user_profiles
SET unclaimed_reward = (
  SELECT COALESCE(SUM(amount), 0)
  FROM earnings
  WHERE user_id = 'YOUR_USER_ID_HERE' AND is_claimed = false
)
WHERE id = 'YOUR_USER_ID_HERE';

-- Update task completed count (count of task completions)
UPDATE user_profiles
SET task_completed = (
  SELECT COUNT(*)
  FROM earnings
  WHERE user_id = 'YOUR_USER_ID_HERE' 
    AND (earning_type = 'task_completion' OR reward_type = 'task')
)
WHERE id = 'YOUR_USER_ID_HERE';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check earnings inserted
SELECT 
  COUNT(*) as total_earnings,
  SUM(amount) as total_amount,
  SUM(CASE WHEN is_claimed THEN amount ELSE 0 END) as claimed_amount,
  SUM(CASE WHEN NOT is_claimed THEN amount ELSE 0 END) as unclaimed_amount
FROM earnings
WHERE user_id = 'YOUR_USER_ID_HERE';

-- Check earnings by type
SELECT 
  COALESCE(earning_type, reward_type) as type,
  COUNT(*) as count,
  SUM(amount) as total
FROM earnings
WHERE user_id = 'YOUR_USER_ID_HERE'
GROUP BY COALESCE(earning_type, reward_type)
ORDER BY total DESC;

-- Check earnings_history
SELECT * FROM earnings_history WHERE user_id = 'YOUR_USER_ID_HERE';

-- Check user profile stats
SELECT 
  user_name,
  task_completed,
  unclaimed_reward,
  total_balance
FROM user_profiles
WHERE id = 'YOUR_USER_ID_HERE';

-- =====================================================
-- QUICK REFERENCE: EARNING TYPES IN YOUR APP
-- =====================================================
-- earning_type / reward_type values:
-- - 'task_completion' / 'task'      : Task rewards
-- - 'daily_checkin'                 : Daily check-in bonus
-- - 'referral_tier_1' / 'referral'  : Direct referral rewards (tier 1)
-- - 'referral_tier_2' / 'referral'  : Second-level referral rewards (tier 2)
-- - 'referral_tier_3' / 'referral'  : Third-level referral rewards (tier 3)
-- - 'bonus'                         : Special bonuses/promotions
