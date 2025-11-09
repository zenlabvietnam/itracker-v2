import React from 'react';
import { Button } from './ui/button';
import styles from './DateRangeSelector.module.css'; // Import CSS Modules

type DateRange = 'today' | 'week' | 'month' | 'year' | 'custom'; // Added 'custom'

interface DateRangeSelectorProps {
  selectedDateRange: DateRange;
  setSelectedDateRange: (range: DateRange) => void;
}

const DateRangeSelector: React.FC<DateRangeSelectorProps> = React.memo(
  ({
    selectedDateRange,
    setSelectedDateRange
  }) => {
    return (
      <div className={styles.buttonGroup}>
        {(['today', 'week', 'month', 'year', 'custom'] as DateRange[]).map((range) => (
          <Button
            key={range}
            variant={selectedDateRange === range ? 'default' : 'outline'}
            onClick={() => setSelectedDateRange(range)}
            className={selectedDateRange === range ? styles.buttonDefault : styles.buttonOutline}
          >
            {range.charAt(0).toUpperCase() + range.slice(1)}
          </Button>
        ))}
      </div>
    );
  }
);

DateRangeSelector.displayName = 'DateRangeSelector';

export default DateRangeSelector;
