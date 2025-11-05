import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
// Define a local Session type to avoid import issues
interface Session {
  user: {
    id: string;
    email?: string;
    // Add other user properties if needed
  };
  // Add other session properties if needed
}
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';

interface GoalFormProps {
  session: Session;
  onSave: () => void;
  onCancel: () => void;
  goal?: any; // Optional goal object for editing
}

const GoalForm: React.FC<GoalFormProps> = ({ session, onSave, onCancel, goal }) => {
  const [name, setName] = useState(goal?.name || '');
  const [targetAmount, setTargetAmount] = useState(goal?.target_amount || '');
  const [targetDate, setTargetDate] = useState(goal?.target_date || '');
  const [allocationType, setAllocationType] = useState(goal?.allocation_type || '');
  const [allocationValue, setAllocationValue] = useState(goal?.allocation_value || '');
  const [allocationCycle, setAllocationCycle] = useState(goal?.allocation_cycle || '');
  const [sourceIncomeId, setSourceIncomeId] = useState(goal?.source_income_id || '');
  const [incomeSources, setIncomeSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchIncomeSources = async () => {
      const { data, error } = await supabase
        .from('income_sources')
        .select('id, name')
        .eq('user_id', session.user.id);

      if (error) {
        toast.error('Error fetching income sources: ' + error.message);
      } else {
        setIncomeSources(data || []);
      }
    };

    if (session?.user?.id) {
      fetchIncomeSources();
    }
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const newGoal = {
      user_id: session.user.id,
      name,
      target_amount: parseFloat(targetAmount),
      target_date: targetDate || null, // Allow null for target_date
      allocation_type: allocationType, // Corrected to use state variable name
      allocation_value: parseFloat(allocationValue),
      allocation_cycle: allocationCycle || null, // Allow null for allocation_cycle
      source_income_id: sourceIncomeId || null, // Allow null for source_income_id
    };

    let error = null;
    if (goal) {
      // Edit existing goal
      const { error: updateError } = await supabase
        .from('goals')
        .update(newGoal)
        .eq('id', goal.id);
      error = updateError;
    } else {
      // Add new goal
      const { error: insertError } = await supabase
        .from('goals')
        .insert(newGoal);
      error = insertError;
    }

    setLoading(false);

    if (error) {
      toast.error('Error saving goal: ' + error.message);
    } else {
      toast.success('Goal saved successfully!');
      onSave();
    }
  };

  const showSourceIncomeDropdown = allocationType === 'PERCENT_SOURCE' || allocationType === 'FIXED_SOURCE';
  const showAllocationCycleDropdown = allocationType.startsWith('FIXED');

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold">{goal ? 'Edit Goal' : 'Add New Goal'}</h2>

      <div>
        <Label htmlFor="name">Goal Name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div>
        <Label htmlFor="targetAmount">Target Amount</Label>
        <Input
          id="targetAmount"
          type="number"
          value={targetAmount}
          onChange={(e) => setTargetAmount(e.target.value)}
          required
        />
      </div>

      <div>
        <Label htmlFor="targetDate">Target Date (Optional)</Label>
        <Input
          id="targetDate"
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
        />
      </div>

      <div>
        <Label htmlFor="allocationType">Allocation Type</Label>
        <Select value={allocationType} onValueChange={setAllocationType} required>
          <SelectTrigger>
            <SelectValue placeholder="Select allocation type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PERCENT_TOTAL">% of Total Income</SelectItem>
            <SelectItem value="PERCENT_SOURCE">% of Specific Source</SelectItem>
            <SelectItem value="FIXED_TOTAL">Fixed Amount from Total</SelectItem>
            <SelectItem value="FIXED_SOURCE">Fixed Amount from Specific Source</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {showSourceIncomeDropdown && (
        <div>
          <Label htmlFor="sourceIncome">Income Source</Label>
          <Select value={sourceIncomeId} onValueChange={setSourceIncomeId} required>
            <SelectTrigger>
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
        </div>
      )}

      <div>
        <Label htmlFor="allocationValue">Allocation Value</Label>
        <Input
          id="allocationValue"
          type="number"
          value={allocationValue}
          onChange={(e) => setAllocationValue(e.target.value)}
          required
        />
      </div>

      {showAllocationCycleDropdown && (
        <div>
          <Label htmlFor="allocationCycle">Allocation Cycle</Label>
          <Select value={allocationCycle} onValueChange={setAllocationCycle} required>
            <SelectTrigger>
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

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : (goal ? 'Save Changes' : 'Add Goal')}
        </Button>
      </div>
    </form>
  );
};

export default GoalForm;
