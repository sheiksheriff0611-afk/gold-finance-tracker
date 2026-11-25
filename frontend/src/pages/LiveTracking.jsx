import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import GpsMap from '../components/GpsMap';
import {
  MapPin,
  MapPinOff,
  Navigation,
  Clock,
  Phone,
  User,
  ShieldCheck,
  AlertTriangle,
  Play,
  Square,
  RefreshCw,
  Calendar,
  Layers,
  Activity,
  Battery,
  BatteryCharging,
  Compass,
  CheckCircle2,
  XCircle,
  FileText,
  Coins,
  Banknote,
  Search,
  Filter,
  Eye,
  History,
  Timer,
  ChevronRight
} from 'lucide-react';

const LiveTracking = () => {
  const { user, isSalesExecutive, isAdmin, isCoordinator, toggleWorkShift, refreshUser } = useAuth();

  // Active view tab: 'map' or 'shift_logs'
  const [activeTab, setActiveTab] = useState('map');

  // Map state
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [visits, setVisits] = useState([]);
  const [goldCollections, setGoldCollections] = useState([]);
  const [cashCollections, setCashCollections] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [loadingTrail, setLoadingTrail] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [flyToCoord, setFlyToCoord] = useState(null);

  // Search & filter
  const [searchRoster, setSearchRoster] = useState('');
  const [dutyFilter, setDutyFilter] = useState('ALL'); // ALL, ACTIVE, OFFLINE

  // Sales Executive Personal Shift & GPS Telemetry State
  const [activeShift, setActiveShift] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [gpsPermission, setGpsPermission] = useState('CHECKING'); // GRANTED, DENIED, PROMPT, UNAVAILABLE
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [batteryLevel, setBatteryLevel] = useState(null);
  const [lastPingTime, setLastPingTime] = useState(null);
  const [pingCount, setPingCount] = useState(0);

  // Shift Modal
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [shiftNotes, setShiftNotes] = useState('');

  // Shift History list state (Tab 2)
  const [shiftHistory, setShiftHistory] = useState([]);
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [shiftSearch, setShiftSearch] = useState('');

  // 1. Check Geolocation Permission & Battery on mount
  useEffect(() => {
    checkGpsPermission();

    if ('getBattery' in navigator) {
      navigator.getBattery().then((battery) => {
        setBatteryLevel(Math.round(battery.level * 100));
        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
      }).catch(() => {
        setBatteryLevel(null);
      });
    }
  }, []);

  const checkGpsPermission = async () => {
    if (!('geolocation' in navigator)) {
      setGpsPermission('UNAVAILABLE');
      return;
    }
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        setGpsPermission(result.state.toUpperCase());
        result.onchange = () => {
          setGpsPermission(result.state.toUpperCase());
        };
      } catch (err) {
        setGpsPermission('PROMPT');
      }
    } else {
      setGpsPermission('PROMPT');
    }
  };

  // 2. Fetch Active Shift for Sales Executive & Start Live Timer
  const fetchActiveShift = async () => {
    if (!isSalesExecutive && !user?.is_working) return;
    try {
      const res = await api.get('/tracking/active-shift/');
      if (res.data.is_active && res.data.shift) {
        setActiveShift(res.data.shift);
        setElapsedSeconds(res.data.shift.elapsed_seconds || 0);
        setPingCount(res.data.shift.pings_count || 0);
      } else {
        setActiveShift(null);
        setElapsedSeconds(0);
      }
    } catch (err) {
      console.error('Failed to fetch active shift:', err);
    }
  };

  useEffect(() => {
    fetchActiveShift();
  }, [user?.is_working]);

  // Live ticking seconds counter when shift is active
  useEffect(() => {
    let timer = null;
    if (user?.is_working) {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [user?.is_working]);

  // 3. Automated Background GPS Pinger (every 30 seconds while shift is active)
  useEffect(() => {
    if (!user?.is_working || !isSalesExecutive) return;

    const pingLocation = () => {
      if (!('geolocation' in navigator)) return;

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            await api.post('/tracking/ping/', {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy || 10.0,
              battery: batteryLevel,
              activity_type: 'PERIODIC_PING',
              notes: 'Periodic shift telemetry broadcast'
            });
            setLastPingTime(new Date());
            setPingCount((prev) => prev + 1);
            setGpsPermission('GRANTED');
            setGpsError('');
          } catch (err) {
            console.warn('Telemetry ping sync warning:', err);
          }
        },
        (err) => {
          console.warn('Telemetry ping geolocation error:', err);
          if (err.code === 1) {
            setGpsPermission('DENIED');
            setGpsError('GPS permission was revoked or blocked. Please re-enable location in your browser.');
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
      );
    };

    // Ping immediately on shift start, then every 30 seconds
    pingLocation();
    const interval = setInterval(pingLocation, 30000);
    return () => clearInterval(interval);
  }, [user?.is_working, isSalesExecutive, batteryLevel]);

  // 4. Fetch Live Locations for All / Assigned Field Staff
  const fetchLiveLocations = async () => {
    try {
      const res = await api.get('/tracking/live-locations/');
      setEmployees(res.data);
    } catch (err) {
      console.error('Error fetching live locations:', err);
    } finally {
      setLoading(false);
    }
  };

  // 5. Fetch Breadcrumbs, Visits, and Collections for an employee
  const fetchBreadcrumbs = async (empId, date) => {
    if (!empId) return;
    setLoadingTrail(true);
    try {
      const res = await api.get(`/tracking/breadcrumbs/${empId}/?date=${date}`);
      setBreadcrumbs(res.data.breadcrumbs || []);
      setVisits(res.data.visits || []);
      setGoldCollections(res.data.gold_collections || []);
      setCashCollections(res.data.cash_collections || []);
    } catch (err) {
      console.error('Error fetching breadcrumbs:', err);
      setBreadcrumbs([]);
      setVisits([]);
      setGoldCollections([]);
      setCashCollections([]);
    } finally {
      setLoadingTrail(false);
    }
  };

  // 6. Fetch Shift History (Tab 2)
  const fetchShiftHistory = async () => {
    setLoadingShifts(true);
    try {
      const res = await api.get('/tracking/shifts/');
      setShiftHistory(res.data);
    } catch (err) {
      console.error('Failed to load shift history:', err);
    } finally {
      setLoadingShifts(false);
    }
  };

  useEffect(() => {
    fetchLiveLocations();
  }, []);

  // Periodic polling for real-time map updates (every 15s)
  useEffect(() => {
    if (!autoRefresh || activeTab !== 'map') return;
    const interval = setInterval(() => {
      fetchLiveLocations();
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, activeTab]);

  useEffect(() => {
    if (selectedEmployee) {
      fetchBreadcrumbs(selectedEmployee.id, selectedDate);
    }
  }, [selectedEmployee, selectedDate]);

  useEffect(() => {
    if (activeTab === 'shift_logs') {
      fetchShiftHistory();
    }
  }, [activeTab]);

  // Handle Start Shift Flow
  const handleOpenStartModal = () => {
    setShiftNotes('');
    setGpsError('');
    setStartModalOpen(true);
  };

  const handleConfirmStartWork = async () => {
    setGpsLoading(true);
    setGpsError('');

    if (!('geolocation' in navigator)) {
      setGpsError('Geolocation is not supported by your browser.');
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await toggleWorkShift(
            'START',
            {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            },
            shiftNotes || 'Started Field Shift',
            batteryLevel
          );
          setGpsPermission('GRANTED');
          setStartModalOpen(false);
          await fetchActiveShift();
          await fetchLiveLocations();
        } catch (err) {
          setGpsError(err.response?.data?.error || 'Failed to start shift.');
        } finally {
          setGpsLoading(false);
        }
      },
      async (error) => {
        console.warn('GPS Permission issue on start:', error);
        setGpsPermission('DENIED');
        // Still allow fallback start with clear warning
        try {
          await toggleWorkShift(
            'START',
            null,
            (shiftNotes ? `${shiftNotes} - ` : '') + 'Started without precise GPS (Permission Denied)',
            batteryLevel
          );
          setStartModalOpen(false);
          await fetchActiveShift();
          await fetchLiveLocations();
        } catch (err) {
          setGpsError('Failed to start shift.');
        } finally {
          setGpsLoading(false);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Handle End Shift Flow
  const handleEndWork = async () => {
    if (!window.confirm('Are you sure you want to end your work shift? GPS tracking will pause.')) {
      return;
    }
    setGpsLoading(true);
    setGpsError('');

    const proceedEnd = async (coords = null) => {
      try {
        await toggleWorkShift('END', coords, 'Shift Completed', batteryLevel);
        setActiveShift(null);
        setElapsedSeconds(0);
        await fetchLiveLocations();
        if (selectedEmployee?.id === user?.id) {
          fetchBreadcrumbs(user.id, selectedDate);
        }
      } catch (err) {
        setGpsError('Failed to end shift.');
      } finally {
        setGpsLoading(false);
      }
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          await proceedEnd({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        async () => {
          await proceedEnd(null);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      await proceedEnd(null);
    }
  };

  // Format Timer HH:MM:SS
  const formatTimer = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  };

  const handleSelectEmp = (emp) => {
    setSelectedEmployee(emp);
    if (emp.latitude && emp.longitude) {
      setFlyToCoord({ lat: emp.latitude, lng: emp.longitude });
    }
  };

  // Filtered Roster
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchRoster.toLowerCase()) ||
      emp.employee_id.toLowerCase().includes(searchRoster.toLowerCase());
    const matchesDuty =
      dutyFilter === 'ALL' ||
      (dutyFilter === 'ACTIVE' && emp.is_working) ||
      (dutyFilter === 'OFFLINE' && !emp.is_working);
    return matchesSearch && matchesDuty;
  });

  const activeCount = employees.filter((e) => e.is_working).length;
  const offlineCount = employees.length - activeCount;

  // Chronological day activity timeline
  const combinedTimeline = [];
  breadcrumbs.forEach((b) => {
    combinedTimeline.push({
      type: 'PING',
      time: b.timestamp,
      title: b.activity_type_display || b.activity_type,
      subtitle: b.address_snapshot || 'Route checkpoint',
      latitude: b.latitude,
      longitude: b.longitude,
      badge: b.activity_type === 'START_WORK' ? 'SHIFT_START' : b.activity_type === 'END_WORK' ? 'SHIFT_END' : 'PING'
    });
  });
  visits.forEach((v) => {
    combinedTimeline.push({
      type: 'VISIT',
      time: v.time,
      title: `Visit: ${v.customer_name}`,
      subtitle: `${v.purpose} • ${v.status} • ${v.address}`,
      latitude: v.latitude,
      longitude: v.longitude,
      badge: 'VISIT'
    });
  });
  goldCollections.forEach((g) => {
    combinedTimeline.push({
      type: 'GOLD',
      time: g.time,
      title: `Gold Pledged: ${g.weight}g (${g.purity})`,
      subtitle: `Receipt: ${g.receipt_number} • Customer: ${g.customer_name}`,
      latitude: g.latitude,
      longitude: g.longitude,
      badge: 'GOLD'
    });
  });
  cashCollections.forEach((c) => {
    combinedTimeline.push({
      type: 'CASH',
      time: c.time,
      title: `Cash Collected: ₹${Number(c.amount).toLocaleString('en-IN')}`,
      subtitle: `Receipt: ${c.receipt_number} • Customer: ${c.customer_name}`,
      latitude: c.latitude,
      longitude: c.longitude,
      badge: 'CASH'
    });
  });

  // Sort timeline chronologically
  combinedTimeline.sort((a, b) => new Date(a.time) - new Date(b.time));

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Navigation className="w-5 h-5 text-amber-400" />
            <span>Interactive GPS Tracking & Movement History</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time, consented telemetry monitoring of field staff, routes, customer visits, and collections.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Tab Switcher */}
          <div className="flex rounded-lg bg-[#070c18] border border-[#1a2c5b] p-0.5 text-xs">
            <button
              onClick={() => setActiveTab('map')}
              className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'map'
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Interactive Map</span>
            </button>
            <button
              onClick={() => setActiveTab('shift_logs')}
              className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'shift_logs'
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Shift Logs</span>
            </button>
          </div>

          {activeTab === 'map' && (
            <>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
                  autoRefresh
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                    : 'bg-[#111e3f] border-[#1a2c5b] text-slate-400'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Live Feed: {autoRefresh ? 'ON (15s)' : 'PAUSED'}</span>
              </button>
              <button
                onClick={fetchLiveLocations}
                className="p-2 rounded-lg bg-[#111e3f] hover:bg-[#1a2c5b] border border-[#1a2c5b] text-slate-300 hover:text-white transition text-xs cursor-pointer"
                title="Refresh Locations"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* SALES EXECUTIVE: Dedicated Shift Telemetry Control Hub */}
      {isSalesExecutive && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#0c1530] via-[#0b1329] to-[#070c18] border border-amber-500/30 shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-[#1a2c5b]/80">
            {/* Status & Shift Info */}
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-inner ${
                  user?.is_working
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                    : 'bg-slate-800/40 border-slate-700 text-slate-400'
                }`}
              >
                {user?.is_working ? (
                  <Navigation className="w-6 h-6 animate-pulse text-emerald-400" />
                ) : (
                  <Timer className="w-6 h-6 text-slate-400" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                      user?.is_working
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 animate-pulse'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {user?.is_working ? '● ON FIELD DUTY — SHIFT ACTIVE' : '○ OFF DUTY — SHIFT IDLE'}
                  </span>
                  <span className="text-slate-500 text-xs hidden sm:inline">•</span>
                  <span className="text-xs text-amber-400 font-mono hidden sm:inline">
                    {user?.employee_id}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mt-0.5">
                  {user?.first_name || user?.username} — Field Telemetry Center
                </h3>
              </div>
            </div>

            {/* Shift Timer & Action Button */}
            <div className="flex flex-wrap items-center gap-3">
              {user?.is_working ? (
                <>
                  <div className="px-3.5 py-2 rounded-xl bg-[#070c18] border border-emerald-500/40 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-400 animate-spin" style={{ animationDuration: '6s' }} />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Shift Timer</p>
                      <p className="text-sm font-mono font-bold text-emerald-300">
                        {formatTimer(elapsedSeconds)}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleEndWork}
                    disabled={gpsLoading}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-bold shadow-lg shadow-rose-950/50 flex items-center gap-2 transition cursor-pointer"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    <span>{gpsLoading ? 'Ending Shift...' : 'End Work Shift'}</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={handleOpenStartModal}
                  disabled={gpsLoading}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-950/50 flex items-center gap-2 transition cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Work Shift</span>
                </button>
              )}
            </div>
          </div>

          {/* Telemetry Status Bar: GPS Permission, Coordinates, Battery & Ping Counter */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {/* 1. GPS Status */}
            <div className="p-2.5 rounded-xl bg-[#070c18] border border-[#1a2c5b] flex items-center gap-2.5">
              <div
                className={`p-2 rounded-lg ${
                  gpsPermission === 'GRANTED'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : gpsPermission === 'DENIED'
                    ? 'bg-rose-500/10 text-rose-400'
                    : 'bg-amber-500/10 text-amber-400'
                }`}
              >
                {gpsPermission === 'GRANTED' ? (
                  <MapPin className="w-4 h-4" />
                ) : (
                  <MapPinOff className="w-4 h-4" />
                )}
              </div>
              <div>
                <p className="text-[10px] text-slate-400">GPS Permission</p>
                <p
                  className={`font-semibold ${
                    gpsPermission === 'GRANTED'
                      ? 'text-emerald-400'
                      : gpsPermission === 'DENIED'
                      ? 'text-rose-400'
                      : 'text-amber-400'
                  }`}
                >
                  {gpsPermission === 'GRANTED'
                    ? 'Consented & Active'
                    : gpsPermission === 'DENIED'
                    ? 'Permission Denied'
                    : 'Prompt Required'}
                </p>
              </div>
            </div>

            {/* 2. Current Coordinates */}
            <div className="p-2.5 rounded-xl bg-[#070c18] border border-[#1a2c5b] flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <Compass className="w-4 h-4" />
              </div>
              <div className="truncate">
                <p className="text-[10px] text-slate-400">Current Coordinates</p>
                <p className="font-mono text-[11px] text-slate-200 truncate">
                  {user?.current_latitude && user?.current_longitude
                    ? `${Number(user.current_latitude).toFixed(4)}, ${Number(user.current_longitude).toFixed(4)}`
                    : 'Awaiting Fix'}
                </p>
              </div>
            </div>

            {/* 3. Battery Level */}
            <div className="p-2.5 rounded-xl bg-[#070c18] border border-[#1a2c5b] flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <BatteryCharging className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400">Device Battery</p>
                <p className="font-semibold text-slate-200">
                  {batteryLevel !== null ? `${batteryLevel}%` : 'Standard (AC)'}
                </p>
              </div>
            </div>

            {/* 4. Telemetry Pings */}
            <div className="p-2.5 rounded-xl bg-[#070c18] border border-[#1a2c5b] flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400">Shift Telemetry</p>
                <p className="font-semibold text-slate-200">
                  {user?.is_working ? `${pingCount} Pings (Auto 30s)` : 'Standby'}
                </p>
              </div>
            </div>
          </div>

          {/* GPS Permission Warning Box if Denied */}
          {gpsPermission === 'DENIED' && (
            <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-200">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-rose-100">GPS Permission Disabled in Browser</p>
                  <p className="text-rose-300 text-[11px] mt-0.5">
                    Click the padlock / site icon on the left of your browser address bar, set Location to <b>"Allow"</b>, and click Retry to resume transparent telemetry.
                  </p>
                </div>
              </div>
              <button
                onClick={checkGpsPermission}
                className="px-3 py-1.5 rounded-lg bg-rose-800 hover:bg-rose-700 text-white text-xs font-semibold shrink-0 cursor-pointer transition"
              >
                Retry GPS Connection
              </button>
            </div>
          )}

          {gpsError && (
            <div className="p-2.5 rounded-lg bg-rose-950/80 border border-rose-500/50 text-xs text-rose-200 flex items-center justify-between">
              <span>{gpsError}</span>
              <button onClick={() => setGpsError('')} className="text-rose-400 hover:text-white font-bold ml-2">✕</button>
            </div>
          )}
        </div>
      )}

      {/* ADMIN & COORDINATOR: Ethical Tracking Notification Banner */}
      {!isSalesExecutive && (
        <div className="p-3.5 rounded-xl bg-[#0c1530] border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-300">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <b>Consented Tracking Active:</b> Field staff are only monitored during explicit active shifts ("Start Work"). Background tracking requires employee GPS permission.
            </span>
          </div>
          <div className="flex items-center gap-3 text-slate-400 shrink-0">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <b className="text-emerald-400 font-bold">{activeCount}</b> Active On Field
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              <b className="text-slate-300 font-bold">{offlineCount}</b> Idle / Off Duty
            </span>
          </div>
        </div>
      )}

      {/* VIEW TAB 1: INTERACTIVE MAP & TELEMETRY */}
      {activeTab === 'map' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Map Column (3 cols) */}
            <div className="lg:col-span-3 space-y-4">
              <GpsMap
                employees={employees}
                breadcrumbs={breadcrumbs}
                visits={visits}
                goldCollections={goldCollections}
                cashCollections={cashCollections}
                selectedEmployee={selectedEmployee}
                onSelectEmployee={handleSelectEmp}
                flyToCoord={flyToCoord}
                height="560px"
              />

              {/* Breadcrumbs & Route Trail Controller */}
              <div className="p-4 rounded-xl bg-[#0b1329] border border-[#1a2c5b] flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedEmployee ? (
                    <>
                      <span className="w-3 h-3 rounded-full bg-amber-400" />
                      <span className="font-semibold text-white">
                        Route Trail: {selectedEmployee.name} ({selectedEmployee.employee_id})
                      </span>
                      <span className="text-slate-400">
                        • {breadcrumbs.length} pings • {visits.length} visits • {goldCollections.length + cashCollections.length} collections
                      </span>
                    </>
                  ) : (
                    <span className="text-slate-400">
                      Select an employee from the staff roster to inspect their daily route, customer visits, and collections.
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-[#070c18] px-2.5 py-1 rounded-lg border border-[#1a2c5b]">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="bg-transparent text-white text-xs focus:outline-none"
                    />
                  </div>

                  {selectedEmployee && (
                    <button
                      onClick={() => {
                        setSelectedEmployee(null);
                        setBreadcrumbs([]);
                        setVisits([]);
                        setGoldCollections([]);
                        setCashCollections([]);
                        setFlyToCoord(null);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition cursor-pointer"
                    >
                      Reset View
                    </button>
                  )}
                </div>
              </div>

              {/* Chronological Day Activity Stream (Timeline of the Selected Employee) */}
              {selectedEmployee && (
                <div className="p-5 rounded-2xl bg-[#0b1329] border border-[#1a2c5b] shadow-xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#1a2c5b]">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <Activity className="w-4 h-4 text-amber-400" />
                        <span>Day Activity & Route Timeline ({selectedDate})</span>
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Chronological sequence of shift starts, GPS waypoints, customer meetings, and pledges.
                      </p>
                    </div>
                    <span className="text-xs text-amber-400 font-mono font-semibold">
                      {combinedTimeline.length} Events Logged
                    </span>
                  </div>

                  {combinedTimeline.length === 0 ? (
                    <div className="py-6 text-center text-slate-500 text-xs">
                      {loadingTrail ? 'Loading movement history...' : `No route trail or visits recorded on ${selectedDate}.`}
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                      {combinedTimeline.map((item, index) => {
                        let dotColor = 'bg-amber-400';
                        let badgeBg = 'bg-[#111e3f] text-amber-300 border-[#1a2c5b]';

                        if (item.badge === 'SHIFT_START') {
                          dotColor = 'bg-emerald-400';
                          badgeBg = 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40';
                        } else if (item.badge === 'SHIFT_END') {
                          dotColor = 'bg-rose-400';
                          badgeBg = 'bg-rose-950/80 text-rose-300 border-rose-500/40';
                        } else if (item.badge === 'VISIT') {
                          dotColor = 'bg-blue-400';
                          badgeBg = 'bg-blue-950/80 text-blue-300 border-blue-500/40';
                        } else if (item.badge === 'GOLD') {
                          dotColor = 'bg-yellow-400';
                          badgeBg = 'bg-yellow-950/80 text-yellow-300 border-yellow-500/40';
                        } else if (item.badge === 'CASH') {
                          dotColor = 'bg-emerald-400';
                          badgeBg = 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40';
                        }

                        return (
                          <div
                            key={index}
                            onClick={() => {
                              if (item.latitude && item.longitude) {
                                setFlyToCoord({ lat: item.latitude, lng: item.longitude });
                              }
                            }}
                            className="p-2.5 rounded-xl bg-[#070c18] border border-[#1a2c5b] hover:border-amber-400/50 hover:bg-[#0c1530] flex items-center justify-between text-xs cursor-pointer transition group"
                          >
                            <div className="flex items-center gap-3">
                              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColor}`} />
                              <div>
                                <p className="font-semibold text-slate-200 group-hover:text-amber-300 transition">
                                  {item.title}
                                </p>
                                <p className="text-[11px] text-slate-400">{item.subtitle}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${badgeBg}`}>
                                {item.badge}
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono">
                                {item.time ? new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Employee Roster / Filter Column (1 col) */}
            <div className="lg:col-span-1 space-y-4">
              <div className="p-4 rounded-xl bg-[#0b1329] border border-[#1a2c5b] space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-amber-400" />
                    <span>Field Staff Directory</span>
                  </h3>
                  <span className="text-amber-400 font-mono text-[11px] font-bold">
                    {filteredEmployees.length}
                  </span>
                </div>

                {/* Search in Roster */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={searchRoster}
                    onChange={(e) => setSearchRoster(e.target.value)}
                    placeholder="Search by name or ID..."
                    className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-[#070c18] border border-[#1a2c5b] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Duty Status Filter Pill */}
                <div className="grid grid-cols-3 gap-1 bg-[#070c18] p-1 rounded-lg border border-[#1a2c5b] text-[10px]">
                  <button
                    onClick={() => setDutyFilter('ALL')}
                    className={`py-1 rounded font-medium transition cursor-pointer ${
                      dutyFilter === 'ALL' ? 'bg-[#1a2c5b] text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All ({employees.length})
                  </button>
                  <button
                    onClick={() => setDutyFilter('ACTIVE')}
                    className={`py-1 rounded font-medium transition cursor-pointer ${
                      dutyFilter === 'ACTIVE' ? 'bg-emerald-950/80 text-emerald-300 font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Active ({activeCount})
                  </button>
                  <button
                    onClick={() => setDutyFilter('OFFLINE')}
                    className={`py-1 rounded font-medium transition cursor-pointer ${
                      dutyFilter === 'OFFLINE' ? 'bg-slate-800 text-slate-300' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Offline ({offlineCount})
                  </button>
                </div>

                {/* Staff Cards List */}
                <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
                  {filteredEmployees.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-8">No employees found.</p>
                  ) : (
                    filteredEmployees.map((emp) => {
                      const isSelected = selectedEmployee?.id === emp.id;
                      const hasLocation = emp.latitude && emp.longitude;

                      return (
                        <div
                          key={emp.id}
                          onClick={() => handleSelectEmp(emp)}
                          className={`p-3 rounded-xl border text-xs cursor-pointer transition-all duration-200 ${
                            isSelected
                              ? 'bg-amber-500/15 border-amber-500/70 shadow-md shadow-amber-500/10'
                              : 'bg-[#070c18] border-[#1a2c5b] hover:border-slate-500 hover:bg-[#0c1530]'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-slate-200">{emp.name}</p>
                              <p className="text-[10px] text-amber-400 font-mono">{emp.employee_id}</p>
                            </div>
                            <span
                              className={`w-2.5 h-2.5 rounded-full ${
                                emp.is_working ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                              }`}
                              title={emp.is_working ? 'On Field Duty' : 'Offline'}
                            />
                          </div>

                          <div className="mt-2 space-y-1 text-[11px] text-slate-400">
                            <div className="flex items-center justify-between">
                              <span>Shift Status:</span>
                              <span className={emp.is_working ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                                {emp.is_working ? 'ACTIVE ON FIELD' : 'IDLE'}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span>GPS Telemetry:</span>
                              <span className={hasLocation ? 'text-emerald-400' : 'text-amber-400'}>
                                {hasLocation ? 'Broadcasting' : 'Unavailable'}
                              </span>
                            </div>

                            {emp.assigned_coordinator_name && (
                              <div className="flex items-center justify-between text-[10px]">
                                <span>Coordinator:</span>
                                <span className="text-slate-300 truncate max-w-[110px]">{emp.assigned_coordinator_name}</span>
                              </div>
                            )}

                            {emp.last_location_time && (
                              <div className="flex items-center justify-between text-[10px] pt-1 border-t border-[#1a2c5b]/40">
                                <span>Last Ping:</span>
                                <span>
                                  {new Date(emp.last_location_time).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="mt-2.5 text-right">
                            <span className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold flex items-center justify-end gap-1">
                              <span>{isSelected ? 'Trail Showing ✓' : 'Inspect Movement'}</span>
                              <ChevronRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW TAB 2: SHIFT LOGS & HISTORICAL AUDIT */}
      {activeTab === 'shift_logs' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[#0b1329] border border-[#1a2c5b] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-sm font-bold text-white">Shift Sessions & Telemetry Logs</h3>
                <p className="text-xs text-slate-400">Complete records of duty start times, end times, durations, and GPS pings.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={shiftSearch}
                  onChange={(e) => setShiftSearch(e.target.value)}
                  placeholder="Filter by employee name / ID..."
                  className="pl-8 pr-3 py-1.5 rounded-lg bg-[#070c18] border border-[#1a2c5b] text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <button
                onClick={fetchShiftHistory}
                className="p-2 rounded-lg bg-[#111e3f] hover:bg-[#1a2c5b] border border-[#1a2c5b] text-slate-300 hover:text-white transition cursor-pointer"
                title="Refresh Logs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-[#0b1329] border border-[#1a2c5b] shadow-xl overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#1a2c5b] text-slate-400 text-[11px] uppercase tracking-wider bg-[#0c1530]">
                  <th className="py-3 px-3">Employee</th>
                  <th className="py-3 px-3">Start Duty</th>
                  <th className="py-3 px-3">End Duty</th>
                  <th className="py-3 px-3">Duration</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">GPS Pings</th>
                  <th className="py-3 px-3">Shift Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a2c5b]/60">
                {shiftHistory.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-400">
                      {loadingShifts ? 'Loading shift history...' : 'No shift logs recorded yet.'}
                    </td>
                  </tr>
                ) : (
                  shiftHistory
                    .filter((s) =>
                      s.employee_name.toLowerCase().includes(shiftSearch.toLowerCase()) ||
                      s.employee_id.toLowerCase().includes(shiftSearch.toLowerCase())
                    )
                    .map((s) => (
                      <tr key={s.id} className="hover:bg-[#111e3f]/40 transition">
                        <td className="py-3 px-3">
                          <p className="font-bold text-white">{s.employee_name}</p>
                          <p className="text-[10px] text-amber-400 font-mono">{s.employee_id}</p>
                        </td>
                        <td className="py-3 px-3">
                          <p className="text-slate-200 font-medium">{s.start_time}</p>
                        </td>
                        <td className="py-3 px-3">
                          <p className={s.is_active ? 'text-emerald-400 font-semibold' : 'text-slate-300'}>
                            {s.end_time}
                          </p>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono text-slate-200">
                            {s.duration_minutes !== null ? `${s.duration_minutes} mins` : 'In Progress'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              s.is_active
                                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 animate-pulse'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {s.is_active ? 'ACTIVE' : 'COMPLETED'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded bg-[#111e3f] text-amber-300 font-mono text-[11px] border border-[#1a2c5b]">
                            {s.pings_count} pings
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-400 max-w-[200px] truncate">
                          {s.notes || '—'}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: START WORK WITH OPTIONAL NOTES */}
      {startModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0b1329] border border-amber-500/40 rounded-2xl p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <Play className="w-6 h-6 fill-current" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Start Work Shift</h3>
                <p className="text-xs text-slate-400">Begin active field duty & start transparent GPS telemetry.</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#070c18] border border-[#1a2c5b] space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>Employee:</span>
                <span className="font-semibold text-white">{user?.first_name || user?.username}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Employee ID:</span>
                <span className="font-mono text-amber-400">{user?.employee_id}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>GPS Consent:</span>
                <span className="text-emerald-400 font-medium">Consented upon starting</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Pre-Shift Notes (Optional)
              </label>
              <textarea
                rows="3"
                value={shiftNotes}
                onChange={(e) => setShiftNotes(e.target.value)}
                placeholder="e.g. Starting customer visits in T. Nagar and Kodambakkam route..."
                className="w-full px-3 py-2 rounded-xl bg-[#070c18] border border-[#1a2c5b] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="pt-2 border-t border-[#1a2c5b] flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setStartModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmStartWork}
                disabled={gpsLoading}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold shadow-md shadow-emerald-500/20 transition cursor-pointer flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{gpsLoading ? 'Acquiring GPS...' : 'Confirm & Start Shift'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveTracking;
