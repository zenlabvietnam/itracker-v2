-- Kích hoạt tiện ích mở rộng pg_net nếu chưa được kích hoạt
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Cấp quyền sử dụng schema net cho vai trò postgres
GRANT USAGE ON SCHEMA net TO postgres;

-- Tạo hàm PostgreSQL để gọi Edge Function
CREATE OR REPLACE FUNCTION public.trigger_calculate_goal_forecast()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Chạy với quyền của người định nghĩa (thường là postgres)
AS $$
DECLARE
    -- Thay thế bằng URL dự án Supabase của bạn
    supabase_url TEXT := 'https://khreogphxseugpuhbwkv.supabase.co';
    -- Thay thế bằng Service Role Key của bạn (hoặc anon key nếu Edge Function không yêu cầu quyền cao)
    service_role_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtocmVvZ3BoeHNldWdwdWhid2t2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjA3MTYzNiwiZXhwIjoyMDc3NjQ3NjM2fQ.sAqB6lU8MU2Eev1CtY5U4mgd-GH7AS0Ym2_OXgoQ80Q';
    -- Tên Edge Function của bạn
    edge_function_name TEXT := 'calculate-goal-forecast';
    -- URL đầy đủ của Edge Function
    edge_function_url TEXT;
    -- Lấy tất cả user_id để gọi Edge Function cho từng người dùng
    user_id_record RECORD;
BEGIN
    edge_function_url := supabase_url || '/functions/v1/' || edge_function_name;

    -- Lặp qua tất cả người dùng và gọi Edge Function cho từng người
    FOR user_id_record IN SELECT id FROM auth.users
    LOOP
        PERFORM net.http_post(
            edge_function_url,
            json_build_object('user_id', user_id_record.id)::jsonb,
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || service_role_key
            )
        );
    END LOOP;
END;
$$;

-- Lên lịch chạy hàm này hàng ngày vào lúc 01:00 UTC (sau khi job cập nhật current_amount chạy)
-- Đảm bảo rằng pg_cron đã được kích hoạt trong Supabase Dashboard -> Database -> Extensions
SELECT cron.schedule(
    'calculate-goal-forecast-daily', -- Tên job
    '0 1 * * *',                     -- Lịch trình cron (hàng ngày vào lúc 01:00 UTC)
    'SELECT public.trigger_calculate_goal_forecast();'
);

-- Để hủy lịch trình:
-- SELECT cron.unschedule('calculate-goal-forecast-daily');
