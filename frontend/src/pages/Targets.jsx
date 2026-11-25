import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import {
  Target,
  Plus,
  Coins,
  Banknote,
  Award,
  TrendingUp,
  User,
  Calendar,
  CheckCircle,
  Clock,
  Sparkles,
  Edit2,
  Trash2,
  Filter
} from 'lucide-react';

const Targets = () => {
  const { user, isAdmin, isCoordinator, isSalesExecutive } = useAuth();
  const [targets, setTargets] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [periodFilter, setPeriodFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    employee: '',
    period: 'MONTHLY',
    start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end_date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
    gold_target_grams: '100.000',
    cash_target_amount: '500000.00'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [targetsRes, statsRes, empRes] = await Promise.all([
        api.get('/accounts/targets/'),
        api.get('/accounts/dashboard-stats/'),
        api.get('/accounts/employees/?role=SALES_EXECUTIVE')
      ]);
      setTargets(targetsRes.data.results || targetsRes.data);
      setPerformance(statsRes.data.performance || []);
      setEmployees(empRes.data.results || empRes.data);
    } catch (err) {
      console.error('Failed to load targets data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddModal = () => {
    setEditTarget(null);
    setFormData({
      employee: employees[0]?.id || '',
      period: 'MONTHLY',
      start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      end_date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
      gold_target_grams: '100.000',
      cash_target_amount: '500000.00'
    });
    setErrorMsg('');
    setModalOpen(true);
  };

  const openEditModal = (t) => {
    setEditTarget(t);
    setFormData({
      employee: t.employee,
      period: t.period,
      start_date: t.start_date,
      end_date: t.end_date,
      gold_target_grams: String(t.gold_target_grams),
      cash_target_amount: String(t.cash_target_amount)
    });
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');

    try {
      if (editTarget) {
        await api.patch(`/accounts/targets/${editTarget.id}/`, formData);
      } else {
        await api.post('/accounts/targets/', formData);
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      setErrorMsg(JSON.stringify(err.response?.data || 'Failed to save target quota.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this target quota?')) return;
    try {
      await api.delete(`/accounts/targets/${id}/`);
      fetchData();
    } catch (err) {
      console.error('Failed to delete target:', err);
    }
  };

  const formatCurrency = (amt) => {
    return `₹${Number(amt || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  const filteredTargets = periodFilter
    ? targets.filter((t) => t.period === periodFilter)
    : targets;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-amber-400" />
            <span>Employee Target Management & Benchmark Analytics</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure daily, weekly, and monthly gold weight and cash recovery quotas for field executives.
          </p>
        </div>

        {(isAdmin || isCoordinator) && (
          <button
            onClick={openAddModal}
            className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition flex items-center gap-2 self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Set New Target Quota</span>
          </button>
        )}
      </div>

      {/* Top Performing Staff Leaderboard */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-[#0b1329] via-[#101c3d] to-[#0b1329] border border-[#1a2c5b] shadow-xl">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          <span>Top Performing Field Executives Leaderboard</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {performance.slice(0, 3).map((emp, idx) => (
            <div
              key={emp.employee_id}
              className="p-4 rounded-xl bg-[#070c18] border border-amber-500/30 flex items-center space-x-3.5 relative overflow-hidden"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-bold text-amber-300 text-lg">
                #{idx + 1}
              </div>
              <div className="overflow-hidden flex-1">
                <p className="font-bold text-white text-xs truncate">{emp.name}</p>
                <p className="text-[10px] text-amber-400 font-mono">{emp.employee_id}</p>
                <div className="flex items-center justify-between text-[11px] mt-1 text-slate-300">
                  <span>Score:</span>
                  <span className="font-bold text-amber-400">{emp.overall_pct}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Target vs Achieved Table */}
      <div className="p-5 rounded-xl bg-[#0b1329] border border-[#1a2c5b] shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-400" />
          <span>Active Quota Performance Matrix (Month to Date)</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#1a2c5b] text-slate-400 text-[11px] uppercase tracking-wider bg-[#0c1530]">
                <th className="py-3 px-3">Field Executive</th>
                <th className="py-3 px-3">Gold Target (g)</th>
                <th className="py-3 px-3">Gold Achieved (g)</th>
                <th className="py-3 px-3">Gold Completion</th>
                <th className="py-3 px-3">Cash Target (₹)</th>
                <th className="py-3 px-3">Cash Achieved (₹)</th>
                <th className="py-3 px-3">Cash Completion</th>
                <th className="py-3 px-3 text-right">Overall Metric</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a2c5b]/60">
              {performance.map((emp) => (
                <tr key={emp.employee_id} className="hover:bg-[#111e3f]/50 transition">
                  <td className="py-3 px-3">
                    <p className="font-semibold text-slate-200">{emp.name}</p>
                    <p className="text-[10px] text-amber-400 font-mono">{emp.employee_id}</p>
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-300">{emp.gold_target}g</td>
                  <td className="py-3 px-3 font-bold text-amber-400">{emp.gold_achieved}g</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-[11px]">{emp.gold_pct}%</span>
                      <div className="w-20 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${Math.min(emp.gold_pct, 100)}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-300">{formatCurrency(emp.cash_target)}</td>
                  <td className="py-3 px-3 font-bold text-emerald-400">{formatCurrency(emp.cash_achieved)}</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-[11px]">{emp.cash_pct}%</span>
                      <div className="w-20 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${Math.min(emp.cash_pct, 100)}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-sm text-white">
                    <span className={`px-2 py-0.5 rounded ${emp.overall_pct >= 80 ? 'text-emerald-300 bg-emerald-950/60' : 'text-amber-300 bg-amber-950/60'}`}>
                      {emp.overall_pct}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Target History & Configuration Records Table */}
      <div className="p-5 rounded-xl bg-[#0b1329] border border-[#1a2c5b] shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>Target Quota Records & History</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Configured target periods across all field staff.</p>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="px-2.5 py-1 rounded bg-[#070c18] border border-[#1a2c5b] text-white text-xs focus:outline-none focus:border-amber-400"
            >
              <option value="">All Periods</option>
              <option value="MONTHLY">Monthly</option>
              <option value="WEEKLY">Weekly</option>
              <option value="DAILY">Daily</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#1a2c5b] text-slate-400 text-[11px] uppercase bg-[#0c1530]">
                <th className="py-3 px-3">Employee</th>
                <th className="py-3 px-3">Period</th>
                <th className="py-3 px-3">Duration (Start → End)</th>
                <th className="py-3 px-3">Gold Target (g)</th>
                <th className="py-3 px-3">Cash Target (₹)</th>
                <th className="py-3 px-3">Assigned By</th>
                {(isAdmin || isCoordinator) && <th className="py-3 px-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a2c5b]/60">
              {filteredTargets.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    No target records found.
                  </td>
                </tr>
              ) : (
                filteredTargets.map((t) => (
                  <tr key={t.id} className="hover:bg-[#111e3f]/50 transition">
                    <td className="py-3 px-3">
                      <p className="font-semibold text-slate-200">{t.employee_name}</p>
                      <p className="text-[10px] text-amber-400 font-mono">{t.employee_code}</p>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#111e3f] text-amber-300 border border-[#1a2c5b]">
                        {t.period_display}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-300 font-mono text-[11px]">
                      {t.start_date} → {t.end_date}
                    </td>
                    <td className="py-3 px-3 font-bold text-amber-300">{t.gold_target_grams}g</td>
                    <td className="py-3 px-3 font-bold text-emerald-400">{formatCurrency(t.cash_target_amount)}</td>
                    <td className="py-3 px-3 text-slate-400">{t.created_by_name}</td>
                    {(isAdmin || isCoordinator) && (
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(t)}
                            className="p-1.5 rounded bg-[#111e3f] hover:bg-[#1a2c5b] text-amber-300 transition cursor-pointer"
                            title="Edit Target"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(t.id)}
                              className="p-1.5 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 transition cursor-pointer"
                              title="Delete Target"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Set / Edit Target */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0b1329] border border-[#1a2c5b] rounded-2xl p-6 shadow-2xl relative">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-400" />
              <span>{editTarget ? 'Edit Target Quota' : 'Configure Employee Quota'}</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Set physical weight and recovery amounts.
            </p>

            {errorMsg && (
              <div className="mb-3 p-2 rounded bg-rose-950 border border-rose-500 text-xs text-rose-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Select Sales Executive *</label>
                <select
                  required
                  value={formData.employee}
                  disabled={!!editTarget}
                  onChange={(e) => setFormData({ ...formData, employee: e.target.value })}
                  className="w-full px-3 py-2 rounded bg-[#070c18] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400 disabled:opacity-50"
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name ? `${emp.first_name} ${emp.last_name || ''}` : emp.username} ({emp.employee_id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Target Period *</label>
                <select
                  value={formData.period}
                  onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                  className="w-full px-3 py-2 rounded bg-[#070c18] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="MONTHLY">Monthly Target</option>
                  <option value="WEEKLY">Weekly Target</option>
                  <option value="DAILY">Daily Target</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-[#070c18] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-[#070c18] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Gold Target (Grams) *</label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={formData.gold_target_grams}
                    onChange={(e) => setFormData({ ...formData, gold_target_grams: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-[#070c18] border border-[#1a2c5b] text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Cash Target (₹ INR) *</label>
                  <input
                    type="number"
                    step="100"
                    required
                    value={formData.cash_target_amount}
                    onChange={(e) => setFormData({ ...formData, cash_target_amount: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-[#070c18] border border-[#1a2c5b] text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#1a2c5b] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold transition shadow-md shadow-amber-500/20"
                >
                  {saving ? 'Saving...' : (editTarget ? 'Update Quota' : 'Save Quota')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Targets;
