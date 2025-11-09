-- Helper function to convert income amount to daily equivalent
CREATE OR REPLACE FUNCTION public.get_daily_amount(amount NUMERIC, cycle TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN CASE cycle
        WHEN 'daily' THEN amount
        WHEN 'weekly' THEN amount / 7.0
        WHEN 'monthly' THEN amount / 30.44 -- Average days in a month
        WHEN 'yearly' THEN amount / 365.25 -- Average days in a year
        ELSE 0
    END;
END;
$$;

-- Function to calculate total and individual accumulated income for a given period
CREATE OR REPLACE FUNCTION public.get_accumulated_income_by_period(
    p_user_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r_income_source RECORD;
    v_total_accumulated_income NUMERIC := 0;
    v_individual_sources JSONB := '[]'::JSONB;
    v_daily_amount NUMERIC;
    v_days_in_period INTEGER;
    v_accumulated_for_source NUMERIC;
BEGIN
    -- Calculate total days in the period
    v_days_in_period := p_end_date - p_start_date + 1;

    FOR r_income_source IN
        SELECT id, name, amount, cycle
        FROM public.income_sources
        WHERE user_id = p_user_id AND status = 'active'
    LOOP
        v_daily_amount := public.get_daily_amount(r_income_source.amount, r_income_source.cycle::TEXT);
        v_accumulated_for_source := v_daily_amount * v_days_in_period;

        v_total_accumulated_income := v_total_accumulated_income + v_accumulated_for_source;

        v_individual_sources := jsonb_insert(
            v_individual_sources,
            '{999}', -- Placeholder index to append
            jsonb_build_object(
                'id', r_income_source.id,
                'name', r_income_source.name,
                'accumulated_amount', v_accumulated_for_source
            ),
            true
        );
    END LOOP;

    RETURN jsonb_build_object(
        'total_accumulated_income', v_total_accumulated_income,
        'individual_sources', v_individual_sources
    );
END;
$$;
