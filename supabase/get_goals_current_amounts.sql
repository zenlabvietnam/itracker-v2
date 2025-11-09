CREATE OR REPLACE FUNCTION public.get_goals_current_amounts(p_goal_ids UUID[])
RETURNS TABLE (
    goal_id UUID,
    calculated_current_amount NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_date DATE := CURRENT_DATE;
    v_average_days_in_month CONSTANT NUMERIC := 30.4375; -- Average days in a month
    v_average_days_in_year CONSTANT NUMERIC := 365.25;   -- Average days in a year
BEGIN
    RETURN QUERY
    WITH GoalData AS (
        SELECT
            g.id,
            g.user_id,
            g.created_at,
            g.allocation_type,
            g.allocation_value,
            g.allocation_cycle,
            g.target_amount,
            g.source_income_id,
            -- Calculate months_elapsed and days_elapsed_in_current_month
            (EXTRACT(YEAR FROM v_current_date) - EXTRACT(YEAR FROM g.created_at::DATE)) * 12 +
            (EXTRACT(MONTH FROM v_current_date) - EXTRACT(MONTH FROM g.created_at::DATE)) -
            CASE WHEN EXTRACT(DAY FROM v_current_date) < EXTRACT(DAY FROM g.created_at::DATE) THEN 1 ELSE 0 END AS months_elapsed_raw,
            EXTRACT(DAY FROM v_current_date) - EXTRACT(DAY FROM g.created_at::DATE) + 1 AS days_elapsed_in_current_month_raw,
            EXTRACT(DAY FROM (DATE_TRUNC('MONTH', v_current_date) + INTERVAL '1 MONTH - 1 DAY')) AS days_in_current_month
        FROM
            public.goals g
        WHERE
            g.id = ANY(p_goal_ids)
    ),
    CalculatedGoalData AS (
        SELECT
            gd.id,
            gd.user_id,
            gd.created_at,
            gd.allocation_type,
            gd.allocation_value,
            gd.allocation_cycle,
            gd.target_amount,
            gd.source_income_id,
            GREATEST(0, gd.months_elapsed_raw) AS months_elapsed,
            GREATEST(0, gd.days_elapsed_in_current_month_raw) AS days_elapsed_in_current_month,
            gd.days_in_current_month,
            -- Calculate monthly_contribution based on allocation_type
            CASE
                WHEN gd.allocation_type = 'FIXED_TOTAL' OR gd.allocation_type = 'FIXED_SOURCE' THEN
                    gd.allocation_value *
                    CASE
                        WHEN gd.allocation_cycle = 'daily' THEN v_average_days_in_month
                        WHEN gd.allocation_cycle = 'weekly' THEN (v_average_days_in_month / 7)
                        WHEN gd.allocation_cycle = 'monthly' THEN 1
                        WHEN gd.allocation_cycle = 'yearly' THEN (1.0 / 12)
                        ELSE 0
                    END
                WHEN gd.allocation_type = 'PERCENT_TOTAL' THEN
                    (SELECT COALESCE(SUM(
                        CASE
                            WHEN isrc.cycle = 'daily' THEN isrc.amount * v_average_days_in_month
                            WHEN isrc.cycle = 'weekly' THEN isrc.amount * (v_average_days_in_month / 7)
                            WHEN isrc.cycle = 'monthly' THEN isrc.amount
                            WHEN isrc.cycle = 'yearly' THEN isrc.amount / 12
                            ELSE 0
                        END
                    ), 0)
                    FROM public.income_sources isrc
                    WHERE isrc.user_id = gd.user_id AND isrc.status = 'active') * (gd.allocation_value / 100)
                WHEN gd.allocation_type = 'PERCENT_SOURCE' THEN
                    (SELECT COALESCE(SUM(
                        CASE
                            WHEN isrc.cycle = 'daily' THEN isrc.amount * v_average_days_in_month
                            WHEN isrc.cycle = 'weekly' THEN isrc.amount * (v_average_days_in_month / 7)
                            WHEN isrc.cycle = 'monthly' THEN isrc.amount
                            WHEN isrc.cycle = 'yearly' THEN isrc.amount / 12
                            ELSE 0
                        END
                    ), 0)
                    FROM public.income_sources isrc
                    WHERE isrc.id = gd.source_income_id AND isrc.status = 'active') * (gd.allocation_value / 100)
                ELSE 0
            END AS monthly_contribution
        FROM
            GoalData gd
    )
    SELECT
        cgd.id AS goal_id,
        LEAST(
            (cgd.monthly_contribution * cgd.months_elapsed) +
            (CASE
                WHEN cgd.days_elapsed_in_current_month > 0 AND cgd.days_in_current_month > 0
                THEN (cgd.monthly_contribution / cgd.days_in_current_month * cgd.days_elapsed_in_current_month)
                ELSE 0
            END),
            cgd.target_amount
        ) AS calculated_current_amount
    FROM
        CalculatedGoalData cgd;
END;
$$;