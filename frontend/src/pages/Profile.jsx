import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import {
  User,
  Shield,
  Lock,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Building,
  CheckCircle,
  AlertCircle,
  KeyRound,
  FileBadge,
  Sparkles,
  Save,
  Radio
} from 'lucide-react';

const Profile = () => {
  const { user, refreshUser, isSalesExecutive, isCoordinator, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState('details'); // 'details', 'password'
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    emergency_contact: '',
    pan_or_aadhaar: '',
    address: ''
  });

  const [passData, setPassData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPass, setSavingPass] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        emergency_contact: user.emergency_contact || '',
        pan_or_aadhaar: user.pan_or_aadhaar || '',
        address: user.address || ''
      });
    }
  }, [user]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      await api.patch('/accounts/profile/', formData);
      await refreshUser();
      setSuccessMsg('Your profile particulars have been updated successfully.');
    } catch (err) {
      setErrorMsg(JSON.stringify(err.response?.data || 'Failed to update profile.'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (passData.new_password !== passData.confirm_password) {
      setErrorMsg('New password and confirmation do not match.');
      return;
    }

    setSavingPass(true);
    try {
      await api.post('/accounts/change-password/', {
        old_password: passData.old_password,
        new_password: passData.new_password
      });
      setSuccessMsg('Password changed successfully. Please keep your credentials secure.');
      setPassData({ old_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to change password. Please check your current password.');
    } finally {
      setSavingPass(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Profile Header Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0b1329] via-[#101c3d] to-[#0b1329] border border-[#1a2c5b] relative overflow-hidden shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600 via-yellow-500 to-amber-300 p-0.5 shadow-xl shadow-amber-500/20">
              <div className="w-full h-full bg-[#0b1329] rounded-[14px] flex items-center justify-center font-bold text-2xl text-amber-300">
                {user?.first_name ? user.first_name[0] : user?.username[0].toUpperCase()}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">
                  {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username}
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#1a2c5b] text-amber-300 border border-amber-400/30">
                  {user?.role_display}
                </span>
              </div>
              <p className="text-xs text-amber-400 font-mono mt-0.5">Employee ID: {user?.employee_id}</p>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  {user?.email || 'No email registered'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  {user?.phone || 'No mobile registered'}
                </span>
              </div>
            </div>
          </div>

          {/* Shift / Telemetry indicator */}
          <div className="px-3.5 py-2 rounded-xl bg-[#070c18] border border-[#1a2c5b] self-start sm:self-auto text-xs">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${user?.is_working ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <span className="text-slate-300 font-semibold">{user?.is_working ? 'Active On Field' : 'Shift Inactive'}</span>
            </div>
            {user?.current_latitude && (
              <p className="text-[10px] text-slate-500 font-mono mt-1">
                GPS: {Number(user.current_latitude).toFixed(4)}, {Number(user.current_longitude).toFixed(4)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-[#1a2c5b] pb-2">
        <button
          onClick={() => {
            setActiveTab('details');
            setSuccessMsg('');
            setErrorMsg('');
          }}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
            activeTab === 'details'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-slate-400 hover:text-white hover:bg-[#111e3f]'
          }`}
        >
          <User className="w-4 h-4 text-amber-400" />
          <span>Personal Particulars</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('password');
            setSuccessMsg('');
            setErrorMsg('');
          }}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
            activeTab === 'password'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-slate-400 hover:text-white hover:bg-[#111e3f]'
          }`}
        >
          <KeyRound className="w-4 h-4 text-amber-400" />
          <span>Security & Password</span>
        </button>
      </div>

      {/* Feedback Messages */}
      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 flex items-center gap-2 text-xs text-emerald-200">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 flex items-center gap-2 text-xs text-rose-200">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tab: Personal Particulars */}
      {activeTab === 'details' && (
        <div className="p-6 rounded-xl bg-[#0b1329] border border-[#1a2c5b] shadow-xl">
          <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
            <User className="w-4 h-4 text-amber-400" />
            <span>Profile Particulars</span>
          </h3>
          <p className="text-xs text-slate-400 mb-5">
            Keep your official contact and emergency reachability data up to date.
          </p>

          <form onSubmit={handleProfileSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 mb-1">First Name</label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#070c18] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Last Name</label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#070c18] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 mb-1">Official Mobile Phone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 rounded-lg bg-[#070c18] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Emergency Contact Number</label>
                <input
                  type="text"
                  value={formData.emergency_contact}
                  onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                  placeholder="+91 94440 99999 (Family / Next of Kin)"
                  className="w-full px-3 py-2 rounded-lg bg-[#070c18] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@goldfinance.com"
                  className="w-full px-3 py-2 rounded-lg bg-[#070c18] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Government ID (PAN / Aadhaar / Voter ID)</label>
                <input
                  type="text"
                  value={formData.pan_or_aadhaar}
                  onChange={(e) => setFormData({ ...formData, pan_or_aadhaar: e.target.value })}
                  placeholder="e.g. ABCDE1234F"
                  className="w-full px-3 py-2 rounded-lg bg-[#070c18] border border-[#1a2c5b] text-white font-mono focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Residential Street Address</label>
              <textarea
                rows="2"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Full residential address..."
                className="w-full px-3 py-2 rounded-lg bg-[#070c18] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Readonly Hierarchy Information */}
            <div className="p-3.5 rounded-xl bg-[#070c18] border border-[#1a2c5b] grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-400">
              <div>
                <span className="block text-[11px]">System Role</span>
                <span className="font-semibold text-white">{user?.role_display}</span>
              </div>

              <div>
                <span className="block text-[11px]">Joining Date</span>
                <span className="font-semibold text-white">{user?.joining_date || 'Permanent Staff'}</span>
              </div>

              {isSalesExecutive && (
                <div className="sm:col-span-2">
                  <span className="block text-[11px]">Reporting Project Coordinator</span>
                  <span className="font-semibold text-amber-300">{user?.assigned_coordinator_name || 'Unassigned / Direct HQ'}</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#1a2c5b] flex justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4 text-slate-950" />
                <span>{savingProfile ? 'Saving Changes...' : 'Save Profile Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab: Security & Password */}
      {activeTab === 'password' && (
        <div className="p-6 rounded-xl bg-[#0b1329] border border-[#1a2c5b] shadow-xl">
          <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400" />
            <span>Change Portal Password</span>
          </h3>
          <p className="text-xs text-slate-400 mb-5">
            Passwords must be at least 8 characters long and should contain letters, numbers, and symbols.
          </p>

          <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md text-xs">
            <div>
              <label className="block text-slate-300 mb-1">Current Password *</label>
              <input
                type="password"
                required
                value={passData.old_password}
                onChange={(e) => setPassData({ ...passData, old_password: e.target.value })}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-lg bg-[#070c18] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1">New Password *</label>
              <input
                type="password"
                required
                value={passData.new_password}
                onChange={(e) => setPassData({ ...passData, new_password: e.target.value })}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-lg bg-[#070c18] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Confirm New Password *</label>
              <input
                type="password"
                required
                value={passData.confirm_password}
                onChange={(e) => setPassData({ ...passData, confirm_password: e.target.value })}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-lg bg-[#070c18] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="pt-3 border-t border-[#1a2c5b] flex justify-end">
              <button
                type="submit"
                disabled={savingPass}
                className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20 transition flex items-center gap-1.5 cursor-pointer"
              >
                <KeyRound className="w-4 h-4 text-slate-950" />
                <span>{savingPass ? 'Updating Password...' : 'Update Password'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Profile;

