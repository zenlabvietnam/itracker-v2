import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import type { Session } from '@supabase/supabase-js'; // Import Session type from Supabase
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import IncomeSourcesPage from './pages/IncomeSourcesPage';
import GoalsPage from './pages/GoalsPage'; // Import GoalsPage
import ReportsPage from './pages/ReportsPage'; // Import ReportsPage
import ProtectedRoute from './components/ProtectedRoute';
import { ThemeProvider } from './contexts/ThemeContext';
import { Toaster } from 'sonner';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div >
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <BrowserRouter basename="/itracker-v2/">
        <Routes>
          <Route path="/login" element={session ? <Navigate to="/" /> : <LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute session={session}>
                <DashboardPage session={session!} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/income-sources"
            element={
              <ProtectedRoute session={session}>
                <IncomeSourcesPage session={session!} />
              </ProtectedRoute>
            }
          />
          <Route // New route for GoalsPage
            path="/goals"
            element={
              <ProtectedRoute session={session}>
                <GoalsPage session={session!} />
              </ProtectedRoute>
            }
          />
          <Route // New route for ReportsPage
            path="/reports"
            element={
              <ProtectedRoute session={session}>
                <ReportsPage session={session!} />
              </ProtectedRoute>
            }
          />
          {/* Add other protected routes here later */}
        </Routes>
        <Toaster />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;