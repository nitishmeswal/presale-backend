-- =====================================================
-- MOCK EARNINGS DATA - FIXED TIMESTAMPS
-- =====================================================
-- This version uses explicit timestamps to ensure proper date distribution
-- User ID: 8f5d39d6-021e-4790-967e-b80b78c13d47

-- =====================================================
-- STEP 1: Insert earnings with EXPLICIT timestamps
-- =====================================================

INSERT INTO earnings (user_id, amount, earning_type, reward_type, is_claimed, created_at) VALUES
-- Today (various times)
('8f5d39d6-021e-4790-967e-b80b78c13d47', 15.50, 'task_completion', 'task', true, CURRENT_TIMESTAMP - INTERVAL '2 hours'),
('8f5d39d6-021e-4790-967e-b80b78c13d47', 12.25, 'task_completion', 'task', true, CURRENT_TIMESTAMP - INTERVAL '5 hours'),
('8f5d39d6-021e-4790-967e-b80b78c13d47', 8.75, 'task_completion', 'task', false, CURRENT_TIMESTAMP - INTERVAL '8 hours'),

-- Yesterday
('8f5d39d6-021e-4790-967e-b80b78c13d47', 18.00, 'task_completion', 'task', true, CURRENT_TIMESTAMP - INTERVAL '1 day 3 hours'),
('8f5d39d6-021e-4790-967e-b80b78c13d47', 14.50, 'task_completion', 'task', true, CURRENT_TIMESTAMP - INTERVAL '1 day 6 hours'),
('8f5d39d6-021e-4790-967e-b80b78c13d47', 10.25, 'daily_checkin', 'daily_checkin', true, CURRENT_TIMESTAMP - INTERVAL '1 day 10 hours'),

-- 2 days ago
('8f5d39d6-021e-4790-967e-b80b78c13d47', 22.00, 'task_completion', 'task', true, CURRENT_TIMESTAMP - INTERVAL '2 days 2 hours'),
('8f5d39d6-021e-4790-967e-b80b78c13d47', 16.75, 'task_completion', 'task', true, CURRENT_TIMESTAMP - INTERVAL '2 days 5 hours'),
('8f5d39d6-021e-4790-967e-b80b78c13d47', 5.50, 'referral_tier_1', 'referral', true, CURRENT_TIMESTAMP - INTERVAL '2 days 9 hours'),

-- 3 days ago
('8f5d39d6-021e-4790-967e-b80b78c13d47', 19.50, 'task_completion', 'task', true, CURRENT_TIMESTAMP - INTERVAL '3 days 4 hours'),
('8f5d39d6-021e-4790-967e-b80b78c13d47', 13.25, 'task_completion', 'task', true, CURRENT_TIMESTAMP - INTERVAL '3 days 7 hours'),
('8f5d39d6-021e-4790-967e-b80b78c13d47', 10.25, 'daily_checkin', 'daily_checkin', true, CURRENT_TIMESTAMP - INTERVAL '3 days 11 hours'),

-- 4 days ago
('8f5d39d6-021e-4790-967e-b80b78c13d47', 25.00, 'task_completion', 'task', true, CURRENT_TIMESTAMP - INTERVAL '4 days 3 hours'),
('8f5d39d6-021e-4790-967e-b80b78c13d47', 15.50, 'task_completion', 'task', true, CURRENT_TIMESTAMP - INTERVAL '4 days 6 hours'),
('8f5d39d6-021e-4790-967e-b80b78c13d47', 8.00, 'referral_tier_2', 'referral', true, CURRENT_TIMESTAMP - INTERVAL '4 days 10 hours'),

-- 5 days ago
('8f5d39d6-021e-4790-967e-b80b78c13d47', 20.75, 'task_completion', 'task', true, CURRENT_TIMESTAMP - INTERVAL '5 days 2 hours'),
('8f5d39d6-021e-4790-967e-b80b78c13d47', 12.50, 'task_completion', 'task', true, CURRENT_TIMESTAMP - INTERVAL '5 days 5 hours'),
('8f5d39d6-021e-4790-967e-b80b78c13d47', 10.25, 'daily_checkin', 'daily_checkin', true, CURRENT_TIMESTAMP - INTERVAL '5 days 9 hours'),
('8f5d39d6-021e-4790-967e-b80b78c13d47', 50.00, 'bonus', 'bonus', true, CURRENT_TIMESTAMP - INTERVAL '5 days 12 hours'),

-- 7 days ago
('8f5d39d6-021e-4790-967e-b80b78c13d47', 17.50, 'task_completion', 'task', true, CURRENT_TIMESTAMP - INTERVAL '7 days 4 hours'),
('8f5d39d6-021e-4790-967e-b80b78c13d47', 14.25, 'task_completion', 'task', true, CURRENT_TIMESTAMP - INTERVAL '7 days 8 hours'),
('8f5d39d6-021e-4790-967e-b80b78c13d47', 10.25, 'daily_checkin', 'daily_checkin', true, CURRENT_TIMESTAMP - INTERVAL '7 days 12 hours'),

-- 10 days ago
('8f5d39d6-021e-4790-967e-b80b78c13d47', 21.00, 'task_completion', 'task', true, CURRENT_TIMESTAMP - INTERVAL '10 days 3 hours'),
('8f5d39d6-021e-4790-967e-b80b78c13d47', 16.50, 'task_completion', 'task', true, CURRENT_TIMESTAMP - INTERVAL '10 days 7 hours'),
('8f5d39d6-021e-4790-967e-b80b78c13d47', 12.00, 'referral_tier_1', 'referral', true, CURRENT_TIMESTAMP - INTERVAL '10 days 10 hours'),

-- 14 days ago
('8f5d39d6-021e-4790-967e-b80b78c13d47', 23.00, 'task_completion', 'task', true, CURRENT_TIMESTAMP - INTERVAL '14 days 5 hours'),
('8f5d39d6-021e-4790-967e-b80b78c13d47', 18.50, 'task_completion', 'task', true, CURRENT_TIMESTAMP - INTERVAL '14 days 9 hours'),
('8f5d39d6-021e-4790-967e-b80b78c13d47', 10.25, 'daily_checkin', 'daily_checkin', true, CURRENT_TIMESTAMP - INTERVAL '14 days 13 hours'),

-- 21 days ago
('8f5d39d6-021e-4790-967e-b80b78c13d47', 21.50, 'task_completion', 'task', true, CURRENT_TIMESTAMP - INTERVAL '21 days 6 hours'),
('8f5d39d6-021e-4790-967e-b80b78c13d47', 16.25, 'task_completion', 'task', true, CURRENT_TIMESTAMP - INTERVAL '21 days 10 hours'),
('8f5d39d6-021e-4790-967e-b80b78c13d47', 10.25, 'daily_checkin', 'daily_checkin', true, CURRENT_TIMESTAMP - INTERVAL '21 days 14 hours'),

-- 30 days ago
('8f5d39d6-021e-4790-967e-b80b78c13d47', 19.00, 'task_completion', 'task', true, CURRENT_TIMESTAMP - INTERVAL '30 days 4 hours'),
('8f5d39d6-021e-4790-967e-b80b78c13d47', 15.50, 'task_completion', 'task', true, CURRENT_TIMESTAMP - INTERVAL '30 days 8 hours'),
('8f5d39d6-021e-4790-967e-b80b78c13d47', 10.25, 'daily_checkin', 'daily_checkin', true, CURRENT_TIMESTAMP - INTERVAL '30 days 12 hours'),
('8f5d39d6-021e-4790-967e-b80b78c13d47', 100.00, 'bonus', 'bonus', true, CURRENT_TIMESTAMP - INTERVAL '30 days 16 hours'),

-- 45 days ago
('8f5d39d6-021e-4790-967e-b80b78c13d47', 22.50, 'task_completion', 'task', true, CURRENT_TIMESTAMP - INTERVAL '45 days 5 hours'),
('8f5d39d6-021e-4790-967e-b80b78c13d47', 17.25, 'task_completion', 'task', true, CURRENT_TIMESTAMP - INTERVAL '45 days 9 hours'),
('8f5d39d6-021e-4790-967e-b80b78c13d47', 15.00, 'referral_tier_2', 'referral', true, CURRENT_TIMESTAMP - INTERVAL '45 days 13 hours'),

-- 60 days ago
('8f5d39d6-021e-4790-967e-b80b78c13d47', 24.50, 'task_completion', 'task', true, CURRENT_TIMESTAMP - INTERVAL '60 days 6 hours'),
('8f5d39d6-021e-4790-967e-b80b78c13d47', 18.25, 'task_completion', 'task', true, CURRENT_TIMESTAMP - INTERVAL '60 days 10 hours'),
('8f5d39d6-021e-4790-967e-b80b78c13d47', 20.00, 'referral_tier_3', 'referral', true, CURRENT_TIMESTAMP - INTERVAL '60 days 14 hours'),

-- 90 days ago
('8f5d39d6-021e-4790-967e-b80b78c13d47', 22.00, 'task_completion', 'task', true, CURRENT_TIMESTAMP - INTERVAL '90 days 7 hours'),
('8f5d39d6-021e-4790-967e-b80b78c13d47', 17.50, 'task_completion', 'task', true, CURRENT_TIMESTAMP - INTERVAL '90 days 11 hours'),
('8f5d39d6-021e-4790-967e-b80b78c13d47', 10.25, 'daily_checkin', 'daily_checkin', true, CURRENT_TIMESTAMP - INTERVAL '90 days 15 hours'),

-- 120 days ago
('8f5d39d6-021e-4790-967e-b80b78c13d47', 23.50, 'task_completion', 'task', true, CURRENT_TIMESTAMP - INTERVAL '120 days 8 hours'),
('8f5d39d6-021e-4790-967e-b80b78c13d47', 18.75, 'task_completion', 'task', true, CURRENT_TIMESTAMP - INTERVAL '120 days 12 hours'),
('8f5d39d6-021e-4790-967e-b80b78c13d47', 25.00, 'referral_tier_2', 'referral', true, CURRENT_TIMESTAMP - INTERVAL '120 days 16 hours'),

-- 180 days ago
('8f5d39d6-021e-4790-967e-b80b78c13d47', 25.50, 'task_completion', 'task', true, CURRENT_TIMESTAMP - INTERVAL '180 days 9 hours'),
('8f5d39d6-021e-4790-967e-b80b78c13d47', 19.25, 'task_completion', 'task', true, CURRENT_TIMESTAMP - INTERVAL '180 days 13 hours'),
('8f5d39d6-021e-4790-967e-b80b78c13d47', 30.00, 'referral_tier_3', 'referral', true, CURRENT_TIMESTAMP - INTERVAL '180 days 17 hours'),

-- 365 days ago
('8f5d39d6-021e-4790-967e-b80b78c13d47', 28.00, 'task_completion', 'task', true, CURRENT_TIMESTAMP - INTERVAL '365 days 10 hours'),
('8f5d39d6-021e-4790-967e-b80b78c13d47', 21.50, 'task_completion', 'task', true, CURRENT_TIMESTAMP - INTERVAL '365 days 14 hours'),
('8f5d39d6-021e-4790-967e-b80b78c13d47', 200.00, 'bonus', 'bonus', true, CURRENT_TIMESTAMP - INTERVAL '365 days 18 hours');

-- =====================================================
-- STEP 2: Update earnings_history with total
-- =====================================================

INSERT INTO earnings_history (user_id, total_amount, timestamp, payout_status)
SELECT 
  '8f5d39d6-021e-4790-967e-b80b78c13d47' as user_id,
  COALESCE(SUM(amount), 0) as total_amount,
  CURRENT_TIMESTAMP as timestamp,
  'pending' as payout_status
FROM earnings
WHERE user_id = '8f5d39d6-021e-4790-967e-b80b78c13d47' AND is_claimed = true
ON CONFLICT (user_id) 
DO UPDATE SET 
  total_amount = EXCLUDED.total_amount,
  timestamp = EXCLUDED.timestamp;

-- =====================================================
-- STEP 3: Update user_profiles with task_completed
-- =====================================================

-- Update unclaimed rewards (sum of unclaimed earnings)
UPDATE user_profiles
SET unclaimed_reward = (
  SELECT COALESCE(SUM(amount), 0)
  FROM earnings
  WHERE user_id = '8f5d39d6-021e-4790-967e-b80b78c13d47' AND is_claimed = false
)
WHERE id = '8f5d39d6-021e-4790-967e-b80b78c13d47';

-- Update task_completed field (YES, THIS FIELD EXISTS!)
UPDATE user_profiles
SET task_completed = (
  SELECT COUNT(*)
  FROM earnings
  WHERE user_id = '8f5d39d6-021e-4790-967e-b80b78c13d47' 
    AND (earning_type = 'task_completion' OR reward_type = 'task')
)
WHERE id = '8f5d39d6-021e-4790-967e-b80b78c13d47';

-- =====================================================
-- VERIFICATION: Check your data
-- =====================================================

-- Check earnings with different timestamps
SELECT 
  DATE(created_at) as date,
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM earnings
WHERE user_id = '8f5d39d6-021e-4790-967e-b80b78c13d47'
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 10;

-- Check most recent transactions
SELECT 
  created_at,
  amount,
  COALESCE(earning_type, reward_type) as type,
  is_claimed
FROM earnings
WHERE user_id = '8f5d39d6-021e-4790-967e-b80b78c13d47'
ORDER BY created_at DESC
LIMIT 10;

-- Check user_profiles.task_completed field
SELECT 
  user_name,
  task_completed,    -- ✅ THIS FIELD EXISTS!
  unclaimed_reward,
  total_balance
FROM user_profiles
WHERE id = '8f5d39d6-021e-4790-967e-b80b78c13d47';

-- Check earnings_history
SELECT * FROM earnings_history WHERE user_id = '8f5d39d6-021e-4790-967e-b80b78c13d47';
