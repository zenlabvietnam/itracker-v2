import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { supabase } from '../lib/supabaseClient';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import styles from './GoalForm.module.css';
import type { Goal, IncomeSource } from '../types'; // Import Goal and IncomeSource from types.ts

interface Session {
  user: {
    id: string;
    email?: string;
  };
}

interface GoalFormProps {
  session: Session;
  onSave: () => void;
  onCancel: () => void;
  goal?: Goal; // Optional: if provided, it's an edit form
  isOverAllocated: boolean; // Thêm prop này
}

interface GoalFormData {
  name: string;
  target_amount: number;
  target_date: string | null;
  allocation_type: Goal['allocation_type'];
  allocation_value: number;
  allocation_cycle: Goal['allocation_cycle'] | null;
  source_income_id: string | null;
}

const GoalForm: React.FC<GoalFormProps> = ({ session, onSave, onCancel, goal, isOverAllocated }) => {
  const { register, handleSubmit, control, watch, formState: { errors }, setValue } = useForm<GoalFormData>({
    defaultValues: {
      name: goal?.name || '',
      target_amount: goal?.target_amount || 0, // Default to 0 for number type
      target_date: goal?.target_date || null,
      allocation_type: goal?.allocation_type || 'PERCENT_TOTAL',
      allocation_value: goal?.allocation_value || 0, // Default to 0 for number type
      allocation_cycle: goal?.allocation_cycle || 'monthly',
      source_income_id: goal?.source_income_id || null,
    },
  });

  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const allocationType = watch('allocation_type');

  useEffect(() => {
    const fetchIncomeSources = async () => {
      const { data, error } = await supabase
        .from('income_sources')
        .select('id, name, amount, cycle') // Include amount and cycle
        .eq('user_id', session.user.id);

      if (error) {
        console.error("Error fetching income sources:", error.message);
        toast.error("Error fetching income sources", { description: error.message });
      } else {
        // Set default source_income_id if editing and it exists in fetched data
        if (goal?.source_income_id && data.some((source: IncomeSource) => source.id === goal.source_income_id)) {
          setValue('source_income_id', goal.source_income_id);
        }
        setIncomeSources(data || []);
      }
    };

    if (session?.user?.id) {
      fetchIncomeSources();
    }
  }, [session, goal?.source_income_id, setValue]);

  const onSubmit = async (formData: GoalFormData) => {
    const newGoal = {
      user_id: session.user.id,
      name: formData.name,
      target_amount: parseFloat(String(formData.target_amount)), // Ensure it's a number
      current_amount: goal?.current_amount || 0, // Keep current_amount for existing goals, default to 0 for new
      allocation_type: formData.allocation_type,
      allocation_value: parseFloat(String(formData.allocation_value)), // Ensure it's a number
      allocation_cycle: formData.allocation_cycle || null,
      source_income_id: formData.source_income_id || null,
    };

    let error = null;
    if (goal) {
      const { error: updateError } = await supabase
        .from('goals')
        .update(newGoal)
        .eq('id', goal.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('goals')
        .insert(newGoal);
      error = insertError;
    }

    if (error) {
      toast.error('Error saving goal: ' + error.message);
    } else {
      toast.success('Goal saved successfully!');
      onSave();
    }
  };

  const showSourceIncomeDropdown = allocationType === 'PERCENT_SOURCE' || allocationType === 'FIXED_SOURCE';
  const showAllocationCycleDropdown = allocationType && allocationType.startsWith('FIXED');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.formContainer}>
      <h2 className={styles.formTitle}>{goal ? 'Edit Goal' : 'Add New Goal'}</h2>
      {isOverAllocated && (
        <div className={styles.warningMessage}>
          Cảnh báo: Tổng số tiền phân bổ cho các mục tiêu của bạn vượt quá tổng thu nhập dự kiến. Vui lòng điều chỉnh kế hoạch của bạn.
        </div>
      )}

      <div className={styles.formField}>
        <Label htmlFor="name">Goal Name</Label>
        <Input id="name" {...register('name', { required: true })} />
        {errors.name && <span>This field is required</span>}
      </div>

      <div className={styles.formField}>
        <Label htmlFor="targetAmount">Target Amount</Label>
        <Input id="targetAmount" type="number" {...register('target_amount', { required: true })} />
        {errors.target_amount && <span>This field is required</span>}
      </div>

      <div className={styles.formField}>
        <Label htmlFor="targetDate">Target Date (Optional)</Label>
        <Input id="targetDate" type="date" {...register('target_date')} />
      </div>

      <div className={styles.formField}>
        <Label id="allocation-type-label" htmlFor="allocationType">Allocation Type</Label>
        <Controller
          name="allocation_type"
          control={control}
          rules={{ required: true }}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value ?? undefined}>
              <SelectTrigger aria-labelledby="allocation-type-label">
                <SelectValue placeholder="Select allocation type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PERCENT_TOTAL">% of Total Income</SelectItem>
                <SelectItem value="PERCENT_SOURCE">% of Specific Source</SelectItem>
                <SelectItem value="FIXED_TOTAL">Fixed Amount from Total</SelectItem>
                <SelectItem value="FIXED_SOURCE">Fixed Amount from Specific Source</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {errors.allocation_type && <span>This field is required</span>}
      </div>

      {showSourceIncomeDropdown && (
        <div className={styles.formField}>
          <Label id="source-income-label" htmlFor="sourceIncome">Income Source</Label>
          <Controller
            name="source_income_id"
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                <SelectTrigger aria-labelledby="source-income-label">
                  <SelectValue placeholder="Select income source" />
                </SelectTrigger>
                <SelectContent>
                  {incomeSources.map((source) => (
                    <SelectItem key={source.id} value={source.id}>
                      {source.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.source_income_id && <span>This field is required</span>}
        </div>
      )}

      <div className={styles.formField}>
        <Label htmlFor="allocationValue">Allocation Value</Label>
        <Input id="allocationValue" type="number" {...register('allocation_value', { required: true })} />
        {errors.allocation_value && <span>This field is required</span>}
      </div>

      {showAllocationCycleDropdown && (
        <div className={styles.formField}>
          <Label id="allocation-cycle-label" htmlFor="allocationCycle">Allocation Cycle</Label>
          <Controller
            name="allocation_cycle"
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                <SelectTrigger aria-labelledby="allocation-cycle-label">
                  <SelectValue placeholder="Select cycle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.allocation_cycle && <span>This field is required</span>}
        </div>
      )}

      <div className={styles.actions}>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{goal ? 'Save Changes' : 'Add Goal'}</Button>
      </div>
    </form>
  );
};

export default GoalForm;