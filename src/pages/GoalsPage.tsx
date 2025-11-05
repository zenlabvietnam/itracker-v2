import React, { useEffect, useState } from 'react';
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
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import GoalForm from '../components/GoalForm';

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
  session: Session; // Add session prop
}

const GoalsPage: React.FC<GoalsPageProps> = ({ session }) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);

  const fetchGoals = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('goals')
      .select('*');

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data) {
      setGoals(data);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleGoalSave = () => {
    setIsFormOpen(false);
    fetchGoals(); // Re-fetch goals after saving
  };

  if (loading) {
    return <div>Loading goals...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Your Financial Goals</h1>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
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
            <GoalForm session={session} onSave={handleGoalSave} onCancel={() => setIsFormOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
      {goals.length === 0 ? (
        <p>No goals set yet. Start by adding a new goal!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((goal) => (
            <div key={goal.id} className="bg-white shadow-md rounded-lg p-4">
              <h2 className="text-xl font-semibold mb-2">{goal.name}</h2>
              <p className="text-gray-700">
                Progress: {goal.current_amount.toLocaleString()} / {goal.target_amount.toLocaleString()}
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-2">
                <div
                  className="bg-blue-600 h-2.5 rounded-full"
                  style={{ width: `${(goal.current_amount / goal.target_amount) * 100}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Allocation: {goal.allocation_value}{goal.allocation_type === 'percentage_total_income' ? '% of Total Income' : ''}
                {goal.allocation_type === 'percentage_specific_income' && goal.source_income_id ? `% from Source ${goal.source_income_id}` : ''}
                {goal.allocation_type === 'fixed_amount_total_income' ? ` VND/month from Total Income` : ''}
                {goal.allocation_type === 'fixed_amount_specific_income' && goal.source_income_id ? ` VND/month from Source ${goal.source_income_id}` : ''}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GoalsPage;
