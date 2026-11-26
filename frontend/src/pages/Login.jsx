import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, User, ShieldCheck, ArrowRight, AlertCircle, Sparkles, Loader2 } from 'lucide-react';
import api from '../api';

const Login = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [error, setError] = useState('');

  // Background pre-warm: ping backend as soon as the login screen opens
  // Ensures cloud server is already awake before user clicks submit
  useEffect(() => {
    api.get('/accounts/cities-branches/').catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setStatusMsg('Verifying credentials...');

    // Timer to update status message if cloud server was in cold standby
    const slowTimer = setTimeout(() => {
      setStatusMsg('Connecting to secure cloud server...');
    }, 1500);

    try {
      await login(username, password);
    } catch (err) {
      clearTimeout(slowTimer);
      setError(err.response?.data?.error || 'Invalid credentials. Please verify your login details.');
    } finally {
      clearTimeout(slowTimer);
      setLoading(false);
      setStatusMsg('');
    }
  };

  const handleQuickLogin = async (u, p) => {
    setUsername(u);
    setPassword(p);
    setError('');
    setLoading(true);
    setStatusMsg(`Signing in as ${u}...`);

    const slowTimer = setTimeout(() => {
      setStatusMsg('Waking cloud server & authenticating...');
    }, 1500);

    try {
      await login(u, p);
    } catch (err) {
      clearTimeout(slowTimer);
      setError(err.response?.data?.error || 'Login failed. Please check backend connection.');
    } finally {
      clearTimeout(slowTimer);
      setLoading(false);
      setStatusMsg('');
    }
  };

  return (
    <div className="min-h-screen bg-[#070a14] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background KGF Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-slate-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Card */}
        <div className="bg-[#0c1222] border border-[#1a2749] rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/90">
          <div className="text-center mb-6">
            {/* KGF Official Logo Display */}
            <div className="flex justify-center mb-4">
              <div className="bg-white/95 p-3 rounded-2xl border border-slate-300 shadow-xl shadow-red-950/40 flex items-center justify-center">
                <img 
                  src="/logo.png" 
                  alt="Karur Gold Finance (KGF)" 
                  className="h-14 sm:h-16 w-auto object-contain"
                />
              </div>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center justify-center gap-1.5">
              <span>KARUR</span>
              <span className="text-red-500">GOLD FINANCE</span>
            </h1>
            <p className="text-[11px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">
              Employee Tracker & Recovery Management
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
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Username / Employee ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin or EMP-5001"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[#070a14] border border-[#1a2749] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[#070a14] border border-[#1a2749] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-red-950/50 transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{statusMsg || 'Authenticating...'}</span>
                </>
              ) : (
                <>
                  <span>Sign In to Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Login Preset Roles */}
          <div className="mt-6 pt-5 border-t border-[#1a2749]">
            <p className="text-[11px] text-center text-slate-400 mb-2.5 flex items-center justify-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-red-400" />
              <span>Select Demo Role to Test Immediately:</span>
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin('admin', 'admin123')}
                className="py-1.5 px-2 rounded-lg bg-[#121b33] hover:bg-[#1a2749] border border-[#1a2749] hover:border-red-500/50 text-[11px] font-semibold text-red-300 transition text-center cursor-pointer disabled:opacity-50"
              >
                Admin
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin('coordinator1', 'coord123')}
                className="py-1.5 px-2 rounded-lg bg-[#121b33] hover:bg-[#1a2749] border border-[#1a2749] hover:border-red-500/50 text-[11px] font-semibold text-red-300 transition text-center cursor-pointer disabled:opacity-50"
              >
                Coordinator
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin('executive1', 'exec123')}
                className="py-1.5 px-2 rounded-lg bg-[#121b33] hover:bg-[#1a2749] border border-[#1a2749] hover:border-red-500/50 text-[11px] font-semibold text-red-300 transition text-center cursor-pointer disabled:opacity-50"
              >
                Sales Exec
              </button>
            </div>
          </div>
        </div>

        {/* Security watermark */}
        <p className="text-center text-[11px] text-slate-500 mt-4 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-red-500/70" />
          <span>Role-Based Access Control • 256-bit Encrypted Telemetry</span>
        </p>
      </div>
    </div>
  );
};

export default Login;
