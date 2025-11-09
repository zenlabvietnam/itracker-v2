import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';

import styles from './AddIncomeSourceForm.module.css'; // Reusing styles for now

interface IncomeSource {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  cycle: string;
  status: 'active' | 'paused';
}

interface EditIncomeSourceFormProps {
  session: Session;
  incomeSource: IncomeSource; // The income source to edit
  onSuccess: () => void;
}

export default function EditIncomeSourceForm({ session, incomeSource, onSuccess }: EditIncomeSourceFormProps) {
  const [name, setName] = useState(incomeSource.name);
  const [amount, setAmount] = useState(String(incomeSource.amount));
  const [cycle, setCycle] = useState(incomeSource.cycle);
  const [loading, setLoading] = useState(false);

  // Update form fields if incomeSource prop changes (e.g., when a different item is selected for edit)
  useEffect(() => {
    setName(incomeSource.name);
    setAmount(String(incomeSource.amount));
    setCycle(incomeSource.cycle);
  }, [incomeSource]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!name || !amount || parseFloat(amount) <= 0) {
      toast.error("Error", {
        description: "Please provide a valid name and amount.",
      });
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('income_sources')
      .update({
        name,
        amount: parseFloat(amount),
        cycle: cycle,
      })
      .eq('id', incomeSource.id)
      .eq('user_id', session.user.id);

    console.log('Updating income source with:');
    console.log('  ID:', incomeSource.id);
    console.log('  User ID from session:', session.user.id);
    console.log('  User ID from incomeSource prop:', incomeSource.user_id);
    console.log('  Data:', { name, amount: parseFloat(amount), cycle });

    if (error) {
      toast.error("Error updating income source", {
        description: error.message,
      });
    } else {
      toast.success("Success", {
        description: "Income source updated successfully!",
      });
      onSuccess();
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.formGrid}>
      <div className={styles.formRow}>
        <Label htmlFor="edit-name" className={styles.labelRight}>
          Name
        </Label>
        <Input
          id="edit-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={styles.colSpan3}
          placeholder="e.g. Salary"
          required
        />
      </div>
      <div className={styles.formRow}>
        <Label htmlFor="edit-amount" className={styles.labelRight}>
          Amount
        </Label>
        <Input
          id="edit-amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={styles.colSpan3}
          placeholder="e.g. 1000"
          required
          min="0.01"
          step="0.01"
        />
      </div>
      <div className={styles.formRow}>
        <Label htmlFor="edit-cycle" className={styles.labelRight}>
          Cycle
        </Label>
        <Select value={cycle} onValueChange={setCycle}>
          <SelectTrigger className={styles.colSpan3}>
            <SelectValue placeholder="Select a cycle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className={styles.buttonFullWidth} disabled={loading}>
        {loading ? "Updating..." : "Update Income Source"}
      </Button>
    </form>
  );
}