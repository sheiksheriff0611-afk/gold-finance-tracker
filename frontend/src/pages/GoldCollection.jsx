import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api, { getMediaUrl } from '../api';
import {
  Coins,
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
  Eye,
  ShieldCheck,
  Scale,
  Sparkles,
  ExternalLink,
  Lock,
  RefreshCw,
  Image as ImageIcon,
  Check,
  AlertTriangle,
  FileText
} from 'lucide-react';

const GoldCollection = () => {
  const { user, isSalesExecutive, isAdmin, isCoordinator } = useAuth();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [purityFilter, setPurityFilter] = useState('');
  const [jewelleryFilter, setJewelleryFilter] = useState('');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [locating, setLocating] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);

  // Photo viewer modal
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [viewerItem, setViewerItem] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_mobile: '',
    customer_address: '',
    jewellery_type: 'BANGLES',
    jewellery_description: '',
    gold_weight_grams: '',
    gold_purity: '22K',
    estimated_value: '',
    collection_datetime: new Date().toISOString().slice(0, 16),
    receipt_number: '',
    latitude: '',
    longitude: '',
    remarks: '',
  });

  const [jewelleryFile, setJewelleryFile] = useState(null);
  const [jewelleryPreview, setJewelleryPreview] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);

  // Benchmarked Gold Rates per Gram (INR)
  const GOLD_RATES = {
    '24K': 7850, // 99.9% fine gold
    '22K': 7200, // 91.6% BIS 916 hallmarked
    '20K': 6550, // 83.3%
    '18K': 5890  // 75.0%
  };

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (purityFilter) params.purity = purityFilter;
      if (jewelleryFilter) params.jewellery_type = jewelleryFilter;

      const res = await api.get('/collections/gold/', { params });
      setCollections(res.data.results || res.data);
    } catch (err) {
      console.error('Failed to load gold collections:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, [search, statusFilter, purityFilter, jewelleryFilter]);

  const generateReceiptNumber = () => {
    const today = new Date();
    const dateStr = today.toISOString().slice(2, 10).replace(/-/g, '');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `GLD-${dateStr}-${random}`;
  };

  const openAddModal = () => {
    const newReceipt = generateReceiptNumber();
    setFormData({
      customer_name: '',
      customer_mobile: '',
      customer_address: '',
      jewellery_type: 'BANGLES',
      jewellery_description: '',
      gold_weight_grams: '',
      gold_purity: '22K',
      estimated_value: '',
      collection_datetime: new Date().toISOString().slice(0, 16),
      receipt_number: newReceipt,
      latitude: user?.current_latitude ? String(user.current_latitude) : '',
      longitude: user?.current_longitude ? String(user.current_longitude) : '',
      remarks: '',
    });
    setJewelleryFile(null);
    setJewelleryPreview(null);
    setReceiptFile(null);
    setReceiptPreview(null);
    setGpsAccuracy(null);
    setErrorMsg('');
    setModalOpen(true);
  };

  // Auto-calculate market valuation when weight or purity changes
  const calculateEstimate = (weight, purity) => {
    const w = parseFloat(weight);
    if (!w || isNaN(w) || w <= 0) return 0;
    const rate = GOLD_RATES[purity] || 7200;
    return Math.round(w * rate);
  };

  const handleWeightChange = (val) => {
    setFormData((prev) => {
      const est = calculateEstimate(val, prev.gold_purity);
      return { ...prev, gold_weight_grams: val, estimated_value: est ? String(est) : '' };
    });
  };

  const handlePurityChange = (val) => {
    setFormData((prev) => {
      const est = calculateEstimate(prev.gold_weight_grams, val);
      return { ...prev, gold_purity: val, estimated_value: est ? String(est) : '' };
    });
  };

  // File Handlers with Preview
  const handleJewelleryFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setJewelleryFile(file);
      setJewelleryPreview(URL.createObjectURL(file));
    }
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
        setErrorMsg('Could not detect location. Please ensure GPS permission is granted.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');

    // Client-side validations
    const weightNum = parseFloat(formData.gold_weight_grams);
    if (isNaN(weightNum) || weightNum <= 0) {
      setErrorMsg('Please enter a valid positive gold weight.');
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
      if (jewelleryFile) data.append('jewellery_photo', jewelleryFile);
      if (receiptFile) data.append('receipt_photo', receiptFile);

      await api.post('/collections/gold/', data, {
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
        setErrorMsg('Failed to submit gold collection. Duplicate receipt or validation error.');
      }
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amt) => {
    return `₹${Number(amt || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  // Aggregated KPI Stats
  const totalWeightGrams = collections.reduce((acc, c) => acc + Number(c.gold_weight_grams || 0), 0);
  const totalEstValue = collections.reduce((acc, c) => acc + Number(c.estimated_value || 0), 0);
  const pendingCount = collections.filter(c => c.approval_status === 'PENDING').length;
  const pendingWeight = collections.filter(c => c.approval_status === 'PENDING').reduce((acc, c) => acc + Number(c.gold_weight_grams || 0), 0);
  const approvedCount = collections.filter(c => c.approval_status === 'APPROVED').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-400" />
            <span>Gold Jewellery Collection & Vault Management</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Doorstep precious metal intake, purity appraisal, weighing receipt generation, and photo verification.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Gold Collection</span>
        </button>
      </div>

      {/* Top Financial KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Gold Weight */}
        <div className="p-4 rounded-2xl bg-[#0b1329] border border-[#1a2c5b] relative overflow-hidden shadow-xl">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400">Total Collateral Weight</p>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-300 mt-2 font-mono">
            {totalWeightGrams.toFixed(3)} <span className="text-sm font-sans font-normal text-amber-400/80">grams</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {collections.length} total pledge records booked
          </p>
        </div>

        {/* Card 2: Total Market Valuation */}
        <div className="p-4 rounded-2xl bg-[#0b1329] border border-[#1a2c5b] relative overflow-hidden shadow-xl">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400">Estimated Vault Valuation</p>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-2">
            {formatCurrency(totalEstValue)}
          </p>
          <p className="text-[11px] text-emerald-400 mt-1">
            Based on current bullion benchmark rates
          </p>
        </div>

        {/* Card 3: Pending Verification */}
        <div className="p-4 rounded-2xl bg-[#0b1329] border border-[#1a2c5b] relative overflow-hidden shadow-xl">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400">Pending Verification</p>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-400 mt-2 font-mono">
            {pendingWeight.toFixed(3)} <span className="text-sm font-sans font-normal text-amber-400/80">g</span>
          </p>
          <p className="text-[11px] text-amber-300/80 mt-1">
            {pendingCount} submissions awaiting coordinator review
          </p>
        </div>

        {/* Card 4: Approved & Vaulted */}
        <div className="p-4 rounded-2xl bg-[#0b1329] border border-[#1a2c5b] relative overflow-hidden shadow-xl">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400">Approved & Locked Vault</p>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-2 font-mono">
            {approvedCount} <span className="text-sm font-sans font-normal text-slate-400">Pledges</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Fully verified and locked against edits
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
            value={purityFilter}
            onChange={(e) => setPurityFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[#070c18] border border-[#1a2c5b] text-white text-xs focus:outline-none focus:border-amber-400 transition"
          >
            <option value="">All Gold Purities</option>
            <option value="24K">24 Karat (99.9% Fine Gold)</option>
            <option value="22K">22 Karat (91.6% BIS Hallmarked)</option>
            <option value="20K">20 Karat (83.3%)</option>
            <option value="18K">18 Karat (75.0%)</option>
          </select>
        </div>

        <div>
          <select
            value={jewelleryFilter}
            onChange={(e) => setJewelleryFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[#070c18] border border-[#1a2c5b] text-white text-xs focus:outline-none focus:border-amber-400 transition"
          >
            <option value="">All Jewellery Types</option>
            <option value="BANGLES">Gold Bangles</option>
            <option value="NECKLACE">Gold Necklace</option>
            <option value="CHAIN">Gold Chain</option>
            <option value="RING">Gold Rings</option>
            <option value="EARRINGS">Gold Earrings</option>
            <option value="COINS">Gold Coins / Bars</option>
            <option value="MIXED_ITEMS">Assorted Jewellery</option>
            <option value="OTHER">Other Ornaments</option>
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
                <th className="py-3 px-3">Jewellery Type</th>
                <th className="py-3 px-3">Weight & Purity</th>
                <th className="py-3 px-3">Est. Value (₹)</th>
                <th className="py-3 px-3">Field Executive</th>
                <th className="py-3 px-3">GPS Location</th>
                <th className="py-3 px-3">Approval Status</th>
                <th className="py-3 px-3 text-right">Proof & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a2c5b]/60">
              {collections.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-400">
                    {loading ? 'Loading collections...' : 'No gold collection records found matching your filters.'}
                  </td>
                </tr>
              ) : (
                collections.map((item) => (
                  <tr key={item.id} className="hover:bg-[#111e3f]/50 transition">
                    <td className="py-3 px-3">
                      <p className="font-bold text-amber-400 font-mono text-xs">{item.receipt_number}</p>
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
                      <span className="font-medium text-slate-200">{item.jewellery_type_display}</span>
                      {item.jewellery_description && (
                        <p className="text-[10px] text-slate-500 truncate max-w-[160px] mt-0.5">
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
                    <td className="py-3 px-3">
                      <span className="font-bold text-white text-xs">{formatCurrency(item.estimated_value)}</span>
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
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => {
                          setViewerItem(item);
                          setPhotoViewerOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#111e3f] hover:bg-[#1a2c5b] text-slate-200 hover:text-white text-[11px] font-medium transition cursor-pointer flex items-center gap-1.5 ml-auto"
                      >
                        <Eye className="w-3 h-3 text-amber-400" />
                        <span>Inspect & Proof</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Gold Collection */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-[#0b1329] border border-amber-500/40 rounded-2xl p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#1a2c5b]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Submit Gold Jewellery Collection</h3>
                  <p className="text-xs text-slate-400">Record customer jewellery intake, appraisal details, and upload photos.</p>
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
              {/* Receipt Number (Locked) & Collection Datetime */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-400" />
                      <span>Receipt Number (Auto-Generated & Locked) *</span>
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
                    className="w-full px-3 py-2 rounded-xl bg-[#070c18] border border-amber-500/40 text-amber-300 font-mono font-bold focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500">Uniqueness verified by database constraint.</span>
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
                      placeholder="e.g. Ramesh Krishnan"
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
                      placeholder="+91 98401 23456"
                      className="w-full px-3 py-2 rounded-lg bg-[#0b1329] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Customer Residential Address *</label>
                  <textarea
                    rows="2"
                    required
                    value={formData.customer_address}
                    onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
                    placeholder="Door No, Street Name, Area, City, Pincode..."
                    className="w-full px-3 py-2 rounded-lg bg-[#0b1329] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Jewellery Appraisal & Weight Details */}
              <div className="p-3.5 rounded-xl bg-[#070c18] border border-[#1a2c5b] space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-amber-400 flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5" />
                    <span>Jewellery Specifications & Valuation</span>
                  </p>
                  <span className="text-[11px] text-slate-400">
                    Live Rate: <b className="text-amber-300 font-mono">₹{GOLD_RATES[formData.gold_purity] || 7200}/g</b>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1">Jewellery Type *</label>
                    <select
                      value={formData.jewellery_type}
                      onChange={(e) => setFormData({ ...formData, jewellery_type: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-[#0b1329] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="BANGLES">Gold Bangles</option>
                      <option value="NECKLACE">Gold Necklace</option>
                      <option value="CHAIN">Gold Chain</option>
                      <option value="RING">Gold Rings</option>
                      <option value="EARRINGS">Gold Earrings</option>
                      <option value="COINS">Gold Coins / Bars</option>
                      <option value="MIXED_ITEMS">Assorted Jewellery Items</option>
                      <option value="OTHER">Other Gold Ornaments</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">Net Weight (Grams) *</label>
                    <input
                      type="number"
                      step="0.001"
                      required
                      value={formData.gold_weight_grams}
                      onChange={(e) => handleWeightChange(e.target.value)}
                      placeholder="e.g. 32.500"
                      className="w-full px-3 py-2 rounded-lg bg-[#0b1329] border border-[#1a2c5b] text-white font-mono font-bold focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">Gold Purity *</label>
                    <select
                      value={formData.gold_purity}
                      onChange={(e) => handlePurityChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#0b1329] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="24K">24K (99.9% Fine Gold)</option>
                      <option value="22K">22K (91.6% BIS 916)</option>
                      <option value="20K">20K (83.3%)</option>
                      <option value="18K">18K (75.0%)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-slate-300 mb-1">Item Description / Hallmarks</label>
                    <input
                      type="text"
                      value={formData.jewellery_description}
                      onChange={(e) => setFormData({ ...formData, jewellery_description: e.target.value })}
                      placeholder="e.g. 4 solid bangles with 916 KDM hallmark stamp"
                      className="w-full px-3 py-2 rounded-lg bg-[#0b1329] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">Estimated Valuation (₹ INR) *</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formData.estimated_value}
                      onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })}
                      placeholder="Auto-calculated estimate"
                      className="w-full px-3 py-2 rounded-lg bg-[#0b1329] border border-amber-500/50 text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>

              {/* Photos Upload with Live Previews */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Jewellery Photo */}
                <div className="p-3.5 rounded-xl bg-[#070c18] border border-[#1a2c5b] space-y-2">
                  <label className="block text-slate-300 font-semibold flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-amber-400" />
                    <span>Upload Jewellery Photo</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleJewelleryFileChange}
                    className="w-full text-[11px] text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:bg-[#111e3f] file:text-amber-300 file:font-semibold hover:file:bg-[#1a2c5b] cursor-pointer"
                  />
                  {jewelleryPreview && (
                    <div className="relative mt-2 rounded-lg overflow-hidden border border-amber-500/40 w-full h-28 bg-black">
                      <img
                        src={jewelleryPreview}
                        alt="Jewellery Preview"
                        className="w-full h-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setJewelleryFile(null);
                          setJewelleryPreview(null);
                        }}
                        className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-rose-900/80 text-rose-200 text-[10px] font-bold"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. Receipt Photo */}
                <div className="p-3.5 rounded-xl bg-[#070c18] border border-[#1a2c5b] space-y-2">
                  <label className="block text-slate-300 font-semibold flex items-center gap-1.5">
                    <FileCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>Upload Physical Receipt Photo</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleReceiptFileChange}
                    className="w-full text-[11px] text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:bg-[#111e3f] file:text-amber-300 file:font-semibold hover:file:bg-[#1a2c5b] cursor-pointer"
                  />
                  {receiptPreview && (
                    <div className="relative mt-2 rounded-lg overflow-hidden border border-amber-500/40 w-full h-28 bg-black">
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
                <label className="block text-slate-300 mb-1">Appraisal Remarks / Identification Marks</label>
                <input
                  type="text"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="e.g. Weighing verified on certified digital scale; stone weight deducted 1.2g"
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
                      <span>Submit Gold Collection</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Details & Proof */}
      {photoViewerOpen && viewerItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-[#0b1329] border border-amber-500/40 rounded-2xl p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#1a2c5b]">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span>Gold Collection Record & Proof</span>
                </h3>
                <p className="text-xs text-amber-400 font-mono font-bold mt-0.5">{viewerItem.receipt_number}</p>
              </div>
              <button
                onClick={() => setPhotoViewerOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3 py-2 border-b border-[#1a2c5b]/40">
                <div>
                  <span className="text-slate-400 block text-[11px]">Customer Full Name</span>
                  <span className="font-bold text-white text-sm">{viewerItem.customer_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Mobile Contact</span>
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
                  <span className="text-slate-400 block text-[11px]">Jewellery Type</span>
                  <span className="font-semibold text-white">{viewerItem.jewellery_type_display}</span>
                  {viewerItem.jewellery_description && (
                    <p className="text-[11px] text-slate-400 mt-0.5">{viewerItem.jewellery_description}</p>
                  )}
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Weight & Purity</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-bold text-amber-300 text-sm font-mono">{viewerItem.gold_weight_grams}g</span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-500/40 font-bold text-[10px]">
                      {viewerItem.gold_purity}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 py-2 border-b border-[#1a2c5b]/40">
                <div>
                  <span className="text-slate-400 block text-[11px]">Estimated Market Value</span>
                  <span className="font-black text-white text-sm">{formatCurrency(viewerItem.estimated_value)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Approval Stage</span>
                  <span className="font-bold text-amber-400">{viewerItem.approval_status_display}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 py-2 border-b border-[#1a2c5b]/40">
                <div>
                  <span className="text-slate-400 block text-[11px]">Collected By Field Executive</span>
                  <span className="font-semibold text-slate-200">{viewerItem.employee_name} ({viewerItem.employee_code})</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Collection Timestamp</span>
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

              {viewerItem.rejection_remarks && (
                <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200">
                  <span className="font-bold block">Rejection Remarks:</span>
                  <span>{viewerItem.rejection_remarks}</span>
                </div>
              )}

              {/* Photos Showcase */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <span className="text-slate-400 block mb-1 font-semibold">Jewellery Photo Proof</span>
                  {viewerItem.jewellery_photo ? (
                    <div className="rounded-xl overflow-hidden border border-[#1a2c5b] bg-[#070c18]">
                      <img
                        src={getMediaUrl(viewerItem.jewellery_photo)}
                        alt="Jewellery Proof"
                        className="w-full h-44 object-contain bg-black/60"
                      />
                      <div className="p-2 text-right">
                        <a
                          href={getMediaUrl(viewerItem.jewellery_photo)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-amber-400 hover:underline text-[11px] font-semibold flex items-center justify-end gap-1"
                        >
                          <span>Full Size Photo</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-36 rounded-xl bg-[#070c18] border border-[#1a2c5b] flex flex-col items-center justify-center text-slate-500 gap-1">
                      <ImageIcon className="w-6 h-6 text-slate-600" />
                      <span>No Jewellery Photo Uploaded</span>
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-slate-400 block mb-1 font-semibold">Signed Receipt Photo</span>
                  {viewerItem.receipt_photo ? (
                    <div className="rounded-xl overflow-hidden border border-[#1a2c5b] bg-[#070c18]">
                      <img
                        src={getMediaUrl(viewerItem.receipt_photo)}
                        alt="Receipt Proof"
                        className="w-full h-44 object-contain bg-black/60"
                      />
                      <div className="p-2 text-right">
                        <a
                          href={getMediaUrl(viewerItem.receipt_photo)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-amber-400 hover:underline text-[11px] font-semibold flex items-center justify-end gap-1"
                        >
                          <span>Full Size Receipt</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-36 rounded-xl bg-[#070c18] border border-[#1a2c5b] flex flex-col items-center justify-center text-slate-500 gap-1">
                      <FileCheck className="w-6 h-6 text-slate-600" />
                      <span>No Receipt Photo Uploaded</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#1a2c5b] flex justify-end">
              <button
                onClick={() => setPhotoViewerOpen(false)}
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

export default GoldCollection;
