import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.5'

// Helper function to convert income amount to monthly equivalent
const getMonthlyAmount = (amount: number, cycle: string): number => {
  switch (cycle) {
    case 'daily': return amount * 30.44; // Average days in a month
    case 'weekly': return amount * (52 / 12);
    // case 'bi-weekly': return amount * (26 / 12); // Removed for consistency
    case 'monthly': return amount;
    case 'yearly': return amount / 12;
    default: return 0;
  }
};

Deno.serve(async (req) => {
  try {
    const { user_id } = await req.json();
    console.log('Edge Function received user_id:', user_id); // DEBUG LOG

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id is required' }), { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { 'x-supabase-user-id': user_id } } }
    );

    // 1. Fetch active income sources
    const { data: incomeSources, error: incomeError } = await supabase
      .from('income_sources')
      .select('id, name, amount, cycle, status')
      .eq('user_id', user_id)
      .eq('status', 'active');

    if (incomeError) {
      console.error('Error fetching income sources:', incomeError.message);
      return new Response(JSON.stringify({ error: incomeError.message }), { status: 500 });
    }
    console.log('Fetched income sources for user', user_id, ':', incomeSources); // DEBUG LOG

    let totalMonthlyIncome = 0;
    if (incomeSources && incomeSources.length > 0) {
      totalMonthlyIncome = incomeSources.reduce((sum, source) => {
        return sum + getMonthlyAmount(source.amount, source.cycle);
      }, 0);
    }
    console.log('Total Monthly Income for user', user_id, ':', totalMonthlyIncome); // DEBUG LOG

    // 2. Fetch goals
    const { data: goals, error: goalsError } = await supabase
      .from('goals')
      .select('id, name, target_amount, current_amount, allocation_type, allocation_value, allocation_cycle, source_income_id, target_date')
      .eq('user_id', user_id);

    if (goalsError) {
      console.error('Error fetching goals:', goalsError.message);
      return new Response(JSON.stringify({ error: goalsError.message }), { status: 500 });
    }
    console.log('Fetched goals for user', user_id, ':', goals); // DEBUG LOG

    if (goals && goals.length > 0) {
      for (const goal of goals) {
        let monthlyContribution = 0;
        let forecastedCompletionDate: string | null = null;

        const remainingAmount = goal.target_amount - goal.current_amount;
        console.log('Goal:', goal.name, 'ID:', goal.id, 'Remaining Amount:', remainingAmount); // DEBUG LOG

        if (remainingAmount <= 0) {
          forecastedCompletionDate = new Date().toISOString().split('T')[0]; // Already met or exceeded
        } else {
          const sourceIncome = incomeSources?.find(source => source.id === goal.source_income_id);

          switch (goal.allocation_type) {
            case 'PERCENT_TOTAL':
              monthlyContribution = (totalMonthlyIncome * goal.allocation_value) / 100;
              break;
            case 'PERCENT_SOURCE':
              if (sourceIncome) {
                monthlyContribution = (getMonthlyAmount(sourceIncome.amount, sourceIncome.cycle) * goal.allocation_value) / 100;
              }
              break;
            case 'FIXED_TOTAL':
              monthlyContribution = getMonthlyAmount(goal.allocation_value, goal.allocation_cycle || 'monthly');
              break;
            case 'FIXED_SOURCE':
              if (sourceIncome) {
                monthlyContribution = getMonthlyAmount(goal.allocation_value, goal.allocation_cycle || 'monthly');
              }
              break;
          }
          console.log('Goal:', goal.name, 'Monthly Contribution:', monthlyContribution); // DEBUG LOG

          if (monthlyContribution > 0) {
            const monthsToComplete = remainingAmount / monthlyContribution;
            const completionDate = new Date();
            completionDate.setMonth(completionDate.getMonth() + Math.ceil(monthsToComplete));
            forecastedCompletionDate = completionDate.toISOString().split('T')[0];
          }
        }
        console.log('Goal:', goal.name, 'Final Forecasted Completion Date:', forecastedCompletionDate); // DEBUG LOG

        // Update the goal with the new forecasted_completion_date
        const { error: updateError } = await supabase
          .from('goals')
          .update({ forecasted_completion_date: forecastedCompletionDate })
          .eq('id', goal.id);

        if (updateError) {
          console.error(`Error updating forecasted_completion_date for goal ${goal.id}:`, updateError.message);
        }
      }
    }

    return new Response(JSON.stringify({ message: 'Goal forecasts calculated and updated successfully' }), { status: 200 });
  } catch (error) {
    console.error('Edge Function error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
