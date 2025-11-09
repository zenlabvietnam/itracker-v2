-- Enable the pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Drop the function if it exists to allow for return type changes
DROP FUNCTION IF EXISTS public.update_goals_current_amount_debug();

-- Debug Function to update current_amount for all goals and return debug info
CREATE OR REPLACE FUNCTION public.update_goals_current_amount_debug()
RETURNS TABLE (
    goal_id UUID,
    goal_name TEXT,
    old_current_amount NUMERIC,
    new_calculated_current_amount NUMERIC,
    return_target_amount NUMERIC, -- Column name in the returned table
    allocated_per_second NUMERIC,
    time_elapsed_seconds NUMERIC,
    total_amount_to_add NUMERIC,
    debug_message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    goal_record RECORD;
    income_source_record RECORD;
    seconds_elapsed NUMERIC;
    per_second_allocation_rate NUMERIC;
    total_user_active_monthly_income NUMERIC;
    current_time TIMESTAMP WITH TIME ZONE := now();
    seconds_in_day NUMERIC := 24 * 60 * 60;
    average_days_in_month NUMERIC := 365.25 / 12;
    average_days_in_year NUMERIC := 365.25;

    -- Variables for RETURN NEXT - MUST MATCH RETURNS TABLE COLUMN NAMES
    goal_id UUID;
    goal_name TEXT;
    old_current_amount NUMERIC;
    new_calculated_current_amount NUMERIC;
    return_target_amount NUMERIC;
    allocated_per_second NUMERIC;
    time_elapsed_seconds NUMERIC;
    total_amount_to_add NUMERIC;
    debug_message TEXT;
BEGIN
    FOR goal_record IN
        SELECT *
        FROM public.goals
        WHERE current_amount < target_amount
    LOOP
        -- Initialize return variables for this goal
        goal_id := goal_record.id;
        goal_name := goal_record.name;
        old_current_amount := goal_record.current_amount;
        return_target_amount := goal_record.target_amount;
        new_calculated_current_amount := goal_record.current_amount;
        allocated_per_second := 0;
        time_elapsed_seconds := 0;
        total_amount_to_add := 0;
        debug_message := 'Processed';

        -- Calculate seconds elapsed since last update
        seconds_elapsed := EXTRACT(EPOCH FROM current_time) - EXTRACT(EPOCH FROM goal_record.last_current_amount_update);
        time_elapsed_seconds := seconds_elapsed;

        -- Skip if no time has elapsed or goal is already completed
        IF seconds_elapsed <= 0 THEN
            debug_message := 'Skipped: seconds_elapsed <= 0';
            RETURN NEXT;
            CONTINUE;
        END IF;

        per_second_allocation_rate := 0;

        IF goal_record.allocation_type = 'PERCENT_TOTAL' THEN
            -- Calculate total active monthly income for the current user
            SELECT COALESCE(SUM(
                CASE isrc.cycle
                    WHEN 'daily' THEN isrc.amount * (average_days_in_year / 12)
                    WHEN 'weekly' THEN isrc.amount * (52 / 12)
                    WHEN 'monthly' THEN isrc.amount
                    WHEN 'yearly' THEN isrc.amount / 12
                    ELSE 0
                END
            ), 0)
            INTO total_user_active_monthly_income
            FROM public.income_sources isrc
            WHERE isrc.user_id = goal_record.user_id
              AND isrc.status = 'active';

            IF total_user_active_monthly_income > 0 THEN
                per_second_allocation_rate := (total_user_active_monthly_income * goal_record.allocation_value / 100) / (average_days_in_month * seconds_in_day);
            ELSE
                 debug_message := debug_message || '; Warning: total_user_active_monthly_income is 0 for PERCENT_TOTAL';
            END IF;
        ELSIF goal_record.allocation_type = 'PERCENT_SOURCE' AND goal_record.source_income_id IS NOT NULL THEN
            -- Fetch specific income source details for the current user
            SELECT isrc.amount, isrc.cycle
            INTO income_source_record
            FROM public.income_sources isrc
            WHERE isrc.id = goal_record.source_income_id AND isrc.user_id = goal_record.user_id;

            IF FOUND THEN
                DECLARE
                    source_monthly_amount NUMERIC;
                BEGIN
                    source_monthly_amount := CASE income_source_record.cycle
                        WHEN 'daily' THEN income_source_record.amount * (average_days_in_year / 12)
                        WHEN 'weekly' THEN income_source_record.amount * (52 / 12)
                        WHEN 'monthly' THEN income_source_record.amount
                        WHEN 'yearly' THEN income_source_record.amount / 12
                        ELSE 0
                    END;
                    per_second_allocation_rate := (source_monthly_amount * goal_record.allocation_value / 100) / (average_days_in_month * seconds_in_day);
                END;
            ELSE
                 debug_message := debug_message || '; Warning: Source income not found for PERCENT_SOURCE';
            END IF;
        ELSIF goal_record.allocation_type = 'FIXED_TOTAL' OR goal_record.allocation_type = 'FIXED_SOURCE' THEN
            DECLARE
                fixed_monthly_amount NUMERIC;
            BEGIN
                fixed_monthly_amount := CASE goal_record.allocation_cycle
                    WHEN 'daily' THEN goal_record.allocation_value * (average_days_in_year / 12)
                    WHEN 'weekly' THEN goal_record.allocation_value * (52 / 12)
                    WHEN 'monthly' THEN goal_record.allocation_value
                    WHEN 'yearly' THEN goal_record.allocation_value / 12
                    ELSE 0
                END;
                per_second_allocation_rate := fixed_monthly_amount / (average_days_in_month * seconds_in_day);
            END;
        END IF;

        allocated_per_second := per_second_allocation_rate;
        total_amount_to_add := per_second_allocation_rate * seconds_elapsed;

        -- Update goal
        -- Only update if amount_to_add is positive and per_second_allocation_rate is > 0
        IF total_amount_to_add > 0 AND per_second_allocation_rate > 0 THEN
            new_calculated_current_amount := LEAST(goal_record.current_amount + total_amount_to_add, goal_record.target_amount);

            -- NO ACTUAL UPDATE HERE IN DEBUG VERSION
            -- UPDATE public.goals
            -- SET
            --     current_amount = new_calculated_current_amount,
            --     last_current_amount_update = current_time
            -- WHERE id = goal_record.id;
             debug_message := debug_message || '; Would update goal successfully';
        ELSE
            debug_message := debug_message || '; Skipped Update: amount_to_add is 0 or per_second_allocation_rate is 0';
            new_calculated_current_amount := goal_record.current_amount; -- No change
        END IF;

        RETURN NEXT; -- Return the collected debug row
    END LOOP;
END;
$$;

-- Schedule the cron job to run daily at midnight UTC
-- COMMENTING OUT THE SCHEDULE FOR NOW TO AVOID AUTOMATIC RUNS DURING DEBUGGING
-- SELECT cron.schedule(
--     'update-goals-current-amount-daily', -- unique name of the cron job
--     '0 0 * * *', -- every day at midnight (UTC)
--     'SELECT public.update_goals_current_amount();'
-- );