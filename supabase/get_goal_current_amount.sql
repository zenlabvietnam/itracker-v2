CREATE OR REPLACE FUNCTION public.get_goal_current_amount(p_goal_id UUID)
RETURNS TABLE (
    goal_id UUID,
    calculated_current_amount NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_goal_record public.goals%ROWTYPE;
    v_monthly_contribution NUMERIC := 0;
    v_total_accumulated NUMERIC := 0;
    v_months_elapsed NUMERIC;
    v_days_in_current_month NUMERIC;
    v_days_elapsed_in_current_month NUMERIC;
    v_current_date DATE := CURRENT_DATE;
    v_start_date DATE;
    v_average_days_in_month CONSTANT NUMERIC := 30.4375; -- Average days in a month
    v_average_days_in_year CONSTANT NUMERIC := 365.25;   -- Average days in a year
    v_seconds_in_day CONSTANT NUMERIC := 86400;
BEGIN
    -- Retrieve goal details
    SELECT * INTO v_goal_record FROM public.goals WHERE id = p_goal_id;

    IF v_goal_record IS NULL THEN
        RETURN; -- Goal not found
    END IF;

    -- Determine the start date for accumulation (e.g., goal creation date)
    v_start_date := v_goal_record.created_at::DATE;

    -- Calculate the number of full months elapsed since creation
    v_months_elapsed := (EXTRACT(YEAR FROM v_current_date) - EXTRACT(YEAR FROM v_start_date)) * 12 +
                        (EXTRACT(MONTH FROM v_current_date) - EXTRACT(MONTH FROM v_start_date));

    -- Adjust if current day is before start day in the current month
    IF EXTRACT(DAY FROM v_current_date) < EXTRACT(DAY FROM v_start_date) THEN
        v_months_elapsed := v_months_elapsed - 1;
    END IF;

    -- Ensure months_elapsed is not negative
    IF v_months_elapsed < 0 THEN
        v_months_elapsed := 0;
    END IF;

    -- Calculate current effective monthly contribution based on current data
    IF v_goal_record.allocation_type = 'FIXED_TOTAL' OR v_goal_record.allocation_type = 'FIXED_SOURCE' THEN
        v_monthly_contribution := v_goal_record.allocation_value;
        -- Convert to monthly if allocation_cycle is not monthly
        IF v_goal_record.allocation_cycle = 'daily' THEN
            v_monthly_contribution := v_monthly_contribution * v_average_days_in_month;
        ELSIF v_goal_record.allocation_cycle = 'weekly' THEN
            v_monthly_contribution := v_monthly_contribution * (v_average_days_in_month / 7);
        ELSIF v_goal_record.allocation_cycle = 'yearly' THEN
            v_monthly_contribution := v_monthly_contribution / 12;
        END IF;
    ELSIF v_goal_record.allocation_type = 'PERCENT_TOTAL' THEN
        -- Sum all active income sources for the user, converted to monthly
        SELECT COALESCE(SUM(
            CASE
                WHEN isrc.cycle = 'daily' THEN isrc.amount * v_average_days_in_month
                WHEN isrc.cycle = 'weekly' THEN isrc.amount * (v_average_days_in_month / 7)
                WHEN isrc.cycle = 'monthly' THEN isrc.amount
                WHEN isrc.cycle = 'yearly' THEN isrc.amount / 12
                ELSE 0
            END
        ), 0)
        INTO v_monthly_contribution
        FROM public.income_sources isrc
        WHERE isrc.user_id = v_goal_record.user_id AND isrc.status = 'active';

        v_monthly_contribution := v_monthly_contribution * (v_goal_record.allocation_value / 100);

    ELSIF v_goal_record.allocation_type = 'PERCENT_SOURCE' THEN
        -- Get specific linked income source amount, converted to monthly
        SELECT COALESCE(SUM(
            CASE
                WHEN isrc.cycle = 'daily' THEN isrc.amount * v_average_days_in_month
                WHEN isrc.cycle = 'weekly' THEN isrc.amount * (v_average_days_in_month / 7)
                WHEN isrc.cycle = 'monthly' THEN isrc.amount
                WHEN isrc.cycle = 'yearly' THEN isrc.amount / 12
                ELSE 0
            END
        ), 0)
        INTO v_monthly_contribution
        FROM public.income_sources isrc
        WHERE isrc.id = v_goal_record.source_income_id AND isrc.status = 'active';

        v_monthly_contribution := v_monthly_contribution * (v_goal_record.allocation_value / 100);
    END IF;

    -- Calculate total accumulated from full months
    v_total_accumulated := v_monthly_contribution * v_months_elapsed;

    -- Calculate contribution for the current partial month
    v_days_in_current_month := EXTRACT(DAY FROM (DATE_TRUNC('MONTH', v_current_date) + INTERVAL '1 MONTH - 1 DAY'));
    v_days_elapsed_in_current_month := EXTRACT(DAY FROM v_current_date) - EXTRACT(DAY FROM v_start_date) + 1; -- Assuming start_date is the first day of accumulation

    IF v_days_elapsed_in_current_month > 0 AND v_days_in_current_month > 0 THEN
        v_total_accumulated := v_total_accumulated + (v_monthly_contribution / v_days_in_current_month * v_days_elapsed_in_current_month);
    END IF;

    -- Cap at target_amount
    calculated_current_amount := LEAST(v_total_accumulated, v_goal_record.target_amount);
    goal_id := p_goal_id;

    RETURN NEXT;
END;
$$;