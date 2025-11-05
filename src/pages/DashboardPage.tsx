import { supabase } from '../lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';

interface DashboardPageProps {
  session: Session;
}

export default function DashboardPage({ session }: DashboardPageProps) {
  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
      <div className="p-8 rounded-lg bg-gray-800 shadow-lg w-full max-w-md text-center">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        <div>
          <p className="mb-4">
            Signed in as: <strong className="font-mono">{session.user.email}</strong>
          </p>
          <button
            onClick={signOut}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md transition-colors duration-300"
          >
            Logout
          </button>
          <Button className="mt-4" variant="outline">shadcn/ui Button</Button>
          <Link to="/income-sources" className="block mt-4 text-blue-400 hover:underline">
            View Income Sources
          </Link>
        </div>
      </div>
    </div>
  );
}
