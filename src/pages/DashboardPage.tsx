import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';
import { Button } from '../components/ui/button';
import { format, startOfDay, startOfWeek, startOfMonth, startOfYear, parseISO, differenceInSeconds } from 'date-fns';
import DateRangeSelector from '../components/DateRangeSelector';
import AccumulatedIncomeDisplay from '../components/AccumulatedIncomeDisplay';
import IndividualSourcesDisplay from '../components/IndividualSourcesDisplay';
import styles from './DashboardPage.module.css'; // Import CSS Modules
import type { IncomeSource } from '../types'; // Import IncomeSource type

interface DashboardPageProps {
  session: Session;
}

interface IncomeSourceAccumulated {
  id: string;
  name: string;
  accumulated_amount: number;
}



type DateRange = 'today' | 'week' | 'month' | 'year' | 'custom'; // Added 'custom'

export default function DashboardPage({ session }: DashboardPageProps) {
  const [totalAccumulatedIncome, setTotalAccumulatedIncome] = useState<number>(0);
  const [individualSources, setIndividualSources] = useState<IncomeSourceAccumulated[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange>('month'); // Default to 'month'
  const [customStartDate, setCustomStartDate] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd')); // State for custom start date
  const [activeIncomeSourcesForLocalCalc, setActiveIncomeSourcesForLocalCalc] = useState<IncomeSource[]>([]);
  const [initialFetchTimestamp, setInitialFetchTimestamp] = useState<Date | null>(null);

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

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    }
  }

  const calculateDateRange = useCallback(() => {
    const today = new Date();
    let localCalcStartDate: Date; // Start date for local calculation

    switch (selectedDateRange) {
      case 'today':
        localCalcStartDate = startOfDay(today); // Local calculation starts from beginning of today
        break;
      case 'week':
        localCalcStartDate = startOfWeek(today, { weekStartsOn: 1 }); // Local calculation starts from beginning of the week (Monday)
        break;
      case 'month':
        localCalcStartDate = startOfMonth(today); // Local calculation starts from beginning of the month
        break;
      case 'year':
        localCalcStartDate = startOfYear(today); // Local calculation starts from beginning of the year
        break;
      case 'custom':
        localCalcStartDate = parseISO(customStartDate); // Local calculation starts from custom start date
        break;
      default:
        localCalcStartDate = startOfMonth(today);
    }
    return { localCalcStartDate };
  }, [selectedDateRange, customStartDate]); // Added customStartDate to dependencies

  // Effect for initial data fetch when date range or user changes
  useEffect(() => {
    const { localCalcStartDate } = calculateDateRange();

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

  }, [session.user.id, selectedDateRange, customStartDate, calculateDateRange]); // Dependencies are the actual values that should trigger a re-fetch

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
  }, [loading, error]); // Dependencies for this useEffect

  return (
    <div className={styles.container}>
      <div className={styles.mainCard}>
        <h1 className={styles.title}>Dashboard</h1>
        <p className={styles.emailSection}>
          <span className={styles.emailText}>Signed in as: <strong>{session.user.email}</strong></span>
          <Button
            onClick={signOut}
            className="small-red-button" // Custom class for styling
          >
            Logout
          </Button>
        </p>

        <DateRangeSelector selectedDateRange={selectedDateRange} setSelectedDateRange={setSelectedDateRange} />
        
        {selectedDateRange === 'custom' && (
          <div className={styles.customDateInputContainer}>
            <label htmlFor="custom-start-date" className={styles.customDateLabel}>Start Date:</label>
            <input
              type="date"
              id="custom-start-date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className={styles.customDateInput}
            />
          </div>
        )}

        {loading && <p className={styles.loadingMessage}>Loading income data...</p>}
        {error && <p className={styles.errorMessage}>Error: {error}</p>}

        {!loading && !error && (
          <div className={styles.contentCard}>
            <AccumulatedIncomeDisplay
              totalAccumulatedIncome={totalAccumulatedIncome}
              selectedDateRange={selectedDateRange}
            />
            <IndividualSourcesDisplay individualSources={individualSources} />
          </div>
        )}
      </div>
    </div>
  );
}
