import { supabase } from '../lib/supabaseClient';

export default function LoginPage() {
  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
    if (error) {
      console.error('Error signing in with Google:', error);
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
      <div className="p-8 rounded-lg bg-gray-800 shadow-lg w-full max-w-md text-center">
        <h1 className="text-3xl font-bold mb-6">Income Tracker V2</h1>
        <div>
          <p className="mb-4">You are not signed in.</p>
          <button
            onClick={signInWithGoogle}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors duration-300"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    </div>
  );
}
