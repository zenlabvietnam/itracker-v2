import React from 'react';
import { Link } from 'react-router-dom'; // Assuming react-router-dom for navigation
import type { Goal } from '../types';
import styles from './GoalSummaryCard.module.css';

interface GoalSummaryCardProps {
  goals: Goal[];
  loading: boolean;
  error: string | null;
}

const GoalSummaryCard: React.FC<GoalSummaryCardProps> = ({ goals, loading, error }) => {
  if (loading) {
    return <div className={styles.card}>Loading goals summary...</div>;
  }

  if (error) {
    return <div className={`${styles.card} ${styles.error}`}>Error loading goals: {error}</div>;
  }

  const activeGoals = goals.filter(goal => goal.current_amount < goal.target_amount);
  const completedGoals = goals.filter(goal => goal.current_amount >= goal.target_amount);

  const totalTargetAmount = goals.reduce((sum, goal) => sum + goal.target_amount, 0);
  const totalCurrentAmount = goals.reduce((sum, goal) => sum + goal.current_amount, 0);
  const overallProgress = totalTargetAmount > 0 ? (totalCurrentAmount / totalTargetAmount) * 100 : 0;

  return (
    <div className={styles.card}>
      <h2 className={styles.title}>Goal Summary</h2>
      <p>Active Goals: {activeGoals.length}</p>
      <p>Completed Goals: {completedGoals.length}</p>
      <div className={styles.progressBarContainer}>
        <div className={styles.progressBarFill} style={{ width: `${Math.min(100, overallProgress)}%` }}></div>
      </div>
      <p className={styles.progressText}>Overall Progress: {overallProgress.toFixed(2)}%</p>
      <Link to="/goals" className={styles.link}>View All Goals</Link>
    </div>
  );
};

export default GoalSummaryCard;
