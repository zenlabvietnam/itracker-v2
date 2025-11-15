import React, { useState, useEffect, useCallback } from 'react';
import AppHeader from '../components/AppHeader';
import { supabase } from '../lib/supabaseClient';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'; // Import shadcn/ui Select components
import styles from './ReportsPage.module.css';
import type { IncomeSource } from '../types'; // Import IncomeSource from types
import type { Session } from '@supabase/supabase-js'; // Import Session type from Supabase
import dashboardStyles from './DashboardPage.module.css'; // Import DashboardPage styles

interface ChartData {
  month: string;
  totalIncome: number;
}

interface ReportsPageProps {
  session: Session;
}

const ReportsPage: React.FC<ReportsPageProps> = ({ session }) => {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'last12Months' | 'thisYear' | 'thisMonth'>('last12Months');

  const fetchIncomeData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: incomeSources, error: fetchError } = await supabase
      .from('income_sources')
      .select('id, name, amount, cycle, status')
      .eq('user_id', session.user.id)
      .eq('status', 'active'); // Only consider active income sources

    if (fetchError) {
      console.error('Error fetching income sources:', fetchError.message);
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    console.log('Fetched income sources:', incomeSources);

    if (!incomeSources || incomeSources.length === 0) {
      console.log('No active income sources found.');
      setChartData([]);
      setLoading(false);
      return;
    }

    const typedIncomeSources: IncomeSource[] = incomeSources as IncomeSource[];

    // Aggregate income by month
    const monthlyIncomeMap = new Map<string, number>(); // Key: YYYY-MM, Value: total income

    const today = new Date();
    let startDate: Date;
    const endDate: Date = today;

    switch (selectedPeriod) {
      case 'thisMonth':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'thisYear':
        startDate = new Date(today.getFullYear(), 0, 1);
        break;
      case 'last12Months':
      default:
        startDate = new Date(today.getFullYear(), today.getMonth() - 11, 1);
        break;
    }

    // Initialize monthlyIncomeMap for the selected period
    let currentMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    while (currentMonth <= endDate) {
      const monthKey = `${currentMonth.getFullYear()}-${(currentMonth.getMonth() + 1).toString().padStart(2, '0')}`;
      monthlyIncomeMap.set(monthKey, 0);
      currentMonth.setMonth(currentMonth.getMonth() + 1);
    }

    console.log('Initialized monthlyIncomeMap:', monthlyIncomeMap);

    typedIncomeSources.forEach(source => {
      let monthlyAmount = 0;
      switch (source.cycle) {
        case 'weekly':
          monthlyAmount = source.amount * (52 / 12); // Convert weekly to monthly
          break;
        case 'monthly':
          monthlyAmount = source.amount;
          break;
        case 'yearly':
          monthlyAmount = source.amount / 12;
          break;
        default:
          monthlyAmount = 0;
      }

      // Distribute monthly amount across the selected period
      let distributionMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1); // Use a new variable for distribution
      while (distributionMonth <= endDate) {
        const monthKey = `${distributionMonth.getFullYear()}-${(distributionMonth.getMonth() + 1).toString().padStart(2, '0')}`;
        if (monthlyIncomeMap.has(monthKey)) {
          monthlyIncomeMap.set(monthKey, monthlyIncomeMap.get(monthKey)! + monthlyAmount);
        }
        distributionMonth.setMonth(distributionMonth.getMonth() + 1);
      }
    });

    console.log('monthlyIncomeMap after distribution:', monthlyIncomeMap);

    const formattedChartData: ChartData[] = Array.from(monthlyIncomeMap.entries())
      .sort(([monthA], [monthB]) => monthA.localeCompare(monthB)) // Sort by month
      .map(([month, totalIncome]) => ({
        month: month, // e.g., "2023-01"
        totalIncome: parseFloat(totalIncome.toFixed(2)),
      }));

    console.log('Formatted chart data:', formattedChartData);

    setChartData(formattedChartData);
    setLoading(false);
  }, [session.user.id, selectedPeriod]); // Add selectedPeriod to dependencies

  useEffect(() => {
    if (session?.user?.id) {
      fetchIncomeData();
    }
  }, [session, fetchIncomeData]);

  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <AppHeader session={session} />
        <div className={styles.pageContent}>
          <p>Loading income data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.pageContainer}>
        <AppHeader session={session} />
        <div className={styles.pageContent}>
          <p>Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={dashboardStyles.container}>
      <div className={dashboardStyles.mainCard}>
        <AppHeader session={session} />
        <h1 className={styles.title}>Income Reports</h1>
        <div className={styles.filters}>
          <Select value={selectedPeriod} onValueChange={(value: 'last12Months' | 'thisYear' | 'thisMonth') => setSelectedPeriod(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last12Months">Last 12 Months</SelectItem>
              <SelectItem value="thisYear">This Year</SelectItem>
              <SelectItem value="thisMonth">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className={styles.chartContainer}>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <svg width="100%" height="100%">
                <rect x="10" y="10" width="100" height="100" fill="red" />
              </svg>
            </ResponsiveContainer>
          ) : (
            <p className={styles.noDataMessage}>No income data available for the selected period.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
