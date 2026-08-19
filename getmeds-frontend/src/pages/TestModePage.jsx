import React, { useState, useEffect } from 'react';
import client from '../api/client';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorMessage from '../components/ui/ErrorMessage';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import { 
  FlaskConical, 
  UserPlus, 
  Trash2, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Copy, 
  Check, 
  ShieldAlert, 
  ArrowRight,
  Eye,
  EyeOff,
  Users,
  KeyRound
} from 'lucide-react';

const roleBadgeColors = {
  admin: 'bg-red-100 text-red-800 border-red-200',
  management: 'bg-purple-100 text-purple-800 border-purple-200',
  finance: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  dispatch: 'bg-amber-100 text-amber-800 border-amber-200',
  medrep: 'bg-blue-100 text-blue-800 border-blue-200',
};

const TestModePage = () => {
  const { login, logout, user: currentUser } = useAuth();
  const navigate = useNavigate();

  // Test Mode Status
  const [statusLoading, setStatusLoading] = useState(true);
  const [testModeEnabled, setTestModeEnabled] = useState(false);
  const [serverEnv, setServerEnv] = useState('development');
  const [serverDebug, setServerDebug] = useState(false);

  // Form Fields
  const [count, setCount] = useState(3);
  const [prefix, setPrefix] = useState('testuser');
  const [role, setRole] = useState('medrep');
  const [domain, setDomain] = useState('test.getmeds.ph');
  const [password, setPassword] = useState('TestPass123!');
  const [showPassword, setShowPassword] = useState(false);

  // Operations state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Results & Accounts
  const [creationResults, setCreationResults] = useState(null);
  const [existingAccounts, setExistingAccounts] = useState([]);
  const [copiedKey, setCopiedKey] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Check backend test mode status
  const checkStatus = async () => {
    setStatusLoading(true);
    setError(null);
    try {
      const res = await client.get('/api/test/status');
      if (res.data?.success) {
        setTestModeEnabled(res.data.data.testMode);
        setServerEnv(res.data.data.environment);
        setServerDebug(res.data.data.debug);
        if (res.data.data.testMode) {
          fetchExistingAccounts();
        }
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to connect to backend test endpoint.');
      setTestModeEnabled(false);
    } finally {
      setStatusLoading(false);
    }
  };

  // Fetch list of active test accounts
  const fetchExistingAccounts = async () => {
    setIsFetching(true);
    try {
      const res = await client.get('/api/test/accounts');
      if (res.data?.success) {
        setExistingAccounts(res.data.data.accounts || []);
      }
    } catch (err) {
      console.error('Failed to fetch test accounts:', err);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCreateAccounts = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const payload = {
        count: parseInt(count, 10),
        prefix,
        role,
        domain,
        password
      };

      const res = await client.post('/api/test/accounts', payload);
      if (res.data?.success) {
        setCreationResults(res.data.data);
        setSuccessMessage(`Successfully processed bulk creation: ${res.data.data.createdCount} created, ${res.data.data.failedCount} failed.`);
        fetchExistingAccounts();
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to create test accounts');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCleanup = async () => {
    setIsCleaning(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await client.post('/api/test/accounts/cleanup');
      if (res.data?.success) {
        setSuccessMessage(`Cleaned up ${res.data.data.deletedCount} test accounts safely. Production and seed accounts were preserved.`);
        setCreationResults(null);
        fetchExistingAccounts();
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to clean up test accounts');
    } finally {
      setIsCleaning(false);
    }
  };

  const handleQuickLogin = async (accountEmail, accountPassword) => {
    setError(null);
    try {
      if (currentUser) {
        logout();
      }
      await login(accountEmail, accountPassword || password);
      navigate('/dashboard');
    } catch (err) {
      setError(`Quick login failed: ${err.response?.data?.error?.message || err.message}`);
    }
  };

  if (statusLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600 font-medium">Checking Test Mode status...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-lg ${testModeEnabled ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
              <FlaskConical size={28} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold text-gray-900">Developer Test Mode</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                  testModeEnabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {testModeEnabled ? 'Active' : 'Disabled'}
                </span>
                {serverDebug && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 uppercase">
                    Debug ON
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Fast local development and bulk test account generation with zero production side-effects.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={checkStatus}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <RefreshCw size={16} className={`mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh Status
            </button>
            <Link
              to="/"
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Back to App
            </Link>
          </div>
        </div>

        {/* Safeguard & Environment Information Notice */}
        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-600">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-gray-700">Environment:</span>
            <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{serverEnv}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-gray-700">Backend Guard:</span>
            <span className="text-green-600 font-medium">Production lock enabled</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-gray-700">Side Effects:</span>
            <span className="text-blue-600 font-medium">Bypassed (simulated logs only)</span>
          </div>
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg flex items-center justify-between">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-2 flex-shrink-0" />
            <span className="text-sm font-medium">{successMessage}</span>
          </div>
          <button 
            onClick={() => setSuccessMessage(null)}
            className="text-green-600 hover:text-green-800 text-sm font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {!testModeEnabled ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
            <ShieldAlert size={28} />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Test Mode is currently DISABLED</h2>
          <p className="text-sm text-gray-600 max-w-lg mx-auto">
            Test mode endpoints and bulk account generation are locked for security. To enable them for local development, configure your backend environment file:
          </p>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg max-w-md mx-auto text-left font-mono text-xs">
            <p className="text-gray-400"># getmeds-backend/.env</p>
            <p className="text-green-400">TEST_MODE=true</p>
            <p className="text-green-400">DEBUG=true</p>
            <p className="text-gray-400">NODE_ENV=development</p>
          </div>
          <p className="text-xs text-gray-500">
            Then restart your backend server and refresh this page.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Bulk Account Generator Form */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-2 mb-4">
                <UserPlus className="text-blue-600" size={20} />
                <h2 className="text-lg font-bold text-gray-900">Bulk Creator</h2>
              </div>
              <p className="text-xs text-gray-500 mb-6">
                Configure parameters to generate batch test accounts instantly.
              </p>

              <form onSubmit={handleCreateAccounts} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Number of Accounts
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={count}
                      onChange={(e) => setCount(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    <div className="flex space-x-1">
                      {[1, 3, 5, 10].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setCount(n)}
                          className={`px-2.5 py-1.5 text-xs font-medium rounded border ${
                            count === n
                              ? 'bg-blue-50 border-blue-500 text-blue-700'
                              : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Username Prefix Pattern
                  </label>
                  <input
                    type="text"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    placeholder="e.g. testuser, rep, qa"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span className="text-[11px] text-gray-400 mt-1 block">
                    Format: {prefix}001, {prefix}002, ...
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Account Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="medrep">Medical Representative (medrep)</option>
                    <option value="finance">Finance Specialist (finance)</option>
                    <option value="dispatch">Dispatch Coordinator (dispatch)</option>
                    <option value="management">Management / Executive (management)</option>
                    <option value="admin">System Administrator (admin)</option>
                    <option value="mixed">Mixed / Distributed Across All Roles</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Email Domain Suffix
                  </label>
                  <input
                    type="text"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="test.getmeds.ph"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Default Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center px-4 py-2.5 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Generating Accounts...
                      </>
                    ) : (
                      <>
                        <UserPlus size={16} className="mr-2" />
                        Create Test Accounts
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Safe Cleanup Card */}
            <div className="bg-white rounded-xl shadow-sm border border-red-100 p-6">
              <div className="flex items-center space-x-2 text-red-700 mb-2">
                <Trash2 size={18} />
                <h3 className="text-sm font-bold">Safe Test Accounts Cleanup</h3>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                Removes all accounts matching test naming conventions. Protected system accounts (<code className="text-gray-700 font-mono">admin@getmeds.ph</code>, etc.) are never touched.
              </p>
              <button
                type="button"
                onClick={() => setIsConfirmOpen(true)}
                disabled={isCleaning || existingAccounts.length === 0}
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-red-300 text-xs font-semibold rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-40"
              >
                {isCleaning ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Cleaning Up...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} className="mr-1.5" />
                    Delete All Test Accounts ({existingAccounts.length})
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Creation Results & Existing Test Accounts */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Creation Batch Result Table */}
            {creationResults && (
              <div className="bg-white rounded-xl shadow-sm border border-blue-200 overflow-hidden">
                <div className="p-4 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="text-blue-600" size={18} />
                    <h3 className="text-sm font-bold text-blue-900">Latest Batch Creation Results</h3>
                  </div>
                  <span className="text-xs font-medium text-blue-700">
                    {creationResults.createdCount} created / {creationResults.failedCount} failed
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-gray-50 text-gray-500">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">Account</th>
                        <th className="px-4 py-3 text-left font-semibold">Email / Username</th>
                        <th className="px-4 py-3 text-left font-semibold">Role</th>
                        <th className="px-4 py-3 text-left font-semibold">Password</th>
                        <th className="px-4 py-3 text-left font-semibold">Status</th>
                        <th className="px-4 py-3 text-right font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {creationResults.accounts?.map((acc, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{acc.name}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center space-x-1.5 font-mono text-gray-700">
                              <span>{acc.email}</span>
                              <button
                                onClick={() => handleCopy(acc.email, `latest-email-${idx}`)}
                                className="text-gray-400 hover:text-blue-600 p-0.5 rounded"
                                title="Copy Email"
                              >
                                {copiedKey === `latest-email-${idx}` ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full font-medium uppercase border ${roleBadgeColors[acc.role] || 'bg-gray-100 text-gray-800'}`}>
                              {acc.role}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center space-x-1.5 font-mono text-gray-600">
                              <span>{acc.password}</span>
                              <button
                                onClick={() => handleCopy(acc.password, `latest-pw-${idx}`)}
                                className="text-gray-400 hover:text-blue-600 p-0.5 rounded"
                                title="Copy Password"
                              >
                                {copiedKey === `latest-pw-${idx}` ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {acc.status === 'created' ? (
                              <span className="inline-flex items-center text-green-700 font-semibold">
                                <CheckCircle size={14} className="mr-1" /> Created
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-red-600 font-semibold" title={acc.error}>
                                <XCircle size={14} className="mr-1" /> {acc.error || 'Failed'}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {acc.status === 'created' && (
                              <button
                                onClick={() => handleQuickLogin(acc.email, acc.password)}
                                className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-xs font-semibold"
                                title="Log in directly with this account"
                              >
                                Quick Login <ArrowRight size={12} className="ml-1" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Active Test Accounts List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="text-gray-600" size={18} />
                  <h3 className="text-sm font-bold text-gray-900">Current Test Accounts in System</h3>
                  <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full font-medium">
                    {existingAccounts.length}
                  </span>
                </div>
                <button
                  onClick={fetchExistingAccounts}
                  disabled={isFetching}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center"
                >
                  <RefreshCw size={12} className={`mr-1 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
                </button>
              </div>

              {existingAccounts.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-xs">
                  No active test accounts found. Use the Bulk Creator on the left to generate new test accounts.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-gray-50 text-gray-500">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">Account Name</th>
                        <th className="px-4 py-3 text-left font-semibold">Email</th>
                        <th className="px-4 py-3 text-left font-semibold">Role</th>
                        <th className="px-4 py-3 text-left font-semibold">Status</th>
                        <th className="px-4 py-3 text-right font-semibold">Quick Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {existingAccounts.map((acc, idx) => (
                        <tr key={acc.id || idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{acc.name}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center space-x-1.5 font-mono text-gray-700">
                              <span>{acc.email}</span>
                              <button
                                onClick={() => handleCopy(acc.email, `exist-email-${acc.id}`)}
                                className="text-gray-400 hover:text-blue-600 p-0.5 rounded"
                                title="Copy Email"
                              >
                                {copiedKey === `exist-email-${acc.id}` ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full font-medium uppercase border ${roleBadgeColors[acc.role] || 'bg-gray-100 text-gray-800'}`}>
                              {acc.role}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center text-green-700 font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span> Active
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleQuickLogin(acc.email, password)}
                              className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded text-xs font-semibold transition-colors"
                              title={`Log in as ${acc.email}`}
                            >
                              <KeyRound size={12} className="mr-1" /> Log In
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cleanup Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleCleanup}
        title="Delete All Test Accounts?"
        message={`Are you sure you want to delete all ${existingAccounts.length} test accounts? Protected production accounts (admin@getmeds.ph, etc.) will NOT be deleted.`}
        confirmText="Yes, Delete Test Accounts"
        variant="danger"
      />
    </div>
  );
};

export default TestModePage;
