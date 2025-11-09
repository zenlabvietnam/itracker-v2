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
  income_sources?: { name: string } | null; // Thêm trường này
  forecasted_completion_date?: string | null;
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
  const [totalIncome, setTotalIncome] = useState<number>(0);
  const [incomeSources, setIncomeSources] = useState<any[]>([]); // Thêm state này
    const [totalAllocatedAmount, setTotalAllocatedAmount] = useState<number>(0);
    const [isOverAllocated, setIsOverAllocated] = useState<boolean>(false); // Thêm state này
  
    // Hàm trợ giúp để tính toán số tiền phân bổ hàng tháng
    const calculateMonthlyAllocation = (goal: Goal, allIncomeSources: any[], currentTotalIncome: number) => {
      let monthlyAllocation = 0;
      const sourceIncome = allIncomeSources.find(source => source.id === goal.source_income_id);
  
      switch (goal.allocation_type) {
        case 'PERCENT_TOTAL':
          monthlyAllocation = (currentTotalIncome * goal.allocation_value) / 100;
          break;
        case 'PERCENT_SOURCE':
          if (sourceIncome) {
                      let sourceMonthlyAmount = sourceIncome.amount;
                      if (sourceIncome.cycle === 'weekly') {
                        sourceMonthlyAmount *= (52 / 12);
                      } else if (sourceIncome.cycle === 'bi-weekly') {
                        sourceMonthlyAmount *= (26 / 12);
                      }
                      monthlyAllocation = (sourceMonthlyAmount * goal.allocation_value) / 100;          }
          break;
        case 'FIXED_TOTAL':
          monthlyAllocation = goal.allocation_value;
          if (goal.allocation_cycle === 'weekly') {
            monthlyAllocation *= (52 / 12);
          } else if (goal.allocation_cycle === 'bi-weekly') {
            monthlyAllocation *= (26 / 12);
          } else if (goal.allocation_cycle === 'annually') {
            monthlyAllocation /= 12;
          }
          break;
        case 'FIXED_SOURCE':
          if (sourceIncome) {
            monthlyAllocation = goal.allocation_value;
            if (goal.allocation_cycle === 'weekly') {
              monthlyAllocation *= (52 / 12);
            } else if (goal.allocation_cycle === 'bi-weekly') {
              monthlyAllocation *= (26 / 12);
            } else if (goal.allocation_cycle === 'annually') {
              monthlyAllocation /= 12;
            }
          }
          break;
        default:
          monthlyAllocation = 0;
      }
      return monthlyAllocation;
    };
  
    const fetchTotalIncome = async () => {
          const { data, error } = await supabase
            .from('income_sources')
            .select('id, name, amount, cycle') // Lấy cột 'cycle' thay vì 'frequency'
            .eq('user_id', session.user.id);
      
          if (error) {
            console.error('Error fetching income sources:', error.message);
            return { total: 0, sources: [] };
          }
      
          let calculatedTotalIncome = 0;
          if (data) {
            setIncomeSources(data);
            calculatedTotalIncome = data.reduce((sum, source) => {
              let monthlyAmount = source.amount;
              if (source.cycle === 'weekly') {
                monthlyAmount *= (52 / 12); // Convert weekly to monthly
              } else if (source.cycle === 'bi-weekly') {
                monthlyAmount *= (26 / 12); // Convert bi-weekly to monthly
              } else if (source.cycle === 'annually') {
                monthlyAmount /= 12; // Convert annually to monthly
              }
              return sum + monthlyAmount;
            }, 0);
          }
          setTotalIncome(calculatedTotalIncome);
          return { total: calculatedTotalIncome, sources: data || [] };
        };  
    const fetchGoals = async (currentTotalIncome: number, allIncomeSources: any[]) => {
      setLoading(true);
      const { data, error } = await supabase
        .from('goals')
        .select('*, income_sources(name), forecasted_completion_date') // Sửa đổi câu lệnh select
        .eq('user_id', session.user.id);
  
      if (error) {
        setError(error.message);
      } else if (data) {
        setGoals(data);
        const totalAllocated = data.reduce((sum, goal) => {
          return sum + calculateMonthlyAllocation(goal, allIncomeSources, currentTotalIncome);
        }, 0);
        setTotalAllocatedAmount(totalAllocated);
        setIsOverAllocated(totalAllocated > currentTotalIncome); // Cập nhật isOverAllocated
      }
      setLoading(false);
    };

  useEffect(() => {
    if (session?.user?.id) {
      const initializeData = async () => {
        const { total, sources } = await fetchTotalIncome();
        setTotalIncome(total);
        setIncomeSources(sources);
        fetchGoals(total, sources);
      };
      initializeData();
    }
  }, [session]);

  const handleGoalSave = async () => {
    setIsAddFormOpen(false);
    setIsEditFormOpen(false);
    const { total, sources } = await fetchTotalIncome();
    setTotalIncome(total);
    setIncomeSources(sources);
    await fetchGoals(total, sources); // Ensure fetchGoals completes before proceeding
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
  };

  if (error) {
    return <div>Error: {error}</div>;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Your Financial Goals</h1>
        {isOverAllocated && (
          <div className={styles.warningMessage}>
            Cảnh báo: Tổng số tiền phân bổ cho các mục tiêu của bạn vượt quá tổng thu nhập dự kiến. Vui lòng điều chỉnh kế hoạch của bạn.
          </div>
        )}
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
            <GoalForm session={session} onSave={handleGoalSave} onCancel={() => setIsAddFormOpen(false)} isOverAllocated={isOverAllocated} />
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
            <GoalForm session={session} onSave={handleGoalSave} onCancel={() => setIsEditFormOpen(false)} goal={selectedGoal} isOverAllocated={isOverAllocated} />
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
                {goal.target_amount > 0 && (
                  <span> ({((goal.current_amount / goal.target_amount) * 100).toFixed(2)}% hoàn thành)</span>
                )}
              </p>
              <div className={styles.progressBarContainer}>
                <div
                  className={styles.progressBarFill}
                  style={{ width: `${Math.min(100, (goal.current_amount / goal.target_amount) * 100)}%` }}
                ></div>
              </div>
              {goal.forecasted_completion_date && (
                <p className={styles.goalForecastText}>
                  Estimated Completion: {new Date(goal.forecasted_completion_date).toLocaleDateString()}
                </p>
              )}
              {goal.current_amount >= goal.target_amount && (
                <p className={styles.goalCompletedText}>Hoàn thành!</p>
              )}
              <p className={styles.goalAllocationText}>
                Allocation: {goal.allocation_value}{goal.allocation_type === 'PERCENT_TOTAL' ? '% of Total Income' : ''}
                {goal.allocation_type === 'PERCENT_SOURCE' && goal.income_sources?.name ? `% from Source ${goal.income_sources.name}` : ''}
                {goal.allocation_type === 'FIXED_SOURCE' && goal.income_sources?.name ? ` VND/month from Source ${goal.income_sources.name}` : ''}
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
};

export default GoalsPage;
