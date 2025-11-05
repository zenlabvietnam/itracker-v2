import type { Goal, IncomeSource } from '../types';

// Helper to convert any income amount to monthly equivalent
export const convertToMonthly = (amount: number, cycle: 'daily' | 'weekly' | 'monthly' | 'yearly'): number => {
  switch (cycle) {
    case 'daily': return amount * 30; // Approx
    case 'weekly': return amount * 4; // Approx
    case 'monthly': return amount;
    case 'yearly': return amount / 12;
    default: return amount;
  }
};

export const calculateAccumulatedAmount = (
  goal: Goal,
  allIncomeSources: IncomeSource[],
  monthsToSimulate: number
): number => {
  let accumulated = 0;
  const totalEstimatedMonthlyIncome = allIncomeSources.reduce((sum, source) => {
    return sum + convertToMonthly(source.amount, source.cycle);
  }, 0);

  switch (goal.allocation_type) {
    case 'PERCENT_TOTAL':
      accumulated = (goal.allocation_value / 100) * totalEstimatedMonthlyIncome * monthsToSimulate;
      break;
    case 'PERCENT_SOURCE':
      if (goal.source_income_id) {
        const source = allIncomeSources.find(s => s.id === goal.source_income_id);
        if (source) {
          const sourceMonthlyAmount = convertToMonthly(source.amount, source.cycle);
          accumulated = (goal.allocation_value / 100) * sourceMonthlyAmount * monthsToSimulate;
        }
      }
      break;
    case 'FIXED_TOTAL':
      if (goal.allocation_cycle) {
        accumulated = convertToMonthly(goal.allocation_value, goal.allocation_cycle) * monthsToSimulate;
      }
      break;
    case 'FIXED_SOURCE':
      if (goal.source_income_id && goal.allocation_cycle) {
        const source = allIncomeSources.find(s => s.id === goal.source_income_id);
        if (source) {
          accumulated = convertToMonthly(goal.allocation_value, goal.allocation_cycle) * monthsToSimulate;
        }
      }
      break;
    default:
      accumulated = 0;
  }
  return accumulated;
};