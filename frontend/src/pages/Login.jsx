import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layers, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getInitials } from '../utils/helpers';

export default function Login() {
  const { login, demoLogin } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const demoAccounts = [
    { name: 'Alex Rivera', email: 'alex@example.com', role: 'Product Lead', color: '#6366f1' },
    { name: 'Sarah Chen', email: 'sarah@example.com', role: 'Frontend Engineer', color: '#ec4899' },
    { name: 'David Miller', email: 'david@example.com', role: 'Backend Architect', color: '#10b981' },
    { name: 'Elena Rostova', email: 'elena@example.com', role: 'UI/UX Designer', color: '#f59e0b' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail) => {
    setError('');
    setLoading(true);
    try {
      await demoLogin(demoEmail);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center mx-auto shadow-xl shadow-indigo-500/20">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Welcome to PulseFlow</h1>
          <p className="text-sm text-slate-400">
            Real-time collaborative project management with boards, tasks, and notifications.
          </p>
        </div>

        {/* 1-Click Demo Testing Banner */}
        <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center gap-2 mb-2 text-indigo-300">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider">
              Quick 1-Click Test Accounts
            </h2>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Click any demo profile to test collaborative features and real-time updates:
          </p>

          <div className="grid grid-cols-2 gap-2">
            {demoAccounts.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => handleDemoLogin(account.email)}
                className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 hover:border-indigo-500/60 text-left transition-all group"
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-sm"
                  style={{ backgroundColor: account.color }}
                >
                  {getInitials(account.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-white truncate group-hover:text-indigo-300">
                    {account.name.split(' ')[0]}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">{account.role}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Traditional Form Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-4 text-xs uppercase tracking-wider text-slate-500 font-semibold">
              Or sign in with email
            </span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@example.com"
                className="w-full text-sm bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-sm bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 group"
            >
              <span>{loading ? 'Signing in...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 pt-2">
            Don't have an account?{' '}
            <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-semibold underline">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
