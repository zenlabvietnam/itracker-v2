import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';
import { format, startOfDay, startOfWeek, startOfMonth, startOfYear, differenceInSeconds } from 'date-fns';
import AccumulatedIncomeDisplay from '../components/AccumulatedIncomeDisplay';
import GoalSummaryCard from '../components/GoalSummaryCard'; // Import GoalSummaryCard
import IncomeContributionChart from '../components/IncomeContributionChart'; // Import IncomeContributionChart
import AppHeader from '../components/AppHeader'; // Import AppHeader
import styles from './DashboardPage.module.css'; // Import CSS Modules
import type { IncomeSource, Goal } from '../types'; // Import IncomeSource and Goal type

interface DashboardPageProps {
  session: Session;
}

interface IncomeSourceAccumulated {
  id: string;
  name: string;
  accumulated_amount: number;
}

export default function DashboardPage({ session }: DashboardPageProps) {
  const [totalAccumulatedIncome, setTotalAccumulatedIncome] = useState<number>(0);
  const [individualSources, setIndividualSources] = useState<IncomeSourceAccumulated[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIncomeSourcesForLocalCalc, setActiveIncomeSourcesForLocalCalc] = useState<IncomeSource[]>([]);
  const [initialFetchTimestamp, setInitialFetchTimestamp] = useState<Date | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState<'today' | 'week' | 'month' | 'year' | 'custom'>('month'); // Default to 'month'
  const [customStartDate, setCustomStartDate] = useState<Date | null>(startOfMonth(new Date()));

  // States for Goals Summary
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loadingGoals, setLoadingGoals] = useState<boolean>(true);
  const [errorGoals, setErrorGoals] = useState<string | null>(null);

  // Refs to hold the latest state values without being part of useCallback dependencies
  const totalAccumulatedIncomeRef = useRef(totalAccumulatedIncome);
  const individualSourcesRef = useRef(individualSources);
  const activeIncomeSourcesForLocalCalcRef = useRef(activeIncomeSourcesForLocalCalc);
  const initialFetchTimestampRef = useRef(initialFetchTimestamp);

  useEffect(() => {
    totalAccumulatedIncomeRef.current = totalAccumulatedIncome;
  }, [totalAccumulatedIncome]);

  useEffect(() => {
    individualSourcesRef.current = individualSources;
  }, [individualSources]);

  useEffect(() => {
    activeIncomeSourcesForLocalCalcRef.current = activeIncomeSourcesForLocalCalc;
  }, [activeIncomeSourcesForLocalCalc]);

  useEffect(() => {
    initialFetchTimestampRef.current = initialFetchTimestamp;
  }, [initialFetchTimestamp]);

  // Effect for initial income data fetch when date range or user changes
  useEffect(() => {
    const getStartDate = () => {
      const now = new Date();
      switch (selectedDateRange) {
        case 'today':
          return startOfDay(now);
        case 'week':
          return startOfWeek(now, { weekStartsOn: 1 }); // Monday
        case 'month':
          return startOfMonth(now);
        case 'year':
          return startOfYear(now);
        case 'custom':
          return customStartDate || startOfMonth(now); // Fallback to start of month if customStartDate is not set
        default:
          return startOfMonth(now);
      }
    };

    const localCalcStartDate = getStartDate();

    const fetchInitialData = async () => {
      setLoading(true);
      setError(null);

      // Only fetch active income sources for local calculation
      const { data: activeSourcesData, error: activeSourcesError } = await supabase
        .rpc('get_active_income_sources_for_user', { p_user_id: session.user.id });

      if (activeSourcesError) {
        console.error('Error fetching active income sources:', activeSourcesError?.message);
        setError(activeSourcesError?.message || null);
        setTotalAccumulatedIncome(0);
        setIndividualSources([]);
        setActiveIncomeSourcesForLocalCalc([]);
        setInitialFetchTimestamp(null);
      } else {
        setTotalAccumulatedIncome(0); // Start from 0 for local calculation
        setIndividualSources([]); // Start with empty individual sources
        setActiveIncomeSourcesForLocalCalc(activeSourcesData || []);
        setInitialFetchTimestamp(localCalcStartDate); // Set initial fetch timestamp to localCalcStartDate
      }
      setLoading(false);
    };

    fetchInitialData();

  }, [session.user.id, selectedDateRange, customStartDate]); // Dependencies are the actual values that should trigger a re-fetch

  // Effect for fetching goals
  const fetchGoals = useCallback(async () => {
    setLoadingGoals(true);
    const { data, error } = await supabase
      .from('goals')
      .select('*') // Fetch all goal details
      .eq('user_id', session.user.id);

    if (error) {
      console.error('Error fetching goals:', error.message);
      setErrorGoals(error.message);
      setGoals([]);
    } else {
      setGoals(data || []);
      setErrorGoals(null);
    }
    setLoadingGoals(false);
  }, [session.user.id]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchGoals();
    }
  }, [session?.user?.id, fetchGoals]);

  // Effect for local real-time calculation using setInterval
  useEffect(() => {
    const interval = setInterval(() => {
      // Only perform local calculation if initial data is loaded and timestamp is set
      if (!loading && !error && initialFetchTimestampRef.current && activeIncomeSourcesForLocalCalcRef.current.length > 0) {
        const now = new Date();
        const secondsSinceStart = differenceInSeconds(now, initialFetchTimestampRef.current);

        let currentTotalAccumulated = 0;
        const currentIndividualSources: IncomeSourceAccumulated[] = [];

        activeIncomeSourcesForLocalCalcRef.current.forEach(activeSource => {
          let perSecondAmount = 0;
          const secondsInDay = 24 * 60 * 60;
          const averageDaysInMonth = 365.25 / 12; // More precise average days in a month
          const averageDaysInYear = 365.25;

          if (activeSource.cycle === 'daily') {
            perSecondAmount = activeSource.amount / secondsInDay;
          } else if (activeSource.cycle === 'weekly') {
            const dailyAmount = activeSource.amount / 7;
            perSecondAmount = dailyAmount / secondsInDay;
          } else if (activeSource.cycle === 'monthly') {
            const dailyAmount = activeSource.amount / averageDaysInMonth;
            perSecondAmount = dailyAmount / secondsInDay;
          } else if (activeSource.cycle === 'yearly') {
            const dailyAmount = activeSource.amount / averageDaysInYear;
            perSecondAmount = dailyAmount / secondsInDay;
          }

          const accumulatedForSource = perSecondAmount * secondsSinceStart;

          currentTotalAccumulated += accumulatedForSource;
          currentIndividualSources.push({
            id: activeSource.id,
            name: activeSource.name,
            accumulated_amount: accumulatedForSource,
          });
        });

        // Only update state if locally calculated data is different
        // This comparison might be too strict for floating point numbers, but let's keep it for now.
        // A small tolerance might be needed for real-world applications.
        if (
          currentTotalAccumulated !== totalAccumulatedIncomeRef.current ||
          JSON.stringify(currentIndividualSources) !== JSON.stringify(individualSourcesRef.current)
        ) {
          setTotalAccumulatedIncome(currentTotalAccumulated);
          setIndividualSources(currentIndividualSources);
        }
      }
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [loading, error, initialFetchTimestamp]); // Dependencies for this useEffect

  return (
    <div className={styles.container}>
      <div className={styles.mainCard}>
        <AppHeader session={session} />
        <div className={styles.dateRangeControls}>
          <label htmlFor="customStartDate" className={styles.startDateLabel}>Start Date:</label>
          <div className={styles.dateRangeSelector}>
            <button
              className={`${styles.dateRangeButton} ${selectedDateRange === 'today' ? styles.activeButton : ''}`}
              onClick={() => {
                setSelectedDateRange('today');
                setCustomStartDate(startOfDay(new Date()));
              }}
            >
              Today
            </button>
            <button
              className={`${styles.dateRangeButton} ${selectedDateRange === 'week' ? styles.activeButton : ''}`}
              onClick={() => {
                setSelectedDateRange('week');
                setCustomStartDate(startOfWeek(new Date(), { weekStartsOn: 1 }));
              }}
            >
              Week
            </button>
            <button
              className={`${styles.dateRangeButton} ${selectedDateRange === 'month' ? styles.activeButton : ''}`}
              onClick={() => {
                setSelectedDateRange('month');
                setCustomStartDate(startOfMonth(new Date()));
              }}
            >
              Month
            </button>
            <button
              className={`${styles.dateRangeButton} ${selectedDateRange === 'year' ? styles.activeButton : ''}`}
              onClick={() => {
                setSelectedDateRange('year');
                setCustomStartDate(startOfYear(new Date()));
              }}
            >
              Year
            </button>
            <input
              type="date"
              id="customStartDate"
              className={styles.startDateInput}
              value={customStartDate ? format(customStartDate, 'yyyy-MM-dd') : ''}
              onChange={(e) => {
                setSelectedDateRange('custom'); // When user manually changes date, set range to custom
                setCustomStartDate(e.target.value ? new Date(e.target.value) : null);
              }}
            />
          </div>
        </div>
        <AccumulatedIncomeDisplay totalAccumulatedIncome={totalAccumulatedIncome} selectedDateRange={selectedDateRange} />
        <GoalSummaryCard goals={goals} loading={loadingGoals} error={errorGoals} />
        <div className={styles.contentCard}>
          <IncomeContributionChart individualSources={individualSources} totalAccumulatedIncome={totalAccumulatedIncome} />
        </div>
      </div>
    </div>
  );
}
