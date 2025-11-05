import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';

import styles from './AddIncomeSourceForm.module.css'; // Import CSS Module

interface AddIncomeSourceFormProps {
  session: Session;
  onSuccess: () => void;
}

export default function AddIncomeSourceForm({ session, onSuccess }: AddIncomeSourceFormProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [cycle, setCycle] = useState('monthly');
  const [loading, setLoading] = useState(false);

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
      .insert({
        user_id: session.user.id,
        name,
        amount: parseFloat(amount),
        cycle: cycle,
        status: 'active',
      });

    if (error) {
      toast.error("Error adding income source", {
        description: error.message,
      });
    } else {
      toast.success("Success", {
        description: "Income source added successfully!",
      });
      setName('');
      setAmount('');
      setCycle('monthly');
      onSuccess();
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.formGrid}>
      <div className={styles.formRow}>
        <Label htmlFor="name" className={styles.labelRight}>
          Name
        </Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={styles.colSpan3}
          placeholder="e.g. Salary"
          required
        />
      </div>
      <div className={styles.formRow}>
        <Label htmlFor="amount" className={styles.labelRight}>
          Amount
        </Label>
        <Input
          id="amount"
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
        <Label htmlFor="cycle" className={styles.labelRight}>
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
        {loading ? "Adding..." : "Add Income Source"}
      </Button>
    </form>
  );
}
