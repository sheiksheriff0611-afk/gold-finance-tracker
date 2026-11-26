import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Menu,
  Play,
  Square,
  MapPin,
  MapPinOff,
  Clock,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

const Navbar = ({ currentTab, setCurrentTab, setMobileOpen }) => {
  const { user, isSalesExecutive, toggleWorkShift, refreshUser } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsStatus, setGpsStatus] = useState('CHECKING'); // 'GRANTED', 'DENIED', 'UNAVAILABLE'
  const [errorMsg, setErrorMsg] = useState('');

  // Clock timer
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Check browser geolocation permission
  useEffect(() => {
    if ('geolocation' in navigator) {
      if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: 'geolocation' }).then((result) => {
          setGpsStatus(result.state.toUpperCase());
          result.onchange = () => setGpsStatus(result.state.toUpperCase());
        }).catch(() => {
          setGpsStatus('AVAILABLE');
        });
      } else {
        setGpsStatus('AVAILABLE');
      }
    } else {
      setGpsStatus('UNAVAILABLE');
    }
  }, []);

  const handleToggleShift = async (action) => {
    setErrorMsg('');
    setGpsLoading(true);

    if (action === 'START') {
      if (!('geolocation' in navigator)) {
        setErrorMsg('Geolocation is not supported by your browser.');
        setGpsLoading(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            await toggleWorkShift('START', {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            });
            setGpsStatus('GRANTED');
          } catch (err) {
            setErrorMsg(err.response?.data?.error || 'Failed to start shift.');
          } finally {
            setGpsLoading(false);
          }
        },
        async (error) => {
          console.warn("GPS Permission issue:", error);
          setGpsStatus('DENIED');
          // Still allow starting with notice
          try {
            await toggleWorkShift('START', null, 'Started without precise GPS (Permission denied)');
          } catch (err) {
            setErrorMsg('Failed to start shift.');
          } finally {
            setGpsLoading(false);
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      // END WORK
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            await toggleWorkShift('END', {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            });
          } catch (err) {
            setErrorMsg('Failed to end shift.');
          } finally {
            setGpsLoading(false);
          }
        },
        async () => {
          try {
            await toggleWorkShift('END', null);
          } catch (err) {
            setErrorMsg('Failed to end shift.');
          } finally {
            setGpsLoading(false);
          }
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  };

  const titles = {
    dashboard: 'Financial Overview & Analytics',
    tracking: 'Real-time GPS Tracking & Telemetry',
    visits: 'Customer Field Visits',
    gold: 'Gold Jewellery Collection',
    cash: 'Cash Collection & Deposit Tracking',
    approvals: 'Verification & Approval Workflow',
    employees: 'Employee Management & Hierarchy',
    targets: 'Target vs Achieved Performance',
    reports: 'Reports & Export Management',
    profile: 'My Profile & Security Settings',
  };

  return (
    <header className="sticky top-0 z-30 bg-[#080d1a]/95 backdrop-blur-md border-b border-[#1a2749] px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left: Mobile hamburger & Title */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-lg bg-[#121b33] text-slate-300 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base font-semibold text-white capitalize">
              {titles[currentTab] || currentTab}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-red-500" />
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span>•</span>
              <span>{currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-3">
          {/* Sales Executive Field Shift Controls */}
          {isSalesExecutive && (
            <div className="flex items-center space-x-2">
              {/* GPS status chip */}
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0c1222] border border-[#1a2749] text-[11px]">
                {user?.gps_enabled || gpsStatus === 'GRANTED' ? (
                  <>
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300 font-medium">GPS Ready</span>
                  </>
                ) : (
                  <>
                    <MapPinOff className="w-3.5 h-3.5 text-red-400" />
                    <span className="text-red-300 font-medium">GPS Off</span>
                  </>
                )}
              </div>

              {/* Start / End Work Button */}
              {user?.is_working ? (
                <button
                  onClick={() => handleToggleShift('END')}
                  disabled={gpsLoading}
                  className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-semibold shadow-md shadow-rose-900/30 transition-all cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>{gpsLoading ? 'Saving...' : 'End Work'}</span>
                </button>
              ) : (
                <button
                  onClick={() => handleToggleShift('START')}
                  disabled={gpsLoading}
                  className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md shadow-emerald-900/30 transition-all cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{gpsLoading ? 'Acquiring GPS...' : 'Start Work'}</span>
                </button>
              )}
            </div>
          )}

          {/* User badge */}
          <div 
            onClick={() => setCurrentTab && setCurrentTab('profile')}
            className="hidden md:flex items-center space-x-2 pl-3 border-l border-[#1a2749] hover:opacity-80 cursor-pointer transition"
            title="Click to view/edit profile"
          >
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-200">{user?.first_name || user?.username}</p>
              <p className="text-[10px] text-red-400 font-mono font-semibold">{user?.employee_id}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error / Warning Alert banner */}
      {errorMsg && (
        <div className="mt-2 p-2 rounded bg-rose-950/80 border border-rose-500/50 flex items-center justify-between text-xs text-rose-200">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-rose-400 hover:text-rose-200 font-bold ml-2">✕</button>
        </div>
      )}
    </header>
  );
};

export default Navbar;

