-- Drop the function if it exists to allow for return type changes
DROP FUNCTION IF EXISTS public.update_goals_current_amount_debug_simple();

CREATE OR REPLACE FUNCTION public.update_goals_current_amount_debug_simple()
RETURNS TABLE (
    goal_id UUID,
    goal_name TEXT,
    current_amount_from_db NUMERIC,
    target_amount_from_db NUMERIC,
    last_update_from_db TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
DECLARE
    goal_record RECORD;
    -- Variables for RETURN NEXT
    goal_id UUID;
    goal_name TEXT;
    current_amount_from_db NUMERIC;
    target_amount_from_db NUMERIC;
    last_update_from_db TIMESTAMP WITH TIME ZONE;
BEGIN
    FOR goal_record IN
        SELECT id, name, current_amount, target_amount, last_current_amount_update
        FROM public.goals
        WHERE current_amount < target_amount
    LOOP
        goal_id := goal_record.id;
        goal_name := goal_record.name;
        current_amount_from_db := goal_record.current_amount;
        target_amount_from_db := goal_record.target_amount;
        last_update_from_db := goal_record.last_current_amount_update;

        RETURN NEXT;
    END LOOP;
END;
$$;