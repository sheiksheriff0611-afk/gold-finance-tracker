import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import {
  CalendarCheck,
  Plus,
  Search,
  Filter,
  MapPin,
  Phone,
  Clock,
  User,
  CheckCircle,
  AlertCircle,
  Navigation,
  FileText
} from 'lucide-react';

const CustomerVisits = () => {
  const { user, isSalesExecutive, isAdmin, isCoordinator } = useAuth();
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [purposeFilter, setPurposeFilter] = useState('');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [locating, setLocating] = useState(false);

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_mobile: '',
    customer_address: '',
    visit_datetime: new Date().toISOString().slice(0, 16),
    latitude: '',
    longitude: '',
    visit_purpose: 'GOLD_COLLECTION',
    visit_status: 'COMPLETED',
    remarks: ''
  });

  const fetchVisits = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (purposeFilter) params.purpose = purposeFilter;

      const res = await api.get('/collections/visits/', { params });
      setVisits(res.data.results || res.data);
    } catch (err) {
      console.error('Failed to load visits:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisits();
  }, [search, statusFilter, purposeFilter]);

  const openAddModal = () => {
    setFormData({
      customer_name: '',
      customer_mobile: '',
      customer_address: '',
      visit_datetime: new Date().toISOString().slice(0, 16),
      latitude: user?.current_latitude ? String(user.current_latitude) : '',
      longitude: user?.current_longitude ? String(user.current_longitude) : '',
      visit_purpose: 'GOLD_COLLECTION',
      visit_status: 'COMPLETED',
      remarks: ''
    });
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleDetectGps = () => {
    if (!('geolocation' in navigator)) {
      setErrorMsg('Geolocation not supported by browser.');
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
        setLocating(false);
      },
      (err) => {
        console.warn('GPS detection failed:', err);
        setErrorMsg('Could not detect location. Please enter or ensure GPS is enabled.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');

    try {
      const payload = {
        ...formData,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      };
      await api.post('/collections/visits/', payload);
      setModalOpen(false);
      fetchVisits();
    } catch (err) {
      setErrorMsg(JSON.stringify(err.response?.data || 'Failed to record visit.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-amber-400" />
            <span>Customer Visit Management & GPS Records</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Log doorstep visits, collateral appraisals, verification meetings, and recovery interactions.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Log Customer Visit</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-[#0b1329] border border-[#1a2c5b] grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer, mobile, address..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#070c18] border border-[#1a2c5b] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
          />
        </div>

        <div>
          <select
            value={purposeFilter}
            onChange={(e) => setPurposeFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[#070c18] border border-[#1a2c5b] text-white text-xs focus:outline-none focus:border-amber-400 transition"
          >
            <option value="">All Visit Purposes</option>
            <option value="GOLD_COLLECTION">Gold Jewellery Collection</option>
            <option value="CASH_COLLECTION">Cash Collection / EMI</option>
            <option value="NEW_LOAN_INQUIRY">New Loan Inquiry</option>
            <option value="FOLLOW_UP">Customer Follow-up</option>
            <option value="DEFAULT_RECOVERY">Overdue / Recovery</option>
            <option value="DOCUMENT_VERIFICATION">Document Verification</option>
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[#070c18] border border-[#1a2c5b] text-white text-xs focus:outline-none focus:border-amber-400 transition"
          >
            <option value="">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="RESCHEDULED">Rescheduled</option>
            <option value="CUSTOMER_UNAVAILABLE">Customer Unavailable</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Visits Table */}
      <div className="p-5 rounded-xl bg-[#0b1329] border border-[#1a2c5b] shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#1a2c5b] text-slate-400 text-[11px] uppercase tracking-wider bg-[#0c1530]">
                <th className="py-3 px-3">Date & Time</th>
                <th className="py-3 px-3">Customer Details</th>
                <th className="py-3 px-3">Field Executive</th>
                <th className="py-3 px-3">Purpose</th>
                <th className="py-3 px-3">GPS Location</th>
                <th className="py-3 px-3">Visit Status</th>
                <th className="py-3 px-3">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a2c5b]/60">
              {visits.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    No customer visits recorded yet.
                  </td>
                </tr>
              ) : (
                visits.map((v) => (
                  <tr key={v.id} className="hover:bg-[#111e3f]/50 transition">
                    <td className="py-3 px-3">
                      <p className="font-semibold text-slate-200">
                        {new Date(v.visit_datetime).toLocaleDateString()}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {new Date(v.visit_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-bold text-white text-xs">{v.customer_name}</p>
                      <p className="text-slate-400 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-500" />
                        <span>{v.customer_mobile}</span>
                      </p>
                      <p className="text-slate-500 text-[10px] truncate max-w-[200px] mt-0.5">
                        {v.customer_address}
                      </p>
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-semibold text-slate-200">{v.employee_name}</p>
                      <p className="text-[10px] text-amber-400 font-mono">{v.employee_code}</p>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#111e3f] text-amber-300 border border-[#1a2c5b]">
                        {v.visit_purpose_display}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {v.latitude && v.longitude ? (
                        <div className="flex items-center gap-1 text-emerald-400 text-[11px]">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span className="font-mono">
                            {Number(v.latitude).toFixed(4)}, {Number(v.longitude).toFixed(4)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">No GPS</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        v.visit_status === 'COMPLETED' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {v.visit_status_display}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400 max-w-[200px] truncate">
                      {v.remarks || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Log Customer Visit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0b1329] border border-[#1a2c5b] rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-amber-400" />
              <span>Record Customer Field Visit</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter customer particulars and tag real-time GPS coordinates.
            </p>

            {errorMsg && (
              <div className="mb-4 p-2.5 rounded bg-rose-950 border border-rose-500/50 text-xs text-rose-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Customer Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full px-3 py-2 rounded bg-[#070c18] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Customer Mobile *</label>
                  <input
                    type="text"
                    required
                    value={formData.customer_mobile}
                    onChange={(e) => setFormData({ ...formData, customer_mobile: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 rounded bg-[#070c18] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Customer Address *</label>
                <textarea
                  rows="2"
                  required
                  value={formData.customer_address}
                  onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
                  placeholder="Door No, Street, Landmark, Area..."
                  className="w-full px-3 py-2 rounded bg-[#070c18] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Visit Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.visit_datetime}
                    onChange={(e) => setFormData({ ...formData, visit_datetime: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-[#070c18] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Visit Purpose *</label>
                  <select
                    value={formData.visit_purpose}
                    onChange={(e) => setFormData({ ...formData, visit_purpose: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-[#070c18] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="GOLD_COLLECTION">Gold Jewellery Collection</option>
                    <option value="CASH_COLLECTION">Cash Collection / EMI</option>
                    <option value="NEW_LOAN_INQUIRY">New Loan Inquiry</option>
                    <option value="FOLLOW_UP">Customer Follow-up</option>
                    <option value="DEFAULT_RECOVERY">Overdue / Recovery</option>
                    <option value="DOCUMENT_VERIFICATION">Document Verification</option>
                  </select>
                </div>
              </div>

              {/* GPS Capture section */}
              <div className="p-3 rounded-lg bg-[#070c18] border border-[#1a2c5b] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-amber-400" />
                    <span>GPS Telemetry Coordinates</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleDetectGps}
                    disabled={locating}
                    className="px-2.5 py-1 rounded bg-[#111e3f] hover:bg-[#1a2c5b] text-amber-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <MapPin className="w-3 h-3" />
                    <span>{locating ? 'Acquiring...' : 'Auto-Detect Current GPS'}</span>
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
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Visit Status</label>
                  <select
                    value={formData.visit_status}
                    onChange={(e) => setFormData({ ...formData, visit_status: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-[#070c18] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="COMPLETED">Completed</option>
                    <option value="RESCHEDULED">Rescheduled</option>
                    <option value="CUSTOMER_UNAVAILABLE">Customer Unavailable</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Remarks</label>
                  <input
                    type="text"
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    placeholder="Customer response, agreement..."
                    className="w-full px-3 py-2 rounded bg-[#070c18] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#1a2c5b] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-md shadow-amber-500/20 hover:from-amber-400 transition cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Submit Visit Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerVisits;

