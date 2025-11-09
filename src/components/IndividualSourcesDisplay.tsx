import React from 'react';
import styles from './IndividualSourcesDisplay.module.css'; // Import CSS Modules

interface IncomeSourceAccumulated {
  id: string;
  name: string;
  accumulated_amount: number;
}

interface IndividualSourcesDisplayProps {
  individualSources: IncomeSourceAccumulated[];
}

const IndividualSourcesDisplay: React.FC<IndividualSourcesDisplayProps> = React.memo(
  ({ individualSources }) => {
    return (
      <>
        <h3 className={styles.heading}>Individual Sources</h3>
        {individualSources.length === 0 ? (
          <p className={styles.noSourcesMessage}>No active income sources found for this period.</p>
        ) : (
          <ul className={styles.sourceList}>
            {individualSources.map((source) => (
              <li key={source.id} className={styles.sourceItem}>
                <span className={styles.sourceName}>{source.name}</span>
                <span className={styles.sourceAmount}>
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(source.accumulated_amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </>
    );
  }
);

IndividualSourcesDisplay.displayName = 'IndividualSourcesDisplay';

export default IndividualSourcesDisplay;
