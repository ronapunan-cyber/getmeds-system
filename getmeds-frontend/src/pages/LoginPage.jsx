import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import ErrorMessage from '../components/ui/ErrorMessage';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { LogIn, FlaskConical, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

const QUICK_ROLES = [
  { role: 'Admin', email: 'admin@getmeds.ph', color: 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200' },
  { role: 'MedRep', email: 'medrep@getmeds.ph', color: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200' },
  { role: 'Finance', email: 'finance@getmeds.ph', color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200' },
  { role: 'Dispatch', email: 'dispatch@getmeds.ph', color: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200' },
  { role: 'Manager', email: 'manager@getmeds.ph', color: 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200' },
];

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login, quickLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to log in. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (quickEmail) => {
    setError(null);
    setIsLoading(true);
    try {
      if (quickLogin) {
        await quickLogin(quickEmail);
      } else {
        await login(quickEmail, 'demo123');
      }
      navigate('/dashboard');
    } catch (err) {
      try {
        await login(quickEmail, 'demo123');
        navigate('/dashboard');
      } catch (fallbackErr) {
        setError(err.response?.data?.error?.message || err.response?.data?.message || 'Quick login failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        <div>
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
            <LogIn className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            GetMeds System
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to your account
          </p>
        </div>

        {/* Local Test Mode Quick Access */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-amber-900 font-semibold">
              <FlaskConical size={18} className="text-amber-600 flex-shrink-0" />
              <span>Developer Test Mode</span>
            </div>
            <Link
              to="/test-mode"
              className="font-semibold text-amber-700 hover:text-amber-900 underline"
            >
              Test Mode Hub &rarr;
            </Link>
          </div>

          <div>
            <div className="text-[11px] text-amber-800/80 mb-2 flex items-center font-medium">
              <Zap size={13} className="mr-1 text-amber-600" /> 1-Click Quick Login by Role:
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {QUICK_ROLES.map((r) => (
                <button
                  key={r.role}
                  type="button"
                  onClick={() => handleQuickLogin(r.email)}
                  disabled={isLoading}
                  className={`px-2 py-1.5 rounded border text-xs font-semibold transition-colors text-center disabled:opacity-50 ${r.color}`}
                >
                  {r.role}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <form className="space-y-6 bg-white p-8 rounded-lg shadow-md" onSubmit={handleSubmit}>
          {error && <ErrorMessage message={error} />}
          
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="email-address" className="sr-only">Email address</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading ? <LoadingSpinner size="sm" className="mr-2" /> : null}
              Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
