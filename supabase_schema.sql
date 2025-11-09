-- This script defines the complete database schema for V2.
-- It should be executed in the Supabase SQL Editor.

-- =================================================================
-- ENUM TYPES
-- =================================================================

-- 1. Create the ENUM type for income cycles
CREATE TYPE income_cycle AS ENUM ('daily', 'weekly', 'monthly', 'yearly');

-- 2. Create the ENUM type for income status
CREATE TYPE income_status AS ENUM ('active', 'paused');

-- 3. Create the ENUM type for goal allocation methods
CREATE TYPE goal_allocation_type AS ENUM (
  'PERCENT_TOTAL',   -- Percentage of total income
  'PERCENT_SOURCE',  -- Percentage of a specific source
  'FIXED_TOTAL',     -- Fixed amount from total income
  'FIXED_SOURCE'     -- Fixed amount from a specific source
);

-- =================================================================
-- TABLES
-- =================================================================

-- 4. Create the income_sources table
CREATE TABLE public.income_sources (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  name text NOT NULL,
  amount numeric NOT NULL,
  cycle income_cycle NOT NULL,
  status income_status NOT NULL DEFAULT 'active',
  created_at timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- 5. Create the goals table with flexible allocation
CREATE TABLE public.goals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  name text NOT NULL,
  target_amount numeric NOT NULL,
  current_amount numeric NOT NULL DEFAULT 0, -- This will be calculated by the system
  target_date date NULL,
  forecasted_completion_date date NULL,
  
  -- Columns for flexible allocation
  allocation_type goal_allocation_type NOT NULL,
  allocation_value numeric NOT NULL, -- Stores the percentage (e.g., 10 for 10%) or the fixed amount
  allocation_cycle income_cycle NULL, -- Required for FIXED types, specifies the period (e.g., 'monthly')
  source_income_id uuid NULL REFERENCES public.income_sources(id) ON DELETE SET NULL, -- Required for SOURCE types. ON DELETE SET NULL prevents errors if a source is deleted.

  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- =================================================================
-- ROW LEVEL SECURITY (RLS)
-- =================================================================

-- 6. Enable RLS for all tables
ALTER TABLE public.income_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for income_sources
CREATE POLICY "Allow users to view their own income sources"
ON public.income_sources FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Allow users to manage their own income sources"
ON public.income_sources FOR ALL
USING (auth.uid() = user_id);

-- 8. Create RLS policies for goals
CREATE POLICY "Allow users to view their own goals"
ON public.goals FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Allow users to manage their own goals"
ON public.goals FOR ALL
USING (auth.uid() = user_id);
