import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Coins, Lock, User, ShieldCheck, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials. Please verify your login details.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (u, p) => {
    setUsername(u);
    setPassword(p);
    setError('');
    setLoading(true);
    try {
      await login(u, p);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070c18] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Gold Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Card */}
        <div className="bg-[#0b1329] border border-[#1a2c5b] rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/80">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 via-yellow-500 to-amber-300 p-0.5 shadow-xl shadow-amber-500/20 mb-3">
              <div className="w-full h-full bg-[#0b1329] rounded-[14px] flex items-center justify-center">
                <Coins className="w-7 h-7 text-amber-400" />
              </div>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              GOLD <span className="gold-gradient-text">FINANCE</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-medium">
              Employee Tracker & Collection Management
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-950/80 border border-rose-500/50 flex items-center gap-2 text-xs text-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Username / Employee ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin or EMP-5001"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[#070c18] border border-[#1a2c5b] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[#070c18] border border-[#1a2c5b] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Login Preset Roles */}
          <div className="mt-6 pt-5 border-t border-[#1a2c5b]/80">
            <p className="text-[11px] text-center text-slate-400 mb-2.5 flex items-center justify-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Select Demo Role to Test Immediately:</span>
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin', 'admin123')}
                className="py-1.5 px-2 rounded-lg bg-[#111e3f] hover:bg-[#1a2c5b] border border-[#1a2c5b] hover:border-amber-400/50 text-[11px] font-medium text-amber-300 transition text-center cursor-pointer"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('coordinator1', 'coord123')}
                className="py-1.5 px-2 rounded-lg bg-[#111e3f] hover:bg-[#1a2c5b] border border-[#1a2c5b] hover:border-amber-400/50 text-[11px] font-medium text-amber-300 transition text-center cursor-pointer"
              >
                Coordinator
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('executive1', 'exec123')}
                className="py-1.5 px-2 rounded-lg bg-[#111e3f] hover:bg-[#1a2c5b] border border-[#1a2c5b] hover:border-amber-400/50 text-[11px] font-medium text-amber-300 transition text-center cursor-pointer"
              >
                Sales Exec
              </button>
            </div>
          </div>
        </div>

        {/* Security watermark */}
        <p className="text-center text-[11px] text-slate-500 mt-4 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-500/70" />
          <span>Role-Based Access Control • 256-bit Encrypted Telemetry</span>
        </p>
      </div>
    </div>
  );
};

export default Login;

