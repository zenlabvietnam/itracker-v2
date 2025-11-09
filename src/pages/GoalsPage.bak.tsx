import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import GoalForm from '../components/GoalForm';
import { toast } from 'sonner';
import styles from './GoalsPage.module.css';

interface Session {
  user: {
    id: string;
    email?: string;
  };
}

interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  allocation_type: string;
  allocation_value: number;
  allocation_cycle: string;
  source_income_id: string | null;
}


interface GoalsPageProps {
  session: Session;
}

const GoalsPage: React.FC<GoalsPageProps> = ({ session }) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddFormOpen, setIsAddFormOpen] = useState<boolean>(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState<boolean>(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState<boolean>(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);

  const fetchGoals = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', session.user.id);

    if (error) {
      setError(error.message);
    } else if (data) {
      setGoals(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (session?.user?.id) {
      fetchGoals();
    }
  }, [session]);

  const handleGoalSave = () => {
    setIsAddFormOpen(false);
    setIsEditFormOpen(false);
    fetchGoals();
  };

  const handleEditClick = (goal: Goal) => {
    setSelectedGoal(goal);
    setIsEditFormOpen(true);
  };

  const handleDeleteClick = (goal: Goal) => {
    setGoalToDelete(goal);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!goalToDelete) return;

    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', goalToDelete.id);

    if (error) {
      toast.error('Error deleting goal: ' + error.message);
    } else {
      toast.success('Goal deleted successfully!');
      setGoals(goals.filter((g) => g.id !== goalToDelete.id));
    }
    setIsDeleteConfirmOpen(false);
    setGoalToDelete(null);
  };

  if (loading) {
    return <div>Loading goals...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Your Financial Goals</h1>
        <Dialog open={isAddFormOpen} onOpenChange={setIsAddFormOpen}>
          <DialogTrigger asChild>
            <Button>Add New Goal</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Goal</DialogTitle>
              <DialogDescription>
                Fill in the details below to create a new financial goal.
              </DialogDescription>
            </DialogHeader>
            <GoalForm session={session} onSave={handleGoalSave} onCancel={() => setIsAddFormOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Goal Dialog */}
      <Dialog open={isEditFormOpen} onOpenChange={setIsEditFormOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Goal</DialogTitle>
            <DialogDescription>
              Update the details of your financial goal.
            </DialogDescription>
          </DialogHeader>
          {selectedGoal && (
            <GoalForm session={session} onSave={handleGoalSave} onCancel={() => setIsEditFormOpen(false)} goal={selectedGoal} />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the goal "{goalToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className={styles.actions}>
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      {goals.length === 0 ? (
        <p>No goals set yet. Start by adding a new goal!</p>
      ) : (
        <div className={styles.goalsGrid}>
          {goals.map((goal) => (
            <div key={goal.id} className={styles.goalCard}>
              <h2 className={styles.goalName}>{goal.name}</h2>
              <p className={styles.goalProgressText}>
                Progress: {goal.current_amount.toLocaleString()} / {goal.target_amount.toLocaleString()}
              </p>
              <div className={styles.progressBarContainer}>
                <div
                  className={styles.progressBarFill}
                  style={{ width: `${(goal.current_amount / goal.target_amount) * 100}%` }}
                ></div>
              </div>
              <p className={styles.goalAllocationText}>
                Allocation: {goal.allocation_value}{goal.allocation_type === 'PERCENT_TOTAL' ? '% of Total Income' : ''}
                {goal.allocation_type === 'PERCENT_SOURCE' && goal.source_income_id ? `% from Source ${goal.source_income_id}` : ''}
                {goal.allocation_type === 'FIXED_TOTAL' ? ` VND/month from Total Income` : ''}
                {goal.allocation_type === 'FIXED_SOURCE' && goal.source_income_id ? ` VND/month from Source ${goal.source_income_id}` : ''}
              </p>
              <div className={styles.cardActions}>
                <Button variant="outline" size="sm" onClick={() => handleEditClick(goal)}>Edit</Button>
                <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(goal)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

export default GoalsPage;
