import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api, { API_BASE_URL } from '../api';
import {
  FileSpreadsheet,
  Download,
  Filter,
  FileText,
  Calendar,
  Coins,
  Banknote,
  Users,
  MapPin,
  Clock,
  CheckCircle2,
  RefreshCw,
  BarChart3,
  TrendingUp,
  Award,
  ChevronDown,
  Layers,
  Sparkles,
  Search
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
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const Reports = () => {
  const { user, isAdmin, isCoordinator } = useAuth();
  const [reportType, setReportType] = useState('daily_gold');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedEmp, setSelectedEmp] = useState('');
  const [employees, setEmployees] = useState([]);

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCharts, setShowCharts] = useState(true);

  // Performance comparison data for charts
  const [perfData, setPerfData] = useState([]);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/accounts/employees/?role=SALES_EXECUTIVE');
      setEmployees(res.data.results || res.data);
    } catch (err) {
      console.error('Failed to load employees for report filter:', err);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = { type: reportType };
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (selectedEmp) params.employee = selectedEmp;

      const [repRes, perfRes] = await Promise.all([
        api.get('/reports/data/', { params }),
        api.get('/reports/data/', { params: { type: 'monthly_perf' } })
      ]);

      setReportData(repRes.data);
      setPerfData(perfRes.data.items || []);
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [reportType, startDate, endDate, selectedEmp]);

  // Date Range Quick Preset Helper
  const applyPreset = (preset) => {
    const today = new Date();
    if (preset === 'TODAY') {
      const dateStr = today.toISOString().split('T')[0];
      setStartDate(dateStr);
      setEndDate(dateStr);
    } else if (preset === 'WEEK') {
      const past7 = new Date();
      past7.setDate(today.getDate() - 7);
      setStartDate(past7.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else if (preset === 'MONTH') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
    }
  };

  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      const params = new URLSearchParams({ type: reportType });
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (selectedEmp) params.append('employee', selectedEmp);

      const token = localStorage.getItem('access_token');
      const url = `${API_BASE_URL}/reports/export/excel/?${params.toString()}`;

      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `GoldFinance_${reportType}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error('Export Excel failed:', err);
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const params = new URLSearchParams({ type: reportType });
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (selectedEmp) params.append('employee', selectedEmp);

      const token = localStorage.getItem('access_token');
      const url = `${API_BASE_URL}/reports/export/pdf/?${params.toString()}`;

      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `GoldFinance_${reportType}_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error('Export PDF failed:', err);
    } finally {
      setExportingPdf(false);
    }
  };

  const formatCurrency = (amt) => {
    return `₹${Number(amt || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  // Prepare chart dataset from current report data
  const chartItems = reportData?.items || [];

  // Purity Distribution for Gold Reports
  const purityBreakdown = {};
  if (reportType === 'daily_gold') {
    chartItems.forEach(item => {
      purityBreakdown[item.purity] = (purityBreakdown[item.purity] || 0) + item.weight_grams;
    });
  }
  const purityChartData = Object.entries(purityBreakdown).map(([k, v]) => ({
    name: k,
    value: Math.round(v * 100) / 100
  }));

  // Payment Method Distribution for Cash Reports
  const paymentBreakdown = {};
  if (reportType === 'daily_cash' || reportType === 'cash_reconciliation') {
    chartItems.forEach(item => {
      const method = item.payment_method || 'Cash';
      paymentBreakdown[method] = (paymentBreakdown[method] || 0) + item.amount;
    });
  }
  const paymentChartData = Object.entries(paymentBreakdown).map(([k, v]) => ({
    name: k,
    value: Math.round(v)
  }));

  const PIE_COLORS = ['#D4AF37', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-semibold mb-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Audit & Executive Intelligence Hub</span>
          </div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-amber-400" />
            <span>Financial & Field Operations Reporting Center</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Generate audit statements, employee tallies, performance charts, and export formatted Excel & PDF files.
          </p>
        </div>

        {/* Action Controls & Export Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setShowCharts(!showCharts)}
            className="px-3 py-2 rounded-xl bg-[#111e3f] hover:bg-[#1a2c5b] border border-[#1a2c5b] text-slate-300 hover:text-white font-medium text-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
            <span>{showCharts ? 'Hide Visual Charts' : 'Show Visual Charts'}</span>
          </button>

          <button
            onClick={handleExportExcel}
            disabled={exportingExcel}
            className="px-3.5 py-2 rounded-xl bg-emerald-700/80 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-md shadow-emerald-950/40 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{exportingExcel ? 'Exporting...' : 'Export Excel (.xlsx)'}</span>
          </button>

          <button
            onClick={handleExportPdf}
            disabled={exportingPdf}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-slate-950" />
            <span>{exportingPdf ? 'Exporting...' : 'Export PDF (.pdf)'}</span>
          </button>
        </div>
      </div>

      {/* Report Selector & Date Filter Controls */}
      <div className="p-4 rounded-2xl bg-[#0b1329] border border-[#1a2c5b] space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Select Report Statement</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#070c18] border border-amber-500/40 text-amber-300 font-bold focus:outline-none focus:border-amber-400"
            >
              <option value="daily_gold">Daily Gold Collection Report</option>
              <option value="daily_cash">Daily Cash Collection Report</option>
              <option value="employee_wise">Employee-wise Collection Report</option>
              <option value="gps_visits">GPS Visit History Report</option>
              <option value="monthly_perf">Monthly Performance Report</option>
              <option value="pending_approvals">Pending Approval Report</option>
              <option value="cash_reconciliation">Cash Deposit Reconciliation Report</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#070c18] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#070c18] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Filter by Field Executive</label>
            <select
              value={selectedEmp}
              onChange={(e) => setSelectedEmp(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#070c18] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
            >
              <option value="">All Field Executives</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.first_name ? `${emp.first_name} ${emp.last_name || ''}` : emp.username} ({emp.employee_id})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Quick Presets */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#1a2c5b]/60 text-xs">
          <span className="text-slate-500 text-[11px] font-semibold">Quick Date Presets:</span>
          <button
            onClick={() => applyPreset('TODAY')}
            className="px-2.5 py-1 rounded-lg bg-[#070c18] hover:bg-[#111e3f] border border-[#1a2c5b] text-slate-300 hover:text-white transition cursor-pointer text-[11px]"
          >
            Today
          </button>
          <button
            onClick={() => applyPreset('WEEK')}
            className="px-2.5 py-1 rounded-lg bg-[#070c18] hover:bg-[#111e3f] border border-[#1a2c5b] text-slate-300 hover:text-white transition cursor-pointer text-[11px]"
          >
            Past 7 Days
          </button>
          <button
            onClick={() => applyPreset('MONTH')}
            className="px-2.5 py-1 rounded-lg bg-[#070c18] hover:bg-[#111e3f] border border-[#1a2c5b] text-slate-300 hover:text-white transition cursor-pointer text-[11px]"
          >
            This Month
          </button>
          <button
            onClick={() => applyPreset('ALL')}
            className="px-2.5 py-1 rounded-lg bg-[#070c18] hover:bg-[#111e3f] border border-[#1a2c5b] text-slate-300 hover:text-white transition cursor-pointer text-[11px]"
          >
            All Time
          </button>
        </div>
      </div>

      {/* INTERACTIVE EMPLOYEE PERFORMANCE & FINANCIAL ANALYTICS CHARTS */}
      {showCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart 1: Performance Matrix (Target vs Achieved) */}
          <div className="lg:col-span-2 p-5 rounded-2xl bg-[#0b1329] border border-[#1a2c5b] shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#1a2c5b]">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>Employee Quota Performance Analytics (Target vs Achieved)</span>
                </h3>
                <p className="text-[11px] text-slate-400">Comparing gold grams and cash quotas across staff fleet.</p>
              </div>
              <span className="text-xs text-amber-400 font-mono font-bold">
                {perfData.length} Staff Benchmarked
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={perfData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2c5b" opacity={0.6} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#090f22', borderColor: '#1a2c5b', borderRadius: '12px', fontSize: '12px' }}
                    itemStyle={{ color: '#ffffff' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="gold_achieved" name="Gold Achieved (g)" fill="#D4AF37" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="gold_target" name="Gold Target (g)" fill="#475569" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Purity / Payment Breakdown Distribution */}
          <div className="lg:col-span-1 p-5 rounded-2xl bg-[#0b1329] border border-[#1a2c5b] shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#1a2c5b]">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                  <span>{reportType === 'daily_gold' ? 'Purity Distribution (g)' : 'Payment Method Mix (₹)'}</span>
                </h3>
                <p className="text-[11px] text-slate-400">Volume breakdown by category.</p>
              </div>
            </div>

            <div className="h-64 w-full flex items-center justify-center">
              {reportType === 'daily_gold' && purityChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={purityChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {purityChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#090f22', borderColor: '#1a2c5b', borderRadius: '12px', fontSize: '12px' }}
                      formatter={(val) => [`${val} grams`, 'Weight']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (reportType === 'daily_cash' || reportType === 'cash_reconciliation') && paymentChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                      label={({ name, percent }) => `${name.slice(0, 8)}: ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {paymentChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#090f22', borderColor: '#1a2c5b', borderRadius: '12px', fontSize: '12px' }}
                      formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Amount']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-xs text-slate-500 py-12">
                  <p>Performance Overall Scores:</p>
                  <div className="mt-2 space-y-1 font-mono text-[11px] text-slate-300">
                    {perfData.slice(0, 4).map(p => (
                      <p key={p.employee_id} className="flex justify-between px-4">
                        <span>{p.name}:</span>
                        <span className="font-bold text-amber-400">{p.overall_percentage}%</span>
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REPORT DATA TABLE VIEW */}
      <div className="p-5 rounded-2xl bg-[#0b1329] border border-[#1a2c5b] shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1a2c5b]">
          <div>
            <h3 className="text-base font-bold text-white">{reportData?.title || 'Report Statement'}</h3>
            <p className="text-xs text-slate-400">Total Rows Generated: {reportData?.items?.length || 0}</p>
          </div>

          {reportData?.totals && (
            <div className="flex flex-wrap items-center gap-3 text-xs">
              {reportData.totals.weight_grams !== undefined && (
                <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2">
                  <span className="text-slate-400">Total Collateral Weight:</span>
                  <span className="font-bold text-amber-300 font-mono text-sm">{reportData.totals.weight_grams} g</span>
                </div>
              )}
              {reportData.totals.value !== undefined && (
                <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2">
                  <span className="text-slate-400">Total Market Valuation:</span>
                  <span className="font-bold text-emerald-300 font-mono text-sm">{formatCurrency(reportData.totals.value)}</span>
                </div>
              )}
              {reportData.totals.amount !== undefined && (
                <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2">
                  <span className="text-slate-400">Total Cash Recoveries:</span>
                  <span className="font-bold text-emerald-300 font-mono text-sm">{formatCurrency(reportData.totals.amount)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-xs text-slate-400 gap-2">
            <div className="w-7 h-7 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <span>Compiling Financial Report Statement...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* 1. Daily Gold Collection Report */}
            {reportType === 'daily_gold' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#1a2c5b] text-slate-400 text-[11px] uppercase bg-[#0c1530]">
                    <th className="py-3 px-3">Receipt No</th>
                    <th className="py-3 px-3">Date & Time</th>
                    <th className="py-3 px-3">Field Executive</th>
                    <th className="py-3 px-3">Customer Details</th>
                    <th className="py-3 px-3">Jewellery Type</th>
                    <th className="py-3 px-3">Purity</th>
                    <th className="py-3 px-3">Weight (g)</th>
                    <th className="py-3 px-3">Est. Value (₹)</th>
                    <th className="py-3 px-3">Workflow Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a2c5b]/60">
                  {reportData?.items?.map((item, idx) => (
                    <tr key={idx} className="hover:bg-[#111e3f]/40 transition">
                      <td className="py-3 px-3 font-mono font-bold text-amber-400">{item.receipt_number}</td>
                      <td className="py-3 px-3 text-slate-300">{item.date}</td>
                      <td className="py-3 px-3 text-slate-200">{item.employee}</td>
                      <td className="py-3 px-3">
                        <p className="text-white font-semibold">{item.customer}</p>
                        <p className="text-[10px] text-slate-400">{item.mobile}</p>
                      </td>
                      <td className="py-3 px-3 text-slate-300">{item.jewellery_type}</td>
                      <td className="py-3 px-3">
                        <span className="px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-500/30 font-bold text-[10px]">
                          {item.purity}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-amber-300 font-mono text-sm">{item.weight_grams}g</td>
                      <td className="py-3 px-3 font-bold text-white">{formatCurrency(item.estimated_value)}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-[#111e3f] text-slate-300 border border-[#1a2c5b]">
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 2. Daily Cash Collection Report */}
            {reportType === 'daily_cash' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#1a2c5b] text-slate-400 text-[11px] uppercase bg-[#0c1530]">
                    <th className="py-3 px-3">Receipt No</th>
                    <th className="py-3 px-3">Date & Time</th>
                    <th className="py-3 px-3">Field Executive</th>
                    <th className="py-3 px-3">Customer Details</th>
                    <th className="py-3 px-3">Amount (₹)</th>
                    <th className="py-3 px-3">Payment Method</th>
                    <th className="py-3 px-3">Approval Status</th>
                    <th className="py-3 px-3">Deposit Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a2c5b]/60">
                  {reportData?.items?.map((item, idx) => (
                    <tr key={idx} className="hover:bg-[#111e3f]/40 transition">
                      <td className="py-3 px-3 font-mono font-bold text-emerald-400">{item.receipt_number}</td>
                      <td className="py-3 px-3 text-slate-300">{item.date}</td>
                      <td className="py-3 px-3 text-slate-200">{item.employee}</td>
                      <td className="py-3 px-3">
                        <p className="text-white font-semibold">{item.customer}</p>
                        <p className="text-[10px] text-slate-400">{item.mobile}</p>
                      </td>
                      <td className="py-3 px-3 font-bold text-emerald-400 font-mono text-sm">{formatCurrency(item.amount)}</td>
                      <td className="py-3 px-3 text-slate-300">{item.payment_method}</td>
                      <td className="py-3 px-3 text-slate-300">{item.status}</td>
                      <td className="py-3 px-3 font-medium text-amber-300">{item.deposit_status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 3. Employee-wise Collection Report */}
            {reportType === 'employee_wise' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#1a2c5b] text-slate-400 text-[11px] uppercase bg-[#0c1530]">
                    <th className="py-3 px-3">Employee Code</th>
                    <th className="py-3 px-3">Staff Full Name</th>
                    <th className="py-3 px-3">Phone</th>
                    <th className="py-3 px-3">Assigned Coordinator</th>
                    <th className="py-3 px-3">Gold Collected (g)</th>
                    <th className="py-3 px-3">Cash Collected (₹)</th>
                    <th className="py-3 px-3">Total Visits</th>
                    <th className="py-3 px-3">Field Duty Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a2c5b]/60">
                  {reportData?.items?.map((item, idx) => (
                    <tr key={idx} className="hover:bg-[#111e3f]/40 transition">
                      <td className="py-3 px-3 font-mono font-bold text-amber-400">{item.employee_id}</td>
                      <td className="py-3 px-3 text-white font-bold">{item.name}</td>
                      <td className="py-3 px-3 text-slate-300">{item.phone}</td>
                      <td className="py-3 px-3 text-slate-300">{item.coordinator}</td>
                      <td className="py-3 px-3 font-bold text-amber-300 font-mono">{item.gold_grams}g</td>
                      <td className="py-3 px-3 font-bold text-emerald-400 font-mono">{formatCurrency(item.cash_amount)}</td>
                      <td className="py-3 px-3 text-white font-medium">{item.total_visits}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          item.active_status === 'Working Now' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {item.active_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 4. GPS Visit History Report */}
            {reportType === 'gps_visits' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#1a2c5b] text-slate-400 text-[11px] uppercase bg-[#0c1530]">
                    <th className="py-3 px-3">Visit Code</th>
                    <th className="py-3 px-3">Date & Time</th>
                    <th className="py-3 px-3">Field Staff</th>
                    <th className="py-3 px-3">Customer Details</th>
                    <th className="py-3 px-3">Address</th>
                    <th className="py-3 px-3">Purpose</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">GPS Latitude / Longitude</th>
                    <th className="py-3 px-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a2c5b]/60">
                  {reportData?.items?.map((item, idx) => (
                    <tr key={idx} className="hover:bg-[#111e3f]/40 transition">
                      <td className="py-3 px-3 font-mono font-bold text-amber-400">VIS-{item.id}</td>
                      <td className="py-3 px-3 text-slate-300">{item.visit_datetime}</td>
                      <td className="py-3 px-3 text-slate-200">{item.employee}</td>
                      <td className="py-3 px-3">
                        <p className="text-white font-semibold">{item.customer_name}</p>
                        <p className="text-[10px] text-slate-400">{item.customer_mobile}</p>
                      </td>
                      <td className="py-3 px-3 text-slate-300 max-w-[160px] truncate">{item.customer_address}</td>
                      <td className="py-3 px-3 text-amber-300 font-medium">{item.purpose}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-emerald-400 text-[11px]">
                        {item.latitude ? `${item.latitude}, ${item.longitude}` : 'No GPS'}
                      </td>
                      <td className="py-3 px-3 text-slate-400 max-w-[160px] truncate">{item.remarks || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 5. Monthly Performance Report */}
            {reportType === 'monthly_perf' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#1a2c5b] text-slate-400 text-[11px] uppercase bg-[#0c1530]">
                    <th className="py-3 px-3">Employee ID</th>
                    <th className="py-3 px-3">Staff Full Name</th>
                    <th className="py-3 px-3">Gold (Achieved / Target)</th>
                    <th className="py-3 px-3">Gold Quota %</th>
                    <th className="py-3 px-3">Cash (Achieved / Target)</th>
                    <th className="py-3 px-3">Cash Quota %</th>
                    <th className="py-3 px-3 text-right">Overall Performance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a2c5b]/60">
                  {reportData?.items?.map((item, idx) => (
                    <tr key={idx} className="hover:bg-[#111e3f]/40 transition">
                      <td className="py-3 px-3 font-mono font-bold text-amber-400">{item.employee_id}</td>
                      <td className="py-3 px-3 text-white font-bold">{item.name}</td>
                      <td className="py-3 px-3 text-amber-300 font-semibold font-mono">
                        {item.gold_achieved}g / {item.gold_target}g
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-[11px]">{item.gold_percentage}%</span>
                          <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div className="h-full bg-amber-400 rounded-full" style={{ width: `${Math.min(item.gold_percentage, 100)}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-emerald-400 font-semibold font-mono">
                        {formatCurrency(item.cash_achieved)} / {formatCurrency(item.cash_target)}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-[11px]">{item.cash_percentage}%</span>
                          <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${Math.min(item.cash_percentage, 100)}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                          item.overall_percentage >= 80 ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                        }`}>
                          {item.overall_percentage}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 6. Pending Approval Report */}
            {reportType === 'pending_approvals' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#1a2c5b] text-slate-400 text-[11px] uppercase bg-[#0c1530]">
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Receipt No</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Field Executive</th>
                    <th className="py-3 px-3">Customer</th>
                    <th className="py-3 px-3">Item Description</th>
                    <th className="py-3 px-3">Amount / Valuation (₹)</th>
                    <th className="py-3 px-3">Approval Stage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a2c5b]/60">
                  {reportData?.items?.map((item, idx) => (
                    <tr key={idx} className="hover:bg-[#111e3f]/40 transition">
                      <td className="py-3 px-3 font-bold text-amber-400">{item.type}</td>
                      <td className="py-3 px-3 font-mono text-slate-200">{item.receipt_number}</td>
                      <td className="py-3 px-3 text-slate-300">{item.date}</td>
                      <td className="py-3 px-3 text-white">{item.employee}</td>
                      <td className="py-3 px-3 text-white font-medium">{item.customer}</td>
                      <td className="py-3 px-3 text-slate-300">{item.item_summary}</td>
                      <td className="py-3 px-3 font-bold text-emerald-400">{formatCurrency(item.amount_or_value)}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-500/30 font-semibold">
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 7. Cash Deposit Reconciliation Report */}
            {reportType === 'cash_reconciliation' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#1a2c5b] text-slate-400 text-[11px] uppercase bg-[#0c1530]">
                    <th className="py-3 px-3">Receipt No</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Field Executive</th>
                    <th className="py-3 px-3">Customer</th>
                    <th className="py-3 px-3">Amount (₹)</th>
                    <th className="py-3 px-3">Payment Method</th>
                    <th className="py-3 px-3">Deposit Status</th>
                    <th className="py-3 px-3">Bank Ref / UTR</th>
                    <th className="py-3 px-3">Reconciled By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a2c5b]/60">
                  {reportData?.items?.map((item, idx) => (
                    <tr key={idx} className="hover:bg-[#111e3f]/40 transition">
                      <td className="py-3 px-3 font-mono font-bold text-emerald-400">{item.receipt_number}</td>
                      <td className="py-3 px-3 text-slate-300">{item.date}</td>
                      <td className="py-3 px-3 text-white">{item.employee}</td>
                      <td className="py-3 px-3 text-white font-medium">{item.customer}</td>
                      <td className="py-3 px-3 font-bold text-emerald-400 font-mono">{formatCurrency(item.amount)}</td>
                      <td className="py-3 px-3 text-slate-300">{item.payment_method}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-950 text-blue-300 border border-blue-500/30">
                          {item.deposit_status}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-400">{item.bank_reference}</td>
                      <td className="py-3 px-3 text-slate-300">{item.reconciled_by}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
