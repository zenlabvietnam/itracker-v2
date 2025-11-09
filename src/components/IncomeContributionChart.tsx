import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import styles from './IncomeContributionChart.module.css';

interface IncomeSourceAccumulated {
  id: string;
  name: string;
  accumulated_amount: number;
}

interface IncomeContributionChartProps {
  individualSources: IncomeSourceAccumulated[];
  totalAccumulatedIncome: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28DFF', '#FF6666', '#66B2FF', '#FFD700'];

const IncomeContributionChart: React.FC<IncomeContributionChartProps> = ({ individualSources, totalAccumulatedIncome }) => {
  if (!individualSources || individualSources.length === 0 || totalAccumulatedIncome === 0) {
    return <div className={styles.noDataMessage}>No income data to display for the selected period.</div>;
  }

  const chartData = individualSources.map((source, index) => ({
    name: source.name,
    value: source.accumulated_amount,
    percentage: (source.accumulated_amount / totalAccumulatedIncome) * 100,
    color: COLORS[index % COLORS.length],
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className={styles.customTooltip}>
          <p className={styles.tooltipLabel}>{data.name}</p>
          <p className={styles.tooltipValue}>Amount: {data.value.toLocaleString()} VND</p>
          <p className={styles.tooltipPercentage}>Contribution: {data.percentage.toFixed(2)}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={styles.chartContainer}>
      <h2 className={styles.chartTitle}>Income Source Contribution</h2>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className={styles.legend}>
        {chartData.map((entry, index) => (
          <div key={`legend-${index}`} className={styles.legendItem}>
            <span className={styles.legendColor} style={{ backgroundColor: entry.color }}></span>
            <span className={styles.legendText}>{entry.name} ({entry.percentage.toFixed(2)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default IncomeContributionChart;
