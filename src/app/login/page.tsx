'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { DEMO_MODE } from '@/lib/demo-data';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isReset, setIsReset] = useState(false);
  const [isSettingNewPassword, setIsSettingNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Check if user arrived via password reset link
  useEffect(() => {
    const handleRecovery = async () => {
      // Check URL hash (Supabase often puts tokens here)
      const hash = window.location.hash;
      const search = window.location.search;
      
      // Check multiple formats Supabase might use
      const isRecovery = 
        hash.includes('type=recovery') || 
        hash.includes('type%3Drecovery') ||
        search.includes('type=recovery') ||
        hash.includes('access_token') ||
        search.includes('error_code=');
      
      if (isRecovery) {
        // Let Supabase process the token first
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          setError('Password reset link has expired. Please request a new one.');
          return;
        }
        
        if (session) {
          setIsSettingNewPassword(true);
          setMessage('Enter your new password below.');
        }
      }
    };
    
    // Listen for auth state changes (Supabase auto-processes the token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event);
      if (event === 'PASSWORD_RECOVERY') {
        setIsSettingNewPassword(true);
        setMessage('Enter your new password below.');
      }
      if (event === 'SIGNED_IN' && window.location.hash.includes('type=recovery')) {
        setIsSettingNewPassword(true);
        setMessage('Enter your new password below.');
      }
    });
    
    // Small delay to let Supabase process the URL
    setTimeout(handleRecovery, 100);
    
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSettingNewPassword) {
        // User is setting a new password after clicking reset link
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (error) throw error;
        setMessage('Password updated successfully! You can now sign in.');
        setIsSettingNewPassword(false);
        setNewPassword('');
        // Clear the hash from URL
        window.history.replaceState(null, '', '/login');
      } else if (isReset) {
        // Password reset request
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login`,
        });
        if (error) throw error;
        setMessage('Check your email for a password reset link!');
        setIsReset(false);
      } else if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage('Check your email to confirm your account!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push('/threads');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-16">
      <h1 className="text-2xl font-bold mb-6 text-center">
        {isSettingNewPassword ? 'Set New Password' : isReset ? 'Reset Password' : isSignUp ? 'Create Account' : 'Sign In'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Show email field only when NOT setting new password */}
        {!isSettingNewPassword && (
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* New password field for recovery */}
        {isSettingNewPassword && (
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium mb-1">
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Enter your new password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Regular password field for sign in/up */}
        {!isReset && !isSettingNewPassword && (
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-3 rounded">
            {error}
          </div>
        )}

        {message && (
          <div className="text-green-600 text-sm bg-green-50 p-3 rounded">
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Loading...' : isSettingNewPassword ? 'Update Password' : isReset ? 'Send Reset Link' : isSignUp ? 'Sign Up' : 'Sign In'}
        </button>

        {DEMO_MODE && !isReset && !isSettingNewPassword && (
          <button
            type="button"
            onClick={() => router.push('/threads')}
            className="w-full mt-3 bg-yellow-500 text-white py-2 rounded-md hover:bg-yellow-600"
          >
            🎭 Enter Demo Mode
          </button>
        )}
      </form>

      <div className="mt-4 text-center text-sm text-gray-600 space-y-2">
        {isReset ? (
          <button
            onClick={() => setIsReset(false)}
            className="text-blue-600 hover:underline"
          >
            ← Back to Sign In
          </button>
        ) : (
          <>
            <p>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-blue-600 hover:underline"
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
            {!isSignUp && (
              <p>
                <button
                  onClick={() => setIsReset(true)}
                  className="text-blue-600 hover:underline"
                >
                  Forgot Password?
                </button>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
