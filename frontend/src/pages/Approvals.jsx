import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api, { getMediaUrl } from '../api';
import {
  CheckCircle2,
  XCircle,
  Coins,
  Banknote,
  Clock,
  ShieldCheck,
  AlertTriangle,
  History,
  Check,
  X,
  Eye,
  FileText,
  Search,
  Filter,
  ExternalLink,
  MapPin,
  Phone,
  UserCheck,
  AlertCircle,
  Lock,
  RefreshCw,
  Scale,
  Sparkles,
  ArrowRight
} from 'lucide-react';

const Approvals = () => {
  const { user, isAdmin, isCoordinator } = useAuth();
  const [activeTab, setActiveTab] = useState('gold'); // 'gold', 'cash', 'history'
  const [goldCollections, setGoldCollections] = useState([]);
  const [cashCollections, setCashCollections] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('PENDING_ACTION'); // 'PENDING_ACTION', 'PENDING', 'VERIFIED', 'APPROVED', 'REJECTED', 'ALL'
  const [logActionFilter, setLogActionFilter] = useState('ALL');

  // Approval Modal
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [approveItem, setApproveItem] = useState(null);
  const [approveType, setApproveType] = useState('GOLD');
  const [approvalRemarks, setApprovalRemarks] = useState('');
  const [submittingApproval, setSubmittingApproval] = useState(false);

  // Rejection Modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectItem, setRejectItem] = useState(null);
  const [rejectType, setRejectType] = useState('GOLD');
  const [rejectionRemarks, setRejectionRemarks] = useState('');
  const [submittingRejection, setSubmittingRejection] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Detailed Inspection Modal
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [inspectItem, setInspectItem] = useState(null);
  const [inspectType, setInspectType] = useState('GOLD');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [goldRes, cashRes, logsRes] = await Promise.all([
        api.get('/collections/gold/'),
        api.get('/collections/cash/'),
        api.get('/collections/logs/'),
      ]);

      setGoldCollections(goldRes.data.results || goldRes.data);
      setCashCollections(cashRes.data.results || cashRes.data);
      setLogs(logsRes.data);
    } catch (err) {
      console.error('Failed to load approval data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter items based on stageFilter & search
  const filterList = (list) => {
    return list.filter((item) => {
      const matchesSearch =
        item.receipt_number.toLowerCase().includes(search.toLowerCase()) ||
        item.customer_name.toLowerCase().includes(search.toLowerCase()) ||
        item.employee_name.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;

      if (stageFilter === 'PENDING_ACTION') {
        if (isAdmin) {
          // Admin can action on both PENDING and VERIFIED
          return ['PENDING', 'VERIFIED'].includes(item.approval_status);
        } else {
          // Coordinator can only verify PENDING
          return item.approval_status === 'PENDING';
        }
      }

      if (stageFilter === 'ALL') return true;
      return item.approval_status === stageFilter;
    });
  };

  const filteredGold = filterList(goldCollections);
  const filteredCash = filterList(cashCollections);

  // Open Approval Confirmation Modal
  const openApproveModal = (type, item) => {
    setApproveType(type);
    setApproveItem(item);
    setApprovalRemarks(
      isAdmin
        ? 'Approved and booked into company collateral vault.'
        : 'Verified weight, purity, and receipt authenticity.'
    );
    setErrorMsg('');
    setApproveModalOpen(true);
  };

  const handleApproveSubmit = async (e) => {
    e.preventDefault();
    setSubmittingApproval(true);
    setErrorMsg('');
    try {
      await api.post('/collections/approve/', {
        type: approveType,
        id: approveItem.id,
        remarks: approvalRemarks
      });
      setApproveModalOpen(false);
      await fetchData();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to approve collection.');
    } finally {
      setSubmittingApproval(false);
    }
  };

  // Open Rejection Modal
  const openRejectModal = (type, item) => {
    setRejectType(type);
    setRejectItem(item);
    setRejectionRemarks('');
    setErrorMsg('');
    setRejectModalOpen(true);
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectionRemarks.trim()) {
      setErrorMsg('Rejection remarks are mandatory to explain why the submission was rejected.');
      return;
    }
    setSubmittingRejection(true);
    setErrorMsg('');
    try {
      await api.post('/collections/reject/', {
        type: rejectType,
        id: rejectItem.id,
        remarks: rejectionRemarks
      });
      setRejectModalOpen(false);
      await fetchData();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to reject collection.');
    } finally {
      setSubmittingRejection(false);
    }
  };

  // Open Detailed Inspection Modal
  const openInspectModal = (type, item) => {
    setInspectType(type);
    setInspectItem(item);
    setInspectModalOpen(true);
  };

  const formatCurrency = (amt) => {
    return `₹${Number(amt || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  // Aggregated KPI Counters
  const pendingGoldCount = goldCollections.filter(g =>
    isAdmin ? ['PENDING', 'VERIFIED'].includes(g.approval_status) : g.approval_status === 'PENDING'
  ).length;

  const pendingGoldWeight = goldCollections
    .filter(g => isAdmin ? ['PENDING', 'VERIFIED'].includes(g.approval_status) : g.approval_status === 'PENDING')
    .reduce((acc, g) => acc + Number(g.gold_weight_grams || 0), 0);

  const pendingCashCount = cashCollections.filter(c =>
    isAdmin ? ['PENDING', 'VERIFIED'].includes(c.approval_status) : c.approval_status === 'PENDING'
  ).length;

  const pendingCashTotal = cashCollections
    .filter(c => isAdmin ? ['PENDING', 'VERIFIED'].includes(c.approval_status) : c.approval_status === 'PENDING')
    .reduce((acc, c) => acc + Number(c.cash_amount || 0), 0);

  const verifiedAwaitingAdmin = goldCollections.filter(g => g.approval_status === 'VERIFIED').length +
    cashCollections.filter(c => c.approval_status === 'VERIFIED').length;

  const approvedTotalCount = goldCollections.filter(g => g.approval_status === 'APPROVED').length +
    cashCollections.filter(c => c.approval_status === 'APPROVED').length;

  // Filtered Logs
  const filteredLogs = logs.filter(log => {
    if (logActionFilter === 'ALL') return true;
    return log.action === logActionFilter;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-semibold mb-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>{isAdmin ? 'Headquarters Admin Authorization & Monitoring' : 'Project Coordinator Verification Stage'}</span>
          </div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-amber-400" />
            <span>Collection Verification, Approval & Rejection System</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Strict two-tier financial control: Sales Executive Submission → Project Coordinator Verification → Admin Final Authorization.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="p-2 rounded-xl bg-[#111e3f] hover:bg-[#1a2c5b] border border-[#1a2c5b] text-slate-300 hover:text-white transition text-xs flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          title="Refresh Data"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Gold */}
        <div className="p-4 rounded-2xl bg-[#0b1329] border border-[#1a2c5b] relative overflow-hidden shadow-xl">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400">Pending Gold Action</p>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-300 mt-2 font-mono">
            {pendingGoldWeight.toFixed(3)} <span className="text-sm font-sans font-normal text-amber-400/80">g</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {pendingGoldCount} pledge submissions awaiting authorization
          </p>
        </div>

        {/* Pending Cash */}
        <div className="p-4 rounded-2xl bg-[#0b1329] border border-[#1a2c5b] relative overflow-hidden shadow-xl">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400">Pending Cash Action</p>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-300 mt-2 font-mono">
            {formatCurrency(pendingCashTotal)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {pendingCashCount} repayments awaiting sign-off
          </p>
        </div>

        {/* Verified Awaiting Final Admin */}
        <div className="p-4 rounded-2xl bg-[#0b1329] border border-[#1a2c5b] relative overflow-hidden shadow-xl">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400">Verified by Coordinators</p>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-blue-300 mt-2 font-mono">
            {verifiedAwaitingAdmin} <span className="text-sm font-sans font-normal text-slate-400">Records</span>
          </p>
          <p className="text-[11px] text-blue-300/80 mt-1">
            Ready for Admin final sign-off into master ledger
          </p>
        </div>

        {/* Approved Master Vault */}
        <div className="p-4 rounded-2xl bg-[#0b1329] border border-[#1a2c5b] relative overflow-hidden shadow-xl">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400">Approved & Locked</p>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-2 font-mono">
            {approvedTotalCount} <span className="text-sm font-sans font-normal text-slate-400">Pledges</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Immutable vault records locked against changes
          </p>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1a2c5b] pb-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('gold')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'gold'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-white hover:bg-[#111e3f]'
            }`}
          >
            <Coins className="w-4 h-4 text-amber-400" />
            <span>Gold Collections ({filteredGold.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('cash')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'cash'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-white hover:bg-[#111e3f]'
            }`}
          >
            <Banknote className="w-4 h-4 text-emerald-400" />
            <span>Cash Collections ({filteredCash.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'history'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                : 'text-slate-400 hover:text-white hover:bg-[#111e3f]'
            }`}
          >
            <History className="w-4 h-4 text-blue-400" />
            <span>Audit Trail & Monitoring ({logs.length})</span>
          </button>
        </div>

        {/* Search & Filter Bar */}
        {activeTab !== 'history' ? (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search receipt, customer, staff..."
                className="pl-8 pr-3 py-1.5 rounded-lg bg-[#070c18] border border-[#1a2c5b] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-[#070c18] border border-[#1a2c5b] text-white text-xs focus:outline-none focus:border-amber-400"
            >
              <option value="PENDING_ACTION">Needs My Action</option>
              <option value="PENDING">Pending Coordinator Verification</option>
              <option value="VERIFIED">Verified (Awaiting Admin)</option>
              <option value="APPROVED">Approved & Locked</option>
              <option value="REJECTED">Rejected</option>
              <option value="ALL">Show All Statuses</option>
            </select>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <select
              value={logActionFilter}
              onChange={(e) => setLogActionFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-[#070c18] border border-[#1a2c5b] text-white text-xs focus:outline-none focus:border-amber-400"
            >
              <option value="ALL">All Audit Actions</option>
              <option value="SUBMITTED">SUBMITTED</option>
              <option value="VERIFIED">VERIFIED</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="RECONCILED">RECONCILED</option>
            </select>
          </div>
        )}
      </div>

      {/* TAB 1: GOLD APPROVALS */}
      {activeTab === 'gold' && (
        <div className="p-5 rounded-2xl bg-[#0b1329] border border-[#1a2c5b] shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#1a2c5b] text-slate-400 text-[11px] uppercase tracking-wider bg-[#0c1530]">
                  <th className="py-3 px-3">Receipt / Date</th>
                  <th className="py-3 px-3">Field Executive</th>
                  <th className="py-3 px-3">Customer Details</th>
                  <th className="py-3 px-3">Jewellery Specs</th>
                  <th className="py-3 px-3">Net Weight & Purity</th>
                  <th className="py-3 px-3">Est. Value (₹)</th>
                  <th className="py-3 px-3">Workflow Stage</th>
                  <th className="py-3 px-3 text-right">Verification & Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a2c5b]/60">
                {filteredGold.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-10 text-center text-slate-400">
                      {loading ? 'Loading collections...' : 'No gold collection records matching your filter criteria.'}
                    </td>
                  </tr>
                ) : (
                  filteredGold.map((item) => {
                    const isPending = item.approval_status === 'PENDING';
                    const isVerified = item.approval_status === 'VERIFIED';
                    const isApproved = item.approval_status === 'APPROVED';
                    const isRejected = item.approval_status === 'REJECTED';

                    return (
                      <tr key={item.id} className="hover:bg-[#111e3f]/50 transition">
                        <td className="py-3 px-3">
                          <p className="font-bold text-amber-400 font-mono">{item.receipt_number}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {new Date(item.collection_datetime).toLocaleDateString()} {new Date(item.collection_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </td>

                        <td className="py-3 px-3">
                          <p className="font-semibold text-slate-200">{item.employee_name}</p>
                          <p className="text-[10px] text-amber-400 font-mono">{item.employee_code}</p>
                        </td>

                        <td className="py-3 px-3">
                          <p className="font-semibold text-white">{item.customer_name}</p>
                          <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                            <span>{item.customer_mobile}</span>
                          </p>
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-medium text-slate-200">{item.jewellery_type_display}</span>
                          {item.jewellery_description && (
                            <p className="text-[10px] text-slate-400 truncate max-w-[150px] mt-0.5">
                              {item.jewellery_description}
                            </p>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-amber-300 text-sm font-mono">{Number(item.gold_weight_grams).toFixed(3)}g</span>
                            <span className="px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-400 border border-amber-500/30 font-semibold text-[10px]">
                              {item.gold_purity}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-3 font-bold text-white text-xs">
                          {formatCurrency(item.estimated_value)}
                        </td>

                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                            isApproved ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40' :
                            (isVerified ? 'bg-blue-950/80 text-blue-400 border-blue-500/40' :
                            (isRejected ? 'bg-rose-950/80 text-rose-400 border-rose-500/40' :
                            'bg-amber-950/80 text-amber-400 border-amber-500/40'))
                          }`}>
                            {item.approval_status_display}
                          </span>
                          {item.verified_by_name && !isApproved && (
                            <p className="text-[10px] text-blue-300/80 mt-0.5">
                              Verified by: {item.verified_by_name}
                            </p>
                          )}
                          {isRejected && item.rejection_remarks && (
                            <p className="text-[10px] text-rose-300/90 truncate max-w-[150px] mt-0.5 italic">
                              Reason: {item.rejection_remarks}
                            </p>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openInspectModal('GOLD', item)}
                              className="px-2.5 py-1.5 rounded-lg bg-[#111e3f] hover:bg-[#1a2c5b] text-slate-200 hover:text-white text-[11px] font-medium transition cursor-pointer flex items-center gap-1"
                              title="Inspect Photo Proof & Details"
                            >
                              <Eye className="w-3.5 h-3.5 text-amber-400" />
                              <span>Inspect</span>
                            </button>

                            {/* Authorize buttons: only for pending states */}
                            {(isPending || (isVerified && isAdmin)) && (
                              <>
                                <button
                                  onClick={() => openApproveModal('GOLD', item)}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-600 text-white font-bold text-[11px] shadow-sm shadow-emerald-950 transition flex items-center gap-1 cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>{isAdmin ? (isVerified ? 'Final Approve' : 'Approve') : 'Verify'}</span>
                                </button>

                                <button
                                  onClick={() => openRejectModal('GOLD', item)}
                                  className="px-2.5 py-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white font-bold text-[11px] shadow-sm shadow-rose-950 transition flex items-center gap-1 cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Reject</span>
                                </button>
                              </>
                            )}

                            {isApproved && (
                              <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
                                <Lock className="w-3 h-3" />
                                <span>Vault Booked</span>
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CASH APPROVALS */}
      {activeTab === 'cash' && (
        <div className="p-5 rounded-2xl bg-[#0b1329] border border-[#1a2c5b] shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#1a2c5b] text-slate-400 text-[11px] uppercase tracking-wider bg-[#0c1530]">
                  <th className="py-3 px-3">Receipt / Date</th>
                  <th className="py-3 px-3">Field Executive</th>
                  <th className="py-3 px-3">Customer Details</th>
                  <th className="py-3 px-3">Cash Amount (₹)</th>
                  <th className="py-3 px-3">Payment Method</th>
                  <th className="py-3 px-3">Deposit Status</th>
                  <th className="py-3 px-3">Workflow Stage</th>
                  <th className="py-3 px-3 text-right">Verification & Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a2c5b]/60">
                {filteredCash.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-10 text-center text-slate-400">
                      {loading ? 'Loading collections...' : 'No cash collection records matching your filter criteria.'}
                    </td>
                  </tr>
                ) : (
                  filteredCash.map((item) => {
                    const isPending = item.approval_status === 'PENDING';
                    const isVerified = item.approval_status === 'VERIFIED';
                    const isApproved = item.approval_status === 'APPROVED';
                    const isRejected = item.approval_status === 'REJECTED';

                    return (
                      <tr key={item.id} className="hover:bg-[#111e3f]/50 transition">
                        <td className="py-3 px-3">
                          <p className="font-bold text-emerald-400 font-mono">{item.receipt_number}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {new Date(item.collection_datetime).toLocaleDateString()} {new Date(item.collection_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </td>

                        <td className="py-3 px-3">
                          <p className="font-semibold text-slate-200">{item.employee_name}</p>
                          <p className="text-[10px] text-amber-400 font-mono">{item.employee_code}</p>
                        </td>

                        <td className="py-3 px-3">
                          <p className="font-semibold text-white">{item.customer_name}</p>
                          <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                            <span>{item.customer_mobile}</span>
                          </p>
                        </td>

                        <td className="py-3 px-3 font-bold text-emerald-400 text-sm font-mono">
                          {formatCurrency(item.cash_amount)}
                        </td>

                        <td className="py-3 px-3 font-medium text-slate-200">
                          {item.payment_method_display}
                        </td>

                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            item.deposit_status === 'RECONCILED' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30' :
                            (item.deposit_status === 'BANK_DEPOSITED' ? 'bg-blue-950/80 text-blue-300 border border-blue-500/30' :
                            'bg-amber-950/80 text-amber-400 border border-amber-500/30')
                          }`}>
                            {item.deposit_status_display}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                            isApproved ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40' :
                            (isVerified ? 'bg-blue-950/80 text-blue-400 border-blue-500/40' :
                            (isRejected ? 'bg-rose-950/80 text-rose-400 border-rose-500/40' :
                            'bg-amber-950/80 text-amber-400 border-amber-500/40'))
                          }`}>
                            {item.approval_status_display}
                          </span>
                          {item.verified_by_name && !isApproved && (
                            <p className="text-[10px] text-blue-300/80 mt-0.5">
                              Verified by: {item.verified_by_name}
                            </p>
                          )}
                          {isRejected && item.rejection_remarks && (
                            <p className="text-[10px] text-rose-300/90 truncate max-w-[150px] mt-0.5 italic">
                              Reason: {item.rejection_remarks}
                            </p>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openInspectModal('CASH', item)}
                              className="px-2.5 py-1.5 rounded-lg bg-[#111e3f] hover:bg-[#1a2c5b] text-slate-200 hover:text-white text-[11px] font-medium transition cursor-pointer flex items-center gap-1"
                              title="Inspect Receipt Proof & Details"
                            >
                              <Eye className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Inspect</span>
                            </button>

                            {(isPending || (isVerified && isAdmin)) && (
                              <>
                                <button
                                  onClick={() => openApproveModal('CASH', item)}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-600 text-white font-bold text-[11px] shadow-sm shadow-emerald-950 transition flex items-center gap-1 cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>{isAdmin ? (isVerified ? 'Final Approve' : 'Approve') : 'Verify'}</span>
                                </button>

                                <button
                                  onClick={() => openRejectModal('CASH', item)}
                                  className="px-2.5 py-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white font-bold text-[11px] shadow-sm shadow-rose-950 transition flex items-center gap-1 cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Reject</span>
                                </button>
                              </>
                            )}

                            {isApproved && (
                              <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
                                <Lock className="w-3 h-3" />
                                <span>Ledger Locked</span>
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: IMMUTABLE AUDIT TRAIL & MONITORING LOGS */}
      {activeTab === 'history' && (
        <div className="p-5 rounded-2xl bg-[#0b1329] border border-[#1a2c5b] shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#1a2c5b] text-slate-400 text-[11px] uppercase tracking-wider bg-[#0c1530]">
                  <th className="py-3 px-3">Timestamp</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Receipt / Customer</th>
                  <th className="py-3 px-3">Action Taken</th>
                  <th className="py-3 px-3">Authorizing Officer</th>
                  <th className="py-3 px-3">Status Transition</th>
                  <th className="py-3 px-3">Endorsement / Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a2c5b]/60">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-10 text-center text-slate-400">
                      No audit trail logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#111e3f]/50 transition">
                      <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>

                      <td className="py-3 px-3 font-semibold text-amber-300">
                        {log.collection_type}
                      </td>

                      <td className="py-3 px-3">
                        <p className="font-mono font-bold text-white text-xs">{log.receipt_number || '—'}</p>
                        <p className="text-[10px] text-slate-400">{log.customer_name || '—'}</p>
                      </td>

                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          log.action === 'APPROVED' ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40' :
                          (log.action === 'REJECTED' ? 'bg-rose-950/80 text-rose-400 border-rose-500/40' :
                          (log.action === 'VERIFIED' ? 'bg-blue-950/80 text-blue-400 border-blue-500/40' :
                          (log.action === 'RECONCILED' ? 'bg-teal-950/80 text-teal-300 border-teal-500/40' :
                          'bg-slate-800 text-slate-300 border-slate-700')))
                        }`}>
                          {log.action}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <p className="text-white font-semibold">{log.actor_name}</p>
                        <p className="text-[10px] text-amber-400 font-mono">{log.actor_role}</p>
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px] text-slate-300">
                        <span className="text-slate-400">{log.previous_status}</span>
                        <span className="text-amber-400 mx-1">→</span>
                        <span className="text-emerald-400 font-bold">{log.new_status}</span>
                      </td>

                      <td className="py-3 px-3 text-slate-300 max-w-[280px]">
                        <p className="truncate" title={log.remarks}>{log.remarks || '—'}</p>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: APPROVAL / VERIFICATION CONFIRMATION */}
      {approveModalOpen && approveItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0b1329] border border-emerald-500/40 rounded-2xl p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#1a2c5b]">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {isAdmin ? 'Confirm Final Approval' : 'Confirm Coordinator Verification'}
                </h3>
                <p className="text-xs text-slate-400">
                  {isAdmin
                    ? 'Final approval books the collateral into master accounts and locks it permanently.'
                    : 'Verification marks the submission as reviewed and escalates it to Admin.'}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#070c18] border border-[#1a2c5b] text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Receipt Number:</span>
                <span className="font-mono text-amber-400 font-bold">{approveItem.receipt_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Customer:</span>
                <span className="font-semibold text-white">{approveItem.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Field Executive:</span>
                <span className="text-slate-200">{approveItem.employee_name} ({approveItem.employee_code})</span>
              </div>
              {approveType === 'GOLD' ? (
                <div className="flex justify-between">
                  <span className="text-slate-400">Net Weight & Value:</span>
                  <span className="font-bold text-amber-300">
                    {approveItem.gold_weight_grams}g ({approveItem.gold_purity}) • {formatCurrency(approveItem.estimated_value)}
                  </span>
                </div>
              ) : (
                <div className="flex justify-between">
                  <span className="text-slate-400">Cash Amount:</span>
                  <span className="font-bold text-emerald-400">{formatCurrency(approveItem.cash_amount)}</span>
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-950/80 border border-rose-500/50 text-xs text-rose-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleApproveSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">
                  Authorization Endorsement Remarks (Optional)
                </label>
                <textarea
                  rows="2"
                  value={approvalRemarks}
                  onChange={(e) => setApprovalRemarks(e.target.value)}
                  placeholder="e.g. Weighing scale verified, purity tested 22K 916 hallmarked, locker #4 allocated."
                  className="w-full px-3 py-2 rounded-xl bg-[#070c18] border border-[#1a2c5b] text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="pt-3 border-t border-[#1a2c5b] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setApproveModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingApproval}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold transition shadow-lg shadow-emerald-950 cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{submittingApproval ? 'Authorizing...' : (isAdmin ? 'Confirm Final Approval' : 'Confirm Verification')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REJECTION WITH MANDATORY REMARKS */}
      {rejectModalOpen && rejectItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0b1329] border border-rose-500/50 rounded-2xl p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#1a2c5b]">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/30">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-rose-400">Reject Collection Submission</h3>
                <p className="text-xs text-slate-400">
                  Rejection remarks are mandatory and will be logged in the permanent audit trail.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#070c18] border border-[#1a2c5b] text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Receipt Number:</span>
                <span className="font-mono text-amber-400 font-bold">{rejectItem.receipt_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Customer Name:</span>
                <span className="font-semibold text-white">{rejectItem.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Field Executive:</span>
                <span className="text-slate-200">{rejectItem.employee_name} ({rejectItem.employee_code})</span>
              </div>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-950 border border-rose-500 text-xs text-rose-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleRejectSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">
                  Mandatory Rejection Reason / Remarks *
                </label>
                <textarea
                  rows="3"
                  required
                  value={rejectionRemarks}
                  onChange={(e) => setRejectionRemarks(e.target.value)}
                  placeholder="e.g. Net weight mismatch on scale; hallmark illegible; customer loan application documents incomplete..."
                  className="w-full px-3 py-2 rounded-xl bg-[#070c18] border border-rose-500/50 text-white focus:outline-none focus:border-rose-400"
                />
              </div>

              <div className="pt-3 border-t border-[#1a2c5b] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRejection}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition shadow-lg shadow-rose-950 cursor-pointer flex items-center gap-1.5"
                >
                  <X className="w-4 h-4" />
                  <span>{submittingRejection ? 'Rejecting...' : 'Confirm Rejection'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: FULL INSPECTION & PROOF VIEWER */}
      {inspectModalOpen && inspectItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-[#0b1329] border border-amber-500/40 rounded-2xl p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1a2c5b]">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                  <span>Collection Proof & Verification Audit Inspection</span>
                </h3>
                <p className="text-xs text-amber-400 font-mono font-bold mt-0.5">{inspectItem.receipt_number}</p>
              </div>
              <button
                onClick={() => setInspectModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Customer and Executive Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-[#070c18] border border-[#1a2c5b]">
                <div>
                  <span className="text-slate-400 block text-[11px]">Customer Particulars</span>
                  <p className="font-bold text-white text-sm">{inspectItem.customer_name}</p>
                  <p className="text-slate-300 mt-0.5 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-500" />
                    <span>{inspectItem.customer_mobile}</span>
                  </p>
                  {inspectItem.customer_address && (
                    <p className="text-slate-400 text-[11px] mt-1">{inspectItem.customer_address}</p>
                  )}
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Field Executive Info</span>
                  <p className="font-bold text-white text-sm">{inspectItem.employee_name}</p>
                  <p className="text-amber-400 font-mono text-xs">{inspectItem.employee_code}</p>
                  <p className="text-slate-400 text-[11px] mt-1">
                    Timestamp: {new Date(inspectItem.collection_datetime).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Specs & Financial Details */}
              <div className="p-3 rounded-xl bg-[#070c18] border border-[#1a2c5b]">
                {inspectType === 'GOLD' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Jewellery Category</span>
                      <p className="font-bold text-white">{inspectItem.jewellery_type_display}</p>
                      {inspectItem.jewellery_description && (
                        <p className="text-slate-400 text-[11px] mt-0.5">{inspectItem.jewellery_description}</p>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Net Weight & Purity</span>
                      <p className="font-bold text-amber-300 text-sm font-mono">
                        {inspectItem.gold_weight_grams}g ({inspectItem.gold_purity})
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Estimated Market Valuation</span>
                      <p className="font-black text-white text-sm">{formatCurrency(inspectItem.estimated_value)}</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Cash Amount</span>
                      <p className="font-black text-emerald-400 text-base">{formatCurrency(inspectItem.cash_amount)}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Payment Mode</span>
                      <p className="font-bold text-white">{inspectItem.payment_method_display}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Deposit Status</span>
                      <p className="font-bold text-amber-300">{inspectItem.deposit_status_display}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* GPS Coordinates */}
              {inspectItem.latitude && inspectItem.longitude && (
                <div className="p-3 rounded-xl bg-[#070c18] border border-[#1a2c5b] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span>Doorstep Coordinates: {Number(inspectItem.latitude).toFixed(4)}, {Number(inspectItem.longitude).toFixed(4)}</span>
                  </div>
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${inspectItem.latitude}&mlon=${inspectItem.longitude}#map=16/${inspectItem.latitude}/${inspectItem.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
                  >
                    <span>Inspect on OpenStreetMap</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {/* Photos Showcase */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {inspectType === 'GOLD' ? (
                  <>
                    <div>
                      <span className="text-slate-400 block mb-1 font-semibold">Jewellery Photo Proof</span>
                      {inspectItem.jewellery_photo ? (
                        <div className="rounded-xl overflow-hidden border border-[#1a2c5b] bg-[#070c18]">
                          <img
                            src={getMediaUrl(inspectItem.jewellery_photo)}
                            alt="Jewellery Proof"
                            className="w-full h-44 object-contain bg-black/60"
                          />
                          <div className="p-2 text-right">
                            <a
                              href={getMediaUrl(inspectItem.jewellery_photo)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-amber-400 hover:underline text-[11px] font-semibold flex items-center justify-end gap-1"
                            >
                              <span>Full Resolution Photo</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-36 rounded-xl bg-[#070c18] border border-[#1a2c5b] flex items-center justify-center text-slate-500">
                          No Jewellery Photo Uploaded
                        </div>
                      )}
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-1 font-semibold">Receipt Photo Proof</span>
                      {inspectItem.receipt_photo ? (
                        <div className="rounded-xl overflow-hidden border border-[#1a2c5b] bg-[#070c18]">
                          <img
                            src={getMediaUrl(inspectItem.receipt_photo)}
                            alt="Receipt Proof"
                            className="w-full h-44 object-contain bg-black/60"
                          />
                          <div className="p-2 text-right">
                            <a
                              href={getMediaUrl(inspectItem.receipt_photo)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-amber-400 hover:underline text-[11px] font-semibold flex items-center justify-end gap-1"
                            >
                              <span>Full Resolution Receipt</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-36 rounded-xl bg-[#070c18] border border-[#1a2c5b] flex items-center justify-center text-slate-500">
                          No Receipt Photo Uploaded
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="sm:col-span-2">
                    <span className="text-slate-400 block mb-1 font-semibold">Cash Receipt / Transfer Proof</span>
                    {inspectItem.receipt_photo ? (
                      <div className="rounded-xl overflow-hidden border border-[#1a2c5b] bg-[#070c18]">
                        <img
                          src={getMediaUrl(inspectItem.receipt_photo)}
                          alt="Cash Receipt"
                          className="w-full h-48 object-contain bg-black/60"
                        />
                        <div className="p-2 text-right">
                          <a
                            href={getMediaUrl(inspectItem.receipt_photo)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-400 hover:underline text-[11px] font-semibold flex items-center justify-end gap-1"
                          >
                            <span>Full Resolution Proof</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-36 rounded-xl bg-[#070c18] border border-[#1a2c5b] flex items-center justify-center text-slate-500">
                        No Receipt Attachment Uploaded
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="pt-3 border-t border-[#1a2c5b] flex items-center justify-between">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                inspectItem.approval_status === 'APPROVED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40' :
                (inspectItem.approval_status === 'VERIFIED' ? 'bg-blue-950 text-blue-400 border border-blue-500/40' :
                (inspectItem.approval_status === 'REJECTED' ? 'bg-rose-950 text-rose-400 border border-rose-500/40' :
                'bg-amber-950 text-amber-400 border border-amber-500/40'))
              }`}>
                Stage: {inspectItem.approval_status_display}
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setInspectModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  Close
                </button>

                {(inspectItem.approval_status === 'PENDING' || (inspectItem.approval_status === 'VERIFIED' && isAdmin)) && (
                  <>
                    <button
                      onClick={() => {
                        setInspectModalOpen(false);
                        openApproveModal(inspectType, inspectItem);
                      }}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer"
                    >
                      {isAdmin ? 'Proceed to Approve' : 'Proceed to Verify'}
                    </button>
                    <button
                      onClick={() => {
                        setInspectModalOpen(false);
                        openRejectModal(inspectType, inspectItem);
                      }}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition cursor-pointer"
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Approvals;
