import React from 'react';
import styles from './AccumulatedIncomeDisplay.module.css'; // Import CSS Modules

interface AccumulatedIncomeDisplayProps {
  totalAccumulatedIncome: number;
  selectedDateRange: 'today' | 'week' | 'month' | 'year' | 'custom';
}

const AccumulatedIncomeDisplay: React.FC<AccumulatedIncomeDisplayProps> = React.memo(
  ({ totalAccumulatedIncome, selectedDateRange }) => {
    return (
      <div className={styles.container}>
        <h2 className={styles.heading}>Accumulated Income ({selectedDateRange.charAt(0).toUpperCase() + selectedDateRange.slice(1)})</h2>
        <p className={styles.amount}>
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalAccumulatedIncome)}
        </p>
      </div>
    );
  }
);

AccumulatedIncomeDisplay.displayName = 'AccumulatedIncomeDisplay';

export default AccumulatedIncomeDisplay;
