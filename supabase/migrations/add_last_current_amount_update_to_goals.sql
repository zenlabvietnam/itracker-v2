-- Add last_current_amount_update column to goals table
ALTER TABLE public.goals
ADD COLUMN last_current_amount_update timestamp with time zone DEFAULT now();

-- Optional: Update existing rows to set last_current_amount_update to their created_at or a reasonable default
-- UPDATE public.goals
-- SET last_current_amount_update = created_at
-- WHERE last_current_amount_update IS NULL;