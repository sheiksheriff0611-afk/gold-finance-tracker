import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api, { getMediaUrl } from '../api';
import {
  Banknote,
  Plus,
  Search,
  Filter,
  Camera,
  MapPin,
  Phone,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileCheck,
  CreditCard,
  Building,
  Eye,
  ShieldCheck,
  RefreshCw,
  Lock,
  ExternalLink,
  Check,
  ArrowRight,
  Sparkles,
  QrCode,
  DollarSign
} from 'lucide-react';

const CashCollection = () => {
  const { user, isSalesExecutive, isAdmin, isCoordinator } = useAuth();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [depositFilter, setDepositFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');

  // Modal: Add Cash Collection
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [locating, setLocating] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);

  // Modal: Reconcile Cash Deposit
  const [reconcileModalOpen, setReconcileModalOpen] = useState(false);
  const [reconcileItem, setReconcileItem] = useState(null);
  const [reconciling, setReconciling] = useState(false);
  const [reconcileData, setReconcileData] = useState({
    deposit_status: 'BANK_DEPOSITED',
    bank_reference: '',
    reconciliation_remarks: ''
  });

  // Modal: Details Viewer
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [viewerItem, setViewerItem] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_mobile: '',
    customer_address: '',
    cash_amount: '',
    receipt_number: '',
    collection_datetime: new Date().toISOString().slice(0, 16),
    latitude: '',
    longitude: '',
    payment_method: 'CASH_HANDOVER',
    remarks: ''
  });

  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (depositFilter) params.deposit_status = depositFilter;
      if (paymentFilter) params.payment_method = paymentFilter;

      const res = await api.get('/collections/cash/', { params });
      setCollections(res.data.results || res.data);
    } catch (err) {
      console.error('Failed to load cash collections:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, [search, statusFilter, depositFilter, paymentFilter]);

  const generateReceiptNumber = () => {
    const today = new Date();
    const dateStr = today.toISOString().slice(2, 10).replace(/-/g, '');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `CSH-${dateStr}-${random}`;
  };

  const openAddModal = () => {
    const newReceipt = generateReceiptNumber();
    setFormData({
      customer_name: '',
      customer_mobile: '',
      customer_address: '',
      cash_amount: '',
      receipt_number: newReceipt,
      collection_datetime: new Date().toISOString().slice(0, 16),
      latitude: user?.current_latitude ? String(user.current_latitude) : '',
      longitude: user?.current_longitude ? String(user.current_longitude) : '',
      payment_method: 'CASH_HANDOVER',
      remarks: ''
    });
    setReceiptFile(null);
    setReceiptPreview(null);
    setGpsAccuracy(null);
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleReceiptFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setReceiptFile(file);
      setReceiptPreview(URL.createObjectURL(file));
    }
  };

  const handleDetectGps = () => {
    if (!('geolocation' in navigator)) {
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData((prev) => ({
          ...prev,
          latitude: String(pos.coords.latitude),
          longitude: String(pos.coords.longitude)
        }));
        setGpsAccuracy(pos.coords.accuracy ? Math.round(pos.coords.accuracy) : null);
        setLocating(false);
      },
      (err) => {
        console.warn('GPS detection failed:', err);
        setErrorMsg('Could not detect location. Please ensure location is enabled.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');

    const amountNum = parseFloat(formData.cash_amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setErrorMsg('Please enter a valid positive cash amount.');
      setSaving(false);
      return;
    }

    if (formData.customer_mobile.trim().length < 7) {
      setErrorMsg('Please enter a valid customer contact number.');
      setSaving(false);
      return;
    }

    try {
      const data = new FormData();
      Object.keys(formData).forEach((key) => {
        if (formData[key] !== '' && formData[key] !== null) {
          data.append(key, formData[key]);
        }
      });
      if (receiptFile) data.append('receipt_photo', receiptFile);

      await api.post('/collections/cash/', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setModalOpen(false);
      fetchCollections();
    } catch (err) {
      const errData = err.response?.data;
      if (typeof errData === 'object') {
        const msg = Object.entries(errData).map(([k, v]) => `${k}: ${v}`).join(' | ');
        setErrorMsg(msg);
      } else {
        setErrorMsg('Failed to submit cash collection. Duplicate receipt or validation error.');
      }
    } finally {
      setSaving(false);
    }
  };

  const openReconcileModal = (item) => {
    setReconcileItem(item);
    setReconcileData({
      deposit_status: item.deposit_status === 'IN_HAND' ? 'DEPOSITED_BRANCH' : item.deposit_status,
      bank_reference: item.bank_reference || '',
      reconciliation_remarks: item.reconciliation_remarks || ''
    });
    setReconcileModalOpen(true);
  };

  const handleReconcileSubmit = async (e) => {
    e.preventDefault();
    setReconciling(true);
    try {
      await api.post('/collections/reconcile-cash/', {
        id: reconcileItem.id,
        ...reconcileData
      });
      setReconcileModalOpen(false);
      fetchCollections();
    } catch (err) {
      console.error('Reconciliation error:', err);
    } finally {
      setReconciling(false);
    }
  };

  const formatCurrency = (amt) => {
    return `₹${Number(amt || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  // KPI calculations
  const totalCashAmount = collections.reduce((acc, c) => acc + Number(c.cash_amount || 0), 0);
  const inHandAmount = collections
    .filter(c => c.deposit_status === 'IN_HAND')
    .reduce((acc, c) => acc + Number(c.cash_amount || 0), 0);
  const reconciledAmount = collections
    .filter(c => c.deposit_status === 'RECONCILED' || c.deposit_status === 'BANK_DEPOSITED')
    .reduce((acc, c) => acc + Number(c.cash_amount || 0), 0);
  const pendingApprovalsCount = collections.filter(c => c.approval_status === 'PENDING').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Banknote className="w-5 h-5 text-emerald-400" />
            <span>Cash Collection, Receipting & Deposit Reconciliation</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time cash recovery, instant payment acknowledgement receipts, and bank deposit audit tracking.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Cash Collection</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cash Collected */}
        <div className="p-4 rounded-2xl bg-[#0b1329] border border-[#1a2c5b] relative overflow-hidden shadow-xl">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400">Total Cash Collections</p>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-2">
            {formatCurrency(totalCashAmount)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {collections.length} total receipts recorded
          </p>
        </div>

        {/* Cash In-Hand (Pending Deposit) */}
        <div className="p-4 rounded-2xl bg-[#0b1329] border border-[#1a2c5b] relative overflow-hidden shadow-xl">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400">Cash In Hand (Pending Deposit)</p>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-300 mt-2 font-mono">
            {formatCurrency(inHandAmount)}
          </p>
          <p className="text-[11px] text-amber-400 mt-1">
            {collections.filter(c => c.deposit_status === 'IN_HAND').length} receipts pending branch handover
          </p>
        </div>

        {/* Bank Deposited / Reconciled */}
        <div className="p-4 rounded-2xl bg-[#0b1329] border border-[#1a2c5b] relative overflow-hidden shadow-xl">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400">Deposited & Reconciled</p>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-2 font-mono">
            {formatCurrency(reconciledAmount)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Reconciled against bank statements & UTR
          </p>
        </div>

        {/* Pending Verification */}
        <div className="p-4 rounded-2xl bg-[#0b1329] border border-[#1a2c5b] relative overflow-hidden shadow-xl">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400">Pending Verification</p>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-purple-300 mt-2 font-mono">
            {pendingApprovalsCount} <span className="text-sm font-sans font-normal text-slate-400">Receipts</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Awaiting coordinator verification stage
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-[#0b1329] border border-[#1a2c5b] grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search receipt no, customer name..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#070c18] border border-[#1a2c5b] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[#070c18] border border-[#1a2c5b] text-white text-xs focus:outline-none focus:border-amber-400 transition"
          >
            <option value="">All Approval Statuses</option>
            <option value="PENDING">Pending Verification</option>
            <option value="VERIFIED">Verified by Coordinator</option>
            <option value="APPROVED">Approved by Admin</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        <div>
          <select
            value={depositFilter}
            onChange={(e) => setDepositFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[#070c18] border border-[#1a2c5b] text-white text-xs focus:outline-none focus:border-amber-400 transition"
          >
            <option value="">All Deposit Statuses</option>
            <option value="IN_HAND">In Hand / Pending Deposit</option>
            <option value="DEPOSITED_BRANCH">Deposited at Branch Counter</option>
            <option value="BANK_DEPOSITED">Deposited into Bank</option>
            <option value="RECONCILED">Reconciled & Balanced</option>
          </select>
        </div>

        <div>
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[#070c18] border border-[#1a2c5b] text-white text-xs focus:outline-none focus:border-amber-400 transition"
          >
            <option value="">All Payment Modes</option>
            <option value="CASH_HANDOVER">Physical Cash Handover</option>
            <option value="IMPS_UPI_QR">Instant UPI / QR</option>
            <option value="BANK_TRANSFER">NEFT / RTGS Bank Transfer</option>
            <option value="CHEQUE">Cheque Payment</option>
          </select>
        </div>
      </div>

      {/* Collections Table */}
      <div className="p-5 rounded-2xl bg-[#0b1329] border border-[#1a2c5b] shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#1a2c5b] text-slate-400 text-[11px] uppercase tracking-wider bg-[#0c1530]">
                <th className="py-3 px-3">Receipt / Date</th>
                <th className="py-3 px-3">Customer Details</th>
                <th className="py-3 px-3">Amount Collected (₹)</th>
                <th className="py-3 px-3">Payment Method</th>
                <th className="py-3 px-3">Field Executive</th>
                <th className="py-3 px-3">GPS Location</th>
                <th className="py-3 px-3">Approval Status</th>
                <th className="py-3 px-3">Deposit Reconciliation</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a2c5b]/60">
              {collections.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-400">
                    {loading ? 'Loading collections...' : 'No cash collection records found matching your filters.'}
                  </td>
                </tr>
              ) : (
                collections.map((item) => (
                  <tr key={item.id} className="hover:bg-[#111e3f]/50 transition">
                    <td className="py-3 px-3">
                      <p className="font-bold text-emerald-400 font-mono text-xs">{item.receipt_number}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {new Date(item.collection_datetime).toLocaleDateString()} {new Date(item.collection_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-semibold text-white">{item.customer_name}</p>
                      <p className="text-slate-400 flex items-center gap-1 mt-0.5 text-[11px]">
                        <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                        <span>{item.customer_mobile}</span>
                      </p>
                      {item.customer_address && (
                        <p className="text-[10px] text-slate-500 truncate max-w-[170px] mt-0.5">
                          {item.customer_address}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-emerald-400 text-sm font-mono">
                        {formatCurrency(item.cash_amount)}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-medium text-slate-200">{item.payment_method_display}</span>
                    </td>
                    <td className="py-3 px-3">
                      <p className="text-slate-300 font-medium">{item.employee_name}</p>
                      <p className="text-[10px] text-amber-400/90 font-mono">{item.employee_code}</p>
                    </td>
                    <td className="py-3 px-3">
                      {item.latitude && item.longitude ? (
                        <div className="flex items-center gap-1 text-emerald-400 font-mono text-[11px]">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span>{Number(item.latitude).toFixed(4)}, {Number(item.longitude).toFixed(4)}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px] italic">No GPS</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        item.approval_status === 'APPROVED' ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40' :
                        (item.approval_status === 'VERIFIED' ? 'bg-blue-950/80 text-blue-400 border-blue-500/40' :
                        (item.approval_status === 'REJECTED' ? 'bg-rose-950/80 text-rose-400 border-rose-500/40' :
                        'bg-amber-950/80 text-amber-400 border-amber-500/40'))
                      }`}>
                        {item.approval_status_display}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="space-y-1">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          item.deposit_status === 'RECONCILED' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30' :
                          (item.deposit_status === 'BANK_DEPOSITED' ? 'bg-blue-950/80 text-blue-300 border border-blue-500/30' :
                          (item.deposit_status === 'DEPOSITED_BRANCH' ? 'bg-teal-950/80 text-teal-300 border border-teal-500/30' :
                          'bg-amber-950/80 text-amber-400 border border-amber-500/30'))
                        }`}>
                          {item.deposit_status_display}
                        </span>
                        {item.bank_reference && (
                          <p className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">
                            Ref: {item.bank_reference}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setViewerItem(item);
                            setDetailModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#111e3f] hover:bg-[#1a2c5b] text-slate-200 hover:text-white text-[11px] font-medium transition cursor-pointer flex items-center gap-1"
                          title="View Details"
                        >
                          <Eye className="w-3 h-3 text-amber-400" />
                          <span>View</span>
                        </button>
                        {(isAdmin || isCoordinator || isSalesExecutive) && (
                          <button
                            onClick={() => openReconcileModal(item)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-300 hover:text-white text-[11px] font-semibold transition cursor-pointer flex items-center gap-1"
                            title="Reconcile Cash Deposit"
                          >
                            <Building className="w-3 h-3 text-emerald-400" />
                            <span>Reconcile</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Cash Collection */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-[#0b1329] border border-amber-500/40 rounded-2xl p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#1a2c5b]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Record Cash Collection & Receipt</h3>
                  <p className="text-xs text-slate-400">Issue official repayment receipt, tag coordinates, and record deposit status.</p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            {/* Field Sales Executive Identification Banner */}
            <div className="mt-4 p-3 rounded-xl bg-[#070c18] border border-[#1a2c5b] flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-slate-400">Field Sales Executive:</span>
                <span className="font-bold text-white">{user?.first_name || user?.username}</span>
                <span className="text-amber-400 font-mono font-bold">({user?.employee_id})</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Duty Session Logged</span>
              </div>
            </div>

            {errorMsg && (
              <div className="mt-4 p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-xs text-rose-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
              {/* Receipt & Datetime */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-400" />
                      <span>Receipt Number (Auto-Generated) *</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, receipt_number: generateReceiptNumber() })}
                      className="text-[10px] text-amber-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      <span>Regen</span>
                    </button>
                  </label>
                  <input
                    type="text"
                    required
                    readOnly
                    value={formData.receipt_number}
                    className="w-full px-3 py-2 rounded-xl bg-[#070c18] border border-amber-500/40 text-emerald-400 font-mono font-bold focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500">Guaranteed unique constraint in database.</span>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Collection Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.collection_datetime}
                    onChange={(e) => setFormData({ ...formData, collection_datetime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#070c18] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Customer Particulars */}
              <div className="p-3.5 rounded-xl bg-[#070c18] border border-[#1a2c5b] space-y-3">
                <p className="font-bold text-amber-400 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  <span>Customer Particulars</span>
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1">Customer Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.customer_name}
                      onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                      placeholder="e.g. Balaji Narayanan"
                      className="w-full px-3 py-2 rounded-lg bg-[#0b1329] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">Customer Mobile Number *</label>
                    <input
                      type="tel"
                      required
                      value={formData.customer_mobile}
                      onChange={(e) => setFormData({ ...formData, customer_mobile: e.target.value })}
                      placeholder="+91 98402 34567"
                      className="w-full px-3 py-2 rounded-lg bg-[#0b1329] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Customer Address</label>
                  <input
                    type="text"
                    value={formData.customer_address}
                    onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
                    placeholder="Customer residence / shop address..."
                    className="w-full px-3 py-2 rounded-lg bg-[#0b1329] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Cash Particulars & Payment Mode */}
              <div className="p-3.5 rounded-xl bg-[#070c18] border border-[#1a2c5b] space-y-3">
                <p className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <Banknote className="w-3.5 h-3.5" />
                  <span>Cash Amount & Payment Mode</span>
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1">Cash Amount (₹ INR) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.cash_amount}
                      onChange={(e) => setFormData({ ...formData, cash_amount: e.target.value })}
                      placeholder="e.g. 50000"
                      className="w-full px-3 py-2 rounded-lg bg-[#0b1329] border border-emerald-500/50 text-emerald-400 font-mono font-bold text-sm focus:outline-none focus:border-emerald-400"
                    />
                    {formData.cash_amount && !isNaN(Number(formData.cash_amount)) && Number(formData.cash_amount) > 0 && (
                      <p className="text-[10px] text-emerald-300 font-semibold mt-1">
                        Amount: {formatCurrency(formData.cash_amount)}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">Payment Method *</label>
                    <select
                      value={formData.payment_method}
                      onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-[#0b1329] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="CASH_HANDOVER">Physical Cash Handover</option>
                      <option value="IMPS_UPI_QR">Instant UPI / QR Transfer</option>
                      <option value="BANK_TRANSFER">NEFT / RTGS Bank Transfer</option>
                      <option value="CHEQUE">Cheque / Demand Draft</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Receipt / Proof Upload */}
              <div className="p-3.5 rounded-xl bg-[#070c18] border border-[#1a2c5b] space-y-2">
                <label className="block text-slate-300 font-semibold flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-amber-400" />
                  <span>Upload Receipt / Deposit Proof Photo</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleReceiptFileChange}
                  className="w-full text-[11px] text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:bg-[#111e3f] file:text-amber-300 file:font-semibold hover:file:bg-[#1a2c5b] cursor-pointer"
                />
                {receiptPreview && (
                  <div className="relative mt-2 rounded-lg overflow-hidden border border-emerald-500/40 w-full h-32 bg-black">
                    <img
                      src={receiptPreview}
                      alt="Receipt Preview"
                      className="w-full h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setReceiptFile(null);
                        setReceiptPreview(null);
                      }}
                      className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-rose-900/80 text-rose-200 text-[10px] font-bold"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* GPS Coordinates Capture */}
              <div className="p-3.5 rounded-xl bg-[#070c18] border border-[#1a2c5b] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <span className="font-semibold text-slate-200">Doorstep GPS Coordinates</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDetectGps}
                    disabled={locating}
                    className="px-3 py-1.5 rounded-lg bg-[#111e3f] hover:bg-[#1a2c5b] text-amber-300 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                  >
                    <MapPin className="w-3 h-3" />
                    <span>{locating ? 'Acquiring GPS...' : 'Auto-Detect Current GPS'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      placeholder="e.g. 13.0418"
                      className="w-full px-2.5 py-1.5 rounded bg-[#0b1329] border border-[#1a2c5b] text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      placeholder="e.g. 80.2341"
                      className="w-full px-2.5 py-1.5 rounded bg-[#0b1329] border border-[#1a2c5b] text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                {gpsAccuracy && (
                  <p className="text-[10px] text-emerald-400">
                    GPS Accuracy Radius: ±{gpsAccuracy} meters
                  </p>
                )}
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-slate-300 mb-1">Collection Remarks / Currency Denominations</label>
                <input
                  type="text"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="e.g. 500x100 notes verified; counterfeit UV detector cleared"
                  className="w-full px-3 py-2 rounded-xl bg-[#070c18] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[#1a2c5b] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20 transition cursor-pointer flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Saving Collection...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Submit Cash Collection</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Cash Deposit Reconciliation */}
      {reconcileModalOpen && reconcileItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0b1329] border border-emerald-500/40 rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-[#1a2c5b]">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Reconcile Cash Deposit</h3>
              </div>
              <button
                onClick={() => setReconcileModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="my-3 p-3 rounded-xl bg-[#070c18] border border-[#1a2c5b] text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Receipt No:</span>
                <span className="font-mono text-amber-400 font-bold">{reconcileItem.receipt_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Customer:</span>
                <span className="font-semibold text-white">{reconcileItem.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cash Amount:</span>
                <span className="font-bold text-emerald-400">{formatCurrency(reconcileItem.cash_amount)}</span>
              </div>
            </div>

            <form onSubmit={handleReconcileSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Deposit Status *</label>
                <select
                  value={reconcileData.deposit_status}
                  onChange={(e) => setReconcileData({ ...reconcileData, deposit_status: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#070c18] border border-[#1a2c5b] text-white focus:outline-none focus:border-emerald-400"
                >
                  <option value="IN_HAND">In Hand / Pending Deposit</option>
                  <option value="DEPOSITED_BRANCH">Deposited at Branch Counter</option>
                  <option value="BANK_DEPOSITED">Deposited into Company Bank Account</option>
                  <option value="RECONCILED">Reconciled & Balanced with Statements</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Bank Challan / UTR / Reference No</label>
                <input
                  type="text"
                  value={reconcileData.bank_reference}
                  onChange={(e) => setReconcileData({ ...reconcileData, bank_reference: e.target.value })}
                  placeholder="e.g. HDFC-UTR-882930419 / Slip No 402"
                  className="w-full px-3 py-2 rounded-xl bg-[#070c18] border border-[#1a2c5b] text-white font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Reconciliation Remarks</label>
                <textarea
                  rows="2"
                  value={reconcileData.reconciliation_remarks}
                  onChange={(e) => setReconcileData({ ...reconcileData, reconciliation_remarks: e.target.value })}
                  placeholder="Verified against daily ledger counter..."
                  className="w-full px-3 py-2 rounded-xl bg-[#070c18] border border-[#1a2c5b] text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="pt-3 border-t border-[#1a2c5b] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReconcileModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reconciling}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold transition shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  {reconciling ? 'Saving...' : 'Update Deposit Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Details Viewer */}
      {detailModalOpen && viewerItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-[#0b1329] border border-emerald-500/40 rounded-2xl p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#1a2c5b]">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-emerald-400" />
                  <span>Cash Collection Record</span>
                </h3>
                <p className="text-xs text-emerald-400 font-mono font-bold mt-0.5">{viewerItem.receipt_number}</p>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3 py-2 border-b border-[#1a2c5b]/40">
                <div>
                  <span className="text-slate-400 block text-[11px]">Customer</span>
                  <span className="font-bold text-white text-sm">{viewerItem.customer_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Mobile Phone</span>
                  <span className="font-semibold text-white">{viewerItem.customer_mobile}</span>
                </div>
              </div>

              {viewerItem.customer_address && (
                <div className="py-1 border-b border-[#1a2c5b]/40 text-slate-300">
                  <span className="text-slate-400 block text-[11px]">Customer Address:</span>
                  <span>{viewerItem.customer_address}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 py-2 border-b border-[#1a2c5b]/40">
                <div>
                  <span className="text-slate-400 block text-[11px]">Cash Amount Collected</span>
                  <span className="font-black text-emerald-400 text-base">{formatCurrency(viewerItem.cash_amount)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Payment Mode</span>
                  <span className="font-semibold text-white">{viewerItem.payment_method_display}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 py-2 border-b border-[#1a2c5b]/40">
                <div>
                  <span className="text-slate-400 block text-[11px]">Deposit Reconciliation</span>
                  <span className="font-bold text-amber-300">{viewerItem.deposit_status_display}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Bank Ref / UTR</span>
                  <span className="font-mono text-white">{viewerItem.bank_reference || '—'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 py-2 border-b border-[#1a2c5b]/40">
                <div>
                  <span className="text-slate-400 block text-[11px]">Field Executive</span>
                  <span className="font-semibold text-slate-200">{viewerItem.employee_name} ({viewerItem.employee_code})</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Timestamp</span>
                  <span className="font-semibold text-slate-200">
                    {new Date(viewerItem.collection_datetime).toLocaleString()}
                  </span>
                </div>
              </div>

              {viewerItem.latitude && viewerItem.longitude && (
                <div className="p-2.5 rounded-xl bg-[#070c18] border border-[#1a2c5b] flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Coordinates: {Number(viewerItem.latitude).toFixed(4)}, {Number(viewerItem.longitude).toFixed(4)}</span>
                  </div>
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${viewerItem.latitude}&mlon=${viewerItem.longitude}#map=16/${viewerItem.latitude}/${viewerItem.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
                  >
                    <span>View Map</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {viewerItem.verified_by_name && (
                <div className="p-2 rounded-xl bg-blue-950/40 border border-blue-500/30 text-blue-200">
                  <span className="font-bold block">Verified by Project Coordinator:</span>
                  <span>{viewerItem.verified_by_name} on {new Date(viewerItem.verified_at).toLocaleString()}</span>
                </div>
              )}

              {viewerItem.approved_by_name && (
                <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200">
                  <span className="font-bold block">Approved by Headquarters Admin:</span>
                  <span>{viewerItem.approved_by_name} on {new Date(viewerItem.approved_at).toLocaleString()}</span>
                </div>
              )}

              {viewerItem.receipt_photo && (
                <div className="pt-2">
                  <span className="text-slate-400 block mb-1 font-semibold">Receipt Attachment Proof</span>
                  <div className="rounded-xl overflow-hidden border border-[#1a2c5b] bg-[#070c18]">
                    <img
                      src={getMediaUrl(viewerItem.receipt_photo)}
                      alt="Receipt Attachment"
                      className="w-full h-44 object-contain bg-black/60"
                    />
                    <div className="p-2 text-right">
                      <a
                        href={getMediaUrl(viewerItem.receipt_photo)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-400 hover:underline text-[11px] font-semibold flex items-center justify-end gap-1"
                      >
                        <span>Full Size Proof</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#1a2c5b] flex justify-end">
              <button
                onClick={() => setDetailModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashCollection;
