import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
// Define a local Session type to avoid import issues
interface Session {
  user: {
    id: string;
    email?: string;
    // Add other user properties if needed
  };
  // Add other session properties if needed
}
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import IncomeSourcesPage from './pages/IncomeSourcesPage';
import GoalsPage from './pages/GoalsPage'; // Import GoalsPage
import ProtectedRoute from './components/ProtectedRoute';
import { Toaster } from 'sonner';
import { Button } from './components/ui/button'; // Import the new Button component

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
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={session ? <Navigate to="/" /> : <LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute session={session}>
              <DashboardPage session={session!} />
              <Button>Test Button</Button> {/* Render the new Button component */}
              <Link to="/goals">
                <Button>Goals</Button>
              </Link>
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
        {/* Add other protected routes here later */}
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;