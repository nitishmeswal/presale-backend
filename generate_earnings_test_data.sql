-- 🎯 Earnings Test Data Generation Script
-- Creates 1 month + 1 week of earnings data for all earning types
-- User: cd85351b-096e-4dc4-bf98-e96a4eca3e16

-- Variables (replace with your actual user_id if different)
DO $$
DECLARE
    test_user_id UUID := 'cd85351b-096e-4dc4-bf98-e96a4eca3e16';
    start_date TIMESTAMP := NOW() - INTERVAL '5 weeks';
    current_date_iter TIMESTAMP;
    day_counter INTEGER := 0;
BEGIN
    -- Clear existing test data for this user
    DELETE FROM earnings WHERE user_id = test_user_id;
    DELETE FROM earnings_history WHERE user_id = test_user_id;

    -- Generate daily earnings for 5 weeks (1 month + 1 week)
    WHILE day_counter < 35 LOOP
        current_date_iter := start_date + (day_counter * INTERVAL '1 day');
        
        -- Daily Task Completions (2-6 tasks per day)
        FOR i IN 1..(2 + (RANDOM() * 4)::INTEGER) LOOP
            INSERT INTO earnings (
                user_id, amount, earning_type, reward_type, 
                description, is_claimed, created_at, metadata
            ) VALUES (
                test_user_id,
                65 + (RANDOM() * 25)::NUMERIC, -- 65-90 NLOV per task
                'other',
                'task_completion',
                CASE (RANDOM() * 4)::INTEGER
                    WHEN 0 THEN 'Completed text generation task'
                    WHEN 1 THEN 'Completed image processing task' 
                    WHEN 2 THEN 'Completed video analysis task'
                    ELSE 'Completed 3D rendering task'
                END,
                (RANDOM() > 0.7), -- 30% claimed
                current_date_iter + (RANDOM() * INTERVAL '16 hours') + INTERVAL '6 hours',
                jsonb_build_object(
                    'task_type', CASE (RANDOM() * 4)::INTEGER
                        WHEN 0 THEN 'text' WHEN 1 THEN 'image' 
                        WHEN 2 THEN 'video' ELSE '3d' END,
                    'hardware_tier', CASE (RANDOM() * 3)::INTEGER
                        WHEN 0 THEN 'webgpu' WHEN 1 THEN 'wasm' ELSE 'webgl' END
                )
            );
        END LOOP;

        -- Daily Check-in (once per day, 80% chance)
        IF RANDOM() > 0.2 THEN
            INSERT INTO earnings (
                user_id, amount, earning_type, reward_type,
                description, is_claimed, created_at
            ) VALUES (
                test_user_id, 10, 'other', 'daily_checkin',
                'Daily check-in bonus', true,
                current_date_iter + INTERVAL '8 hours'
            );
        END IF;

        -- Referral Earnings (random, 20% chance per day)
        IF RANDOM() > 0.8 THEN
            INSERT INTO earnings (
                user_id, amount, earning_type, reward_type,
                description, is_claimed, created_at, metadata
            ) VALUES (
                test_user_id,
                CASE (RANDOM() * 3)::INTEGER 
                    WHEN 0 THEN 50 WHEN 1 THEN 75 ELSE 100 END,
                'other',
                CASE (RANDOM() * 3)::INTEGER
                    WHEN 0 THEN 'referral_tier_1'
                    WHEN 1 THEN 'referral_tier_2' 
                    ELSE 'referral_tier_3'
                END,
                'Referral tier reward',
                (RANDOM() > 0.5),
                current_date_iter + (RANDOM() * INTERVAL '20 hours'),
                jsonb_build_object('referral_level', ((RANDOM() * 3)::INTEGER + 1))
            );
        END IF;

        day_counter := day_counter + 1;
    END LOOP;

    -- Add some special bonus earnings (weekly)
    FOR week_num IN 1..5 LOOP
        INSERT INTO earnings (
            user_id, amount, earning_type, reward_type,
            description, is_claimed, created_at
        ) VALUES (
            test_user_id,
            200 + (RANDOM() * 100)::NUMERIC, -- 200-300 bonus
            'other', 'bonus',
            'Weekly performance bonus',
            true,
            start_date + (week_num * INTERVAL '1 week') - INTERVAL '1 day'
        );
    END LOOP;

    -- Update earnings_history table
    INSERT INTO earnings_history (user_id, total_amount, task_count, timestamp)
    SELECT 
        test_user_id,
        COALESCE(SUM(amount), 0) as total_amount,
        COUNT(*) FILTER (WHERE reward_type = 'task_completion') as task_count,
        NOW()
    FROM earnings 
    WHERE user_id = test_user_id
    ON CONFLICT (user_id) DO UPDATE SET
        total_amount = EXCLUDED.total_amount,
        task_count = EXCLUDED.task_count,
        timestamp = EXCLUDED.timestamp;

    -- Print summary
    RAISE NOTICE '✅ Generated earnings data for user: %', test_user_id;
    RAISE NOTICE '📊 Total records: % earnings', 
        (SELECT COUNT(*) FROM earnings WHERE user_id = test_user_id);
    RAISE NOTICE '💰 Total amount: % NLOV', 
        (SELECT ROUND(SUM(amount), 2) FROM earnings WHERE user_id = test_user_id);
    RAISE NOTICE '📈 Date range: % to %', 
        (SELECT MIN(created_at)::DATE FROM earnings WHERE user_id = test_user_id),
        (SELECT MAX(created_at)::DATE FROM earnings WHERE user_id = test_user_id);
        
END $$;

-- Verification Queries
SELECT 
    reward_type,
    COUNT(*) as count,
    ROUND(AVG(amount), 2) as avg_amount,
    ROUND(SUM(amount), 2) as total_amount
FROM earnings 
WHERE user_id = 'cd85351b-096e-4dc4-bf98-e96a4eca3e16'
GROUP BY reward_type
ORDER BY total_amount DESC;

-- Weekly earnings summary
SELECT 
    DATE_TRUNC('week', created_at) as week_start,
    COUNT(*) as transactions,
    ROUND(SUM(amount), 2) as total_earnings,
    COUNT(*) FILTER (WHERE reward_type = 'task_completion') as tasks,
    COUNT(*) FILTER (WHERE reward_type = 'daily_checkin') as checkins,
    COUNT(*) FILTER (WHERE reward_type LIKE 'referral%') as referrals
FROM earnings 
WHERE user_id = 'cd85351b-096e-4dc4-bf98-e96a4eca3e16'
GROUP BY DATE_TRUNC('week', created_at)
ORDER BY week_start;
