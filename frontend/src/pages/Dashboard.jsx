import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import StatCard from '../components/StatCard';
import {
  Users,
  Coins,
  Banknote,
  CalendarCheck,
  CheckCircle2,
  TrendingUp,
  MapPin,
  Clock,
  Award,
  ArrowUpRight,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  CartesianGrid
} from 'recharts';

const Dashboard = ({ setCurrentTab }) => {
  const { user, isAdmin, isCoordinator, isSalesExecutive } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await api.get('/accounts/dashboard-stats/');
      setStats(res.data);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Loading Financial Metrics...</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (amt) => {
    return `₹${Number(amt || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-[#0b1329] via-[#101c3d] to-[#0b1329] border border-[#1a2c5b] relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-semibold mb-2">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>{user?.role === 'ADMIN' ? 'Headquarters Executive View' : (user?.role === 'COORDINATOR' ? 'Regional Team View' : 'Personal Field Operations')}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Welcome back, <span className="gold-gradient-text">{user?.first_name || user?.username}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Real-time gold collateral monitoring, cash recoveries, GPS trail tracking, and verification workflows.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchStats}
              className="p-2 rounded-lg bg-[#111e3f] hover:bg-[#1a2c5b] text-slate-300 hover:text-white border border-[#1a2c5b] transition text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Stats</span>
            </button>
            <button
              onClick={() => setCurrentTab('tracking')}
              className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition flex items-center gap-1.5 cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-slate-950" />
              <span>Live Field Map</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Gold Collected */}
        <StatCard
          title="Gold Jewellery Collected"
          value={`${Number(stats?.total_gold_grams || 0).toFixed(2)} g`}
          subValue={stats?.pending_gold_grams > 0 ? `+${stats?.pending_gold_grams}g pending approval` : 'All records verified'}
          icon={Coins}
          color="gold"
          trend="Collateral Net"
        />

        {/* Total Cash Collected */}
        <StatCard
          title="Cash Collections (INR)"
          value={formatCurrency(stats?.total_cash_amount)}
          subValue={stats?.pending_cash_amount > 0 ? `+${formatCurrency(stats?.pending_cash_amount)} pending` : 'All cleared'}
          icon={Banknote}
          color="emerald"
          trend="Recoveries"
        />

        {/* Today's Customer Visits */}
        <StatCard
          title="Today's Customer Visits"
          value={`${stats?.today_visits || 0} Visits`}
          subValue="GPS verified on spot"
          icon={CalendarCheck}
          color="blue"
          trend="Field Log"
        />

        {/* Active Employees or Pending Approvals */}
        {isSalesExecutive ? (
          <StatCard
            title="Duty Status"
            value={user?.is_working ? 'Active On Field' : 'Shift Inactive'}
            subValue={user?.is_working ? 'Broadcasting live telemetry' : 'Click Start Work on header'}
            icon={TrendingUp}
            color={user?.is_working ? 'emerald' : 'gold'}
            trend="Telemetry"
          />
        ) : (
          <StatCard
            title="Pending Approvals"
            value={`${stats?.pending_approvals || 0} Records`}
            subValue="Requires verification"
            icon={CheckCircle2}
            color={stats?.pending_approvals > 0 ? 'purple' : 'emerald'}
            trend="Action Items"
          />
        )}
      </div>

      {/* Secondary Metric Bar for Admin/Coordinator */}
      {!isSalesExecutive && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[#0b1329] border border-[#1a2c5b] flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Total Sales Executives</p>
              <h4 className="text-lg font-bold text-white mt-1">{stats?.total_employees || 0} Staff</h4>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0b1329] border border-[#1a2c5b] flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Live Active On Field</p>
              <h4 className="text-lg font-bold text-emerald-400 mt-1">{stats?.active_employees || 0} Working Now</h4>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0b1329] border border-[#1a2c5b] flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Top Performing Employee</p>
              <h4 className="text-sm font-bold text-amber-300 mt-1 truncate">
                {stats?.performance?.[0]?.name || 'Data calculating...'}
              </h4>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Award className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Gold Collections Chart */}
        <div className="p-5 rounded-xl bg-[#0b1329] border border-[#1a2c5b] shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>Daily Gold Collections (Grams)</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Past 7 days physical weight intake</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.daily_chart || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a2c5b" opacity={0.5} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} unit="g" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0c1222', borderColor: '#dc2626', borderRadius: '8px', fontSize: '12px' }}
                  itemStyle={{ color: '#fca5a5' }}
                />
                <Bar dataKey="gold_grams" name="Gold Weight (g)" fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Cash Collections Chart */}
        <div className="p-5 rounded-xl bg-[#0b1329] border border-[#1a2c5b] shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Banknote className="w-4 h-4 text-emerald-400" />
                <span>Daily Cash Collections (INR)</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Past 7 days recoveries & EMI receipts</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.daily_chart || []}>
                <defs>
                  <linearGradient id="cashGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a2c5b" opacity={0.5} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(val) => `₹${val / 1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090f22', borderColor: '#10b981', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(val) => [formatCurrency(val), 'Cash Amount']}
                />
                <Area type="monotone" dataKey="cash_amount" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#cashGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Employee Target vs Achieved Performance Table */}
      <div className="p-5 rounded-xl bg-[#0b1329] border border-[#1a2c5b] shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <span>{isSalesExecutive ? 'Your Target Achievement' : 'Employee Target vs Achieved Performance'}</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Current month benchmark progress</p>
          </div>
          <button
            onClick={() => setCurrentTab('targets')}
            className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span>Target Hub</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#1a2c5b] text-slate-400 text-[11px] uppercase tracking-wider bg-[#0c1530]">
                <th className="py-2.5 px-3">Employee</th>
                <th className="py-2.5 px-3">Field Status</th>
                <th className="py-2.5 px-3">Gold (Achieved / Target)</th>
                <th className="py-2.5 px-3">Cash (Achieved / Target)</th>
                <th className="py-2.5 px-3">Overall Completion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a2c5b]/60">
              {stats?.performance?.map((emp) => (
                <tr key={emp.employee_id} className="hover:bg-[#111e3f]/50 transition">
                  <td className="py-3 px-3">
                    <p className="font-semibold text-slate-200">{emp.name}</p>
                    <p className="text-[10px] text-amber-400/90 font-mono">{emp.employee_id}</p>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${emp.is_working ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${emp.is_working ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                      {emp.is_working ? 'Working' : 'Offline'}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-bold text-amber-300">{emp.gold_achieved}g</span>
                        <span className="text-slate-500">/ {emp.gold_target}g</span>
                      </div>
                      <div className="w-28 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full"
                          style={{ width: `${Math.min(emp.gold_pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-bold text-emerald-300">{formatCurrency(emp.cash_achieved)}</span>
                        <span className="text-slate-500">/ {formatCurrency(emp.cash_target)}</span>
                      </div>
                      <div className="w-28 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 rounded-full"
                          style={{ width: `${Math.min(emp.cash_pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs">{emp.overall_pct}%</span>
                      <div className="w-20 h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${emp.overall_pct >= 80 ? 'bg-emerald-400' : emp.overall_pct >= 50 ? 'bg-amber-400' : 'bg-rose-400'}`}
                          style={{ width: `${Math.min(emp.overall_pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

