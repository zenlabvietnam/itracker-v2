-- Kích hoạt tiện ích mở rộng pg_cron nếu chưa được kích hoạt
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Helper function to convert income amount to monthly equivalent
CREATE OR REPLACE FUNCTION public.get_monthly_amount(amount NUMERIC, cycle TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN (CASE cycle
        WHEN 'daily' THEN amount * 30.44 -- Average days in a month
                    WHEN 'weekly' THEN amount * (52.0 / 12.0)
                    -- WHEN 'bi-weekly' THEN amount * (26.0 / 12.0) -- Đã loại bỏ
                    WHEN 'monthly' THEN amount        WHEN 'yearly' THEN amount / 12.0
        ELSE 0
    END);
END;
$$;

-- Hàm để tính toán và cập nhật current_amount cho tất cả các mục tiêu của tất cả người dùng
CREATE OR REPLACE FUNCTION public.update_all_goals_current_amount()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_record RECORD;
    goal_record RECORD;
    income_source_record RECORD;
    total_monthly_income NUMERIC;
    monthly_contribution NUMERIC;
    calculated_current_amount NUMERIC;
BEGIN
    -- Lặp qua tất cả người dùng
    FOR user_record IN SELECT id FROM auth.users
    LOOP
        total_monthly_income := 0;

        -- Tính tổng thu nhập hàng tháng cho người dùng hiện tại
        FOR income_source_record IN
            SELECT amount, cycle
            FROM public.income_sources
            WHERE user_id = user_record.id AND status = 'active'
        LOOP
            total_monthly_income := total_monthly_income + public.get_monthly_amount(income_source_record.amount, income_source_record.cycle::TEXT);
        END LOOP;

        -- Lặp qua tất cả các mục tiêu của người dùng hiện tại
        FOR goal_record IN
            SELECT id, current_amount, allocation_type, allocation_value, allocation_cycle, source_income_id
            FROM public.goals
            WHERE user_id = user_record.id -- Đã sửa lỗi: chỉ sử dụng user_record.id
        LOOP
            monthly_contribution := 0;

            CASE goal_record.allocation_type
                WHEN 'PERCENT_TOTAL' THEN
                    monthly_contribution := (total_monthly_income * goal_record.allocation_value) / 100.0;
                WHEN 'PERCENT_SOURCE' THEN
                    -- Tìm nguồn thu nhập cụ thể
                    SELECT public.get_monthly_amount(amount, cycle::TEXT) * (goal_record.allocation_value / 100.0)
                    INTO monthly_contribution
                    FROM public.income_sources
                    WHERE id = goal_record.source_income_id AND user_id = user_record.id AND status = 'active';
                WHEN 'FIXED_TOTAL' THEN
                    monthly_contribution := public.get_monthly_amount(goal_record.allocation_value, goal_record.allocation_cycle::TEXT);
                WHEN 'FIXED_SOURCE' THEN
                    monthly_contribution := public.get_monthly_amount(goal_record.allocation_value, goal_record.allocation_cycle::TEXT);
                ELSE
                    monthly_contribution := 0;
            END CASE;

            calculated_current_amount := goal_record.current_amount + monthly_contribution;

            UPDATE public.goals
            SET current_amount = calculated_current_amount
            WHERE id = goal_record.id;

        END LOOP;
    END LOOP;
END;
$$;

-- Lên lịch chạy hàm này hàng ngày vào lúc 00:00 UTC
-- Đảm bảo rằng pg_cron đã được kích hoạt trong Supabase Dashboard -> Database -> Extensions
SELECT cron.schedule(
    'update-goals-daily', -- Tên job
    '0 0 * * *',          -- Lịch trình cron (hàng ngày vào lúc nửa đêm UTC)
    'SELECT public.update_all_goals_current_amount();'
);

-- Để hủy lịch trình:
-- SELECT cron.unschedule('update-goals-daily');
