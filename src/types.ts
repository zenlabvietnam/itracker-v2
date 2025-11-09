export interface Goal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date?: string;
  allocation_type: 'PERCENT_TOTAL' | 'PERCENT_SOURCE' | 'FIXED_TOTAL' | 'FIXED_SOURCE';
  allocation_value: number;
  allocation_cycle?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  source_income_id?: string;
  income_sources?: { id: string; name: string } | null;
  forecasted_completion_date?: string | null; // Added this line
}

export interface IncomeSource {
  id: string;
  name: string;
  amount: number;
  cycle: 'daily' | 'weekly' | 'monthly' | 'yearly';
}