import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import type { Goal, IncomeSource } from '../types'; // Import Goal and IncomeSource from types.ts


import styles from './AddIncomeSourceForm.module.css'; // Reusing form styles

interface AddEditGoalFormProps {
  session: Session;
  goal?: Goal; // Optional: if provided, it's an edit form
  onSuccess: () => void;
}

export default function AddEditGoalForm({ session, goal, onSuccess }: AddEditGoalFormProps) {
  const [name, setName] = useState(goal?.name || '');
  const [targetAmount, setTargetAmount] = useState(String(goal?.target_amount || ''));
  const [targetDate, setTargetDate] = useState(goal?.target_date || '');
  const [allocationType, setAllocationType] = useState<Goal['allocation_type']>(goal?.allocation_type || 'PERCENT_TOTAL'); // Updated initial value
  const [allocationValue, setAllocationValue] = useState(String(goal?.allocation_value || ''));
  const [allocationCycle, setAllocationCycle] = useState<Goal['allocation_cycle']>(goal?.allocation_cycle || 'monthly');
  const [sourceIncomeId, setSourceIncomeId] = useState(goal?.source_income_id || ''); // Renamed state variable
  const [loading, setLoading] = useState(false);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  useEffect(() => {
    // Fetch user's income sources for allocation dropdowns
    const fetchIncomeSources = async () => {
      const { data, error } = await supabase
        .from('income_sources')
        .select('id, name, amount, cycle') // Fetch amount and cycle
        .eq('user_id', session.user.id)
        .eq('status', 'active'); // Only active income sources for allocation

      if (error) {
        console.error("Error fetching income sources:", error.message);
        toast.error("Error fetching income sources", { description: error.message });
      } else {
        setIncomeSources(data || []);
      }
    };
    fetchIncomeSources();
  }, [session.user.id]);

  useEffect(() => {
    if (goal) {
      setName(goal.name);
      setTargetAmount(String(goal.target_amount));
      setTargetDate(goal.target_date || '');
      setAllocationType(goal.allocation_type);
      setAllocationValue(String(goal.allocation_value));
      setAllocationCycle(goal.allocation_cycle || 'monthly');
      setSourceIncomeId(goal.source_income_id || ''); // Updated state variable
    }
  }, [goal]);

      const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
    
        if (!name || !targetAmount || parseFloat(targetAmount) <= 0 || !allocationValue || parseFloat(allocationValue) <= 0) {
          toast.error("Error", {
            description: "Please fill in all required fields with valid values.",
          });
          setLoading(false);
          return;
        }
    
        // Fetch all active income sources for validation
        const { data: incomeSourcesData, error: incomeSourcesError } = await supabase
          .from('income_sources')
          .select('id, name, amount, cycle')
          .eq('user_id', session.user.id)
          .eq('status', 'active');
    
        if (incomeSourcesError) {
          console.error("Error fetching income sources for validation:", incomeSourcesError.message);
          toast.error("Error fetching income sources for validation", { description: incomeSourcesError.message });
          setLoading(false);
          return;
        }
        const allIncomeSources: IncomeSource[] = incomeSourcesData || [];
    
        // Fetch all existing goals for validation
        const { data: existingGoalsData, error: existingGoalsError } = await supabase
          .from('goals')
          .select('id, name, target_amount, current_amount, allocation_type, allocation_value, allocation_cycle, source_income_id, user_id') // Fetch all required fields
          .eq('user_id', session.user.id);
    
        if (existingGoalsError) {
          console.error("Error fetching existing goals for validation:", existingGoalsError.message);
          toast.error("Error fetching existing goals for validation", { description: existingGoalsError.message });
          setLoading(false);
          return;
        }
            const allExistingGoals: Goal[] = existingGoalsData || [];
        
            // Filter out the current goal if it's an edit operation
            const otherGoals = allExistingGoals.filter(g => g.id !== goal?.id);
        
            // Helper to convert any income amount to monthly equivalent
            const convertToMonthly = (amount: number, cycle: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
              switch (cycle) {
                case 'daily': return amount * 30; // Approx
                case 'weekly': return amount * 4; // Approx
                case 'monthly': return amount;
                case 'yearly': return amount / 12;
                default: return amount;
              }
            };
        
            // Calculate total estimated monthly income
            const totalEstimatedMonthlyIncome = allIncomeSources.reduce((sum, source) => {
              return sum + convertToMonthly(source.amount, source.cycle);
            }, 0);
        
            // --- Start Validation Logic ---
            let warnings: string[] = [];
        
            // 1. Total Percentage Allocation Warning
            let totalPercentAllocated = 0;
            otherGoals.forEach(g => {
              if (g.allocation_type === 'PERCENT_TOTAL') {
                totalPercentAllocated += g.allocation_value;
              }
            });
            if (allocationType === 'PERCENT_TOTAL') {
              totalPercentAllocated += parseFloat(allocationValue);
            }
        
            if (totalPercentAllocated > 100) {
              warnings.push(`Total percentage allocation from total income exceeds 100% (${totalPercentAllocated}%).`);
            }
        
            // 2. Total Fixed Amount Allocation Warning
            let totalFixedAmountAllocatedMonthly = 0;
            otherGoals.forEach(g => {
              if (g.allocation_type === 'FIXED_TOTAL' && g.allocation_cycle) {
                totalFixedAmountAllocatedMonthly += convertToMonthly(g.allocation_value, g.allocation_cycle);
              }
            });
            if (allocationType === 'FIXED_TOTAL' && allocationCycle) {
              totalFixedAmountAllocatedMonthly += convertToMonthly(parseFloat(allocationValue), allocationCycle);
            }
        
            if (totalFixedAmountAllocatedMonthly > totalEstimatedMonthlyIncome) {
              warnings.push(`Total fixed amount allocation from total income (${formatCurrency(totalFixedAmountAllocatedMonthly)}/month) exceeds estimated total monthly income (${formatCurrency(totalEstimatedMonthlyIncome)}/month).`);
            }
        
            // 3. Specific Income Source Allocation Warning
            if (['PERCENT_SOURCE', 'FIXED_SOURCE'].includes(allocationType) && sourceIncomeId) {
              const selectedSource = allIncomeSources.find(s => s.id === sourceIncomeId);
              if (selectedSource) {
                let allocatedFromThisSource = 0;
                if (allocationType === 'PERCENT_SOURCE') {
                  allocatedFromThisSource = (parseFloat(allocationValue) / 100) * selectedSource.amount;
                } else if (allocationType === 'FIXED_SOURCE' && allocationCycle) {
                  allocatedFromThisSource = convertToMonthly(parseFloat(allocationValue), allocationCycle);
                }
        
                const sourceMonthlyAmount = convertToMonthly(selectedSource.amount, selectedSource.cycle);
        
                if (allocatedFromThisSource > sourceMonthlyAmount) {
                  warnings.push(`Allocation from '${selectedSource.name}' (${formatCurrency(allocatedFromThisSource)}/month) exceeds the income of that source (${formatCurrency(sourceMonthlyAmount)}/month).`);
                }
              }
            }
        
            // Display warnings if any
            warnings.forEach(warning => {
              toast.warning("Allocation Warning", {
                description: warning,
              });
            });      const goalData: Omit<Goal, 'id' | 'user_id' | 'current_amount'> = {
        name,
        target_amount: parseFloat(targetAmount),
        target_date: targetDate || undefined,
        allocation_type: allocationType,
        allocation_value: parseFloat(allocationValue),
        allocation_cycle: (['FIXED_TOTAL', 'FIXED_SOURCE'].includes(allocationType) ? allocationCycle : undefined),
        source_income_id: (['PERCENT_SOURCE', 'FIXED_SOURCE'].includes(allocationType) && sourceIncomeId !== '' ? sourceIncomeId : undefined), // Set to undefined if empty string
      };
  
      let error;
      if (goal) {
        ({ error } = await supabase
          .from('goals')
          .update(goalData)
          .eq('id', goal.id)
          .eq('user_id', session.user.id));
      } else {
        ({ error } = await supabase
          .from('goals')
          .insert({ ...goalData, user_id: session.user.id, current_amount: 0 })); // New goals start with 0 current_amount
      }
  
      if (error) {
        toast.error(`Error ${goal ? 'updating' : 'adding'} goal`, {
          description: error.message,
        });
      } else {
        toast.success("Success", {
          description: `Goal ${goal ? 'updated' : 'added'} successfully!`, 
        });
        onSuccess();
      }
      setLoading(false);
    };
  const showIncomeSourceDropdown = ['PERCENT_SOURCE', 'FIXED_SOURCE'].includes(allocationType); // Updated condition
  const showCycleDropdown = ['FIXED_TOTAL', 'FIXED_SOURCE'].includes(allocationType); // Updated condition

  return (
    <form onSubmit={handleSubmit} className={styles.formGrid}>
      <div className={styles.formRow}>
        <Label htmlFor="goal-name" className={styles.labelRight}>
          Name
        </Label>
        <Input
          id="goal-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={styles.colSpan3}
          placeholder="e.g. New Car Fund"
          required
        />
      </div>
      <div className={styles.formRow}>
        <Label htmlFor="target-amount" className={styles.labelRight}>
          Target Amount
        </Label>
        <Input
          id="target-amount"
          type="number"
          value={targetAmount}
          onChange={(e) => setTargetAmount(e.target.value)}
          className={styles.colSpan3}
          placeholder="e.g. 10000"
          required
          min="0.01"
          step="0.01"
        />
      </div>
      <div className={styles.formRow}>
        <Label htmlFor="target-date" className={styles.labelRight}>
          Target Date
        </Label>
        <Input
          id="target-date"
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          className={styles.colSpan3}
        />
      </div>
      <div className={styles.formRow}>
        <Label htmlFor="allocation-type" className={styles.labelRight}>
          Allocation Type
        </Label>
        <Select value={allocationType} onValueChange={(value) => setAllocationType(value as Goal['allocation_type'])}>
          <SelectTrigger className={styles.colSpan3}>
            <SelectValue placeholder="Select allocation type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PERCENT_TOTAL">% of Total Income</SelectItem>
            <SelectItem value="PERCENT_SOURCE">% of Specific Income Source</SelectItem>
            <SelectItem value="FIXED_TOTAL">Fixed Amount from Total Income</SelectItem>
            <SelectItem value="FIXED_SOURCE">Fixed Amount from Specific Income Source</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {showIncomeSourceDropdown && (
        <div className={styles.formRow}>
          <Label htmlFor="income-source" className={styles.labelRight}>
            Income Source
          </Label>
          <Select value={sourceIncomeId} onValueChange={setSourceIncomeId}>
            <SelectTrigger className={styles.colSpan3}>
              <SelectValue placeholder="Select an income source" />
            </SelectTrigger>
            <SelectContent>
              {incomeSources.map(source => (
                <SelectItem key={source.id} value={source.id}>{source.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className={styles.formRow}>
        <Label htmlFor="allocation-value" className={styles.labelRight}>
          Allocation Value ({allocationType.includes('PERCENT') ? '%' : 'Amount'})
        </Label>
        <Input
          id="allocation-value"
          type="number"
          value={allocationValue}
          onChange={(e) => setAllocationValue(e.target.value)}
          className={styles.colSpan3}
          placeholder={allocationType.includes('PERCENT') ? "e.g. 10" : "e.g. 500"}
          required
          min="0.01"
          step="0.01"
        />
      </div>

      {showCycleDropdown && (
        <div className={styles.formRow}>
          <Label htmlFor="allocation-cycle" className={styles.labelRight}>
            Cycle
          </Label>
          <Select value={allocationCycle} onValueChange={(value) => setAllocationCycle(value as Goal['allocation_cycle'])}>
            <SelectTrigger className={styles.colSpan3}>
              <SelectValue placeholder="Select cycle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <Button type="submit" className={styles.buttonFullWidth} disabled={loading}>
        {loading ? (goal ? "Updating..." : "Adding...") : (goal ? "Update Goal" : "Add Goal")}
      </Button>
    </form>
  );
}
