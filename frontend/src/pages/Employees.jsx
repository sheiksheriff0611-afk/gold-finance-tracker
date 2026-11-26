import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Shield,
  Edit2,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  ArrowRight,
  Eye,
  UserCheck,
  Building,
  Coins,
  Banknote,
  TrendingUp,
  FileBadge,
  Layers,
  History,
  AlertCircle,
  ExternalLink,
  Navigation,
  IdCard,
  X
} from 'lucide-react';

const DEFAULT_CITIES_BRANCHES = [
  {
    city: 'Chennai',
    state: 'Tamil Nadu',
    branches: [
      'T. Nagar Main Branch',
      'Anna Nagar Branch',
      'Adyar Branch',
      'Velachery Branch',
      'Tambaram Branch',
      'George Town (Parrys) Branch',
      'Mylapore Branch',
      'Porur Branch',
      'Guindy Branch',
      'Ambattur Branch'
    ]
  },
  {
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    branches: [
      'Gandhipuram Main Branch',
      'R.S. Puram Branch',
      'Peelamedu Branch',
      'Singanallur Branch',
      'Saibaba Colony Branch',
      'Ukkadam Branch'
    ]
  },
  {
    city: 'Madurai',
    state: 'Tamil Nadu',
    branches: [
      'West Masi Street Main Branch',
      'KK Nagar Branch',
      'Simmakkal Branch',
      'Anna Nagar Madurai Branch',
      'Tallakulam Branch'
    ]
  },
  {
    city: 'Tiruchirappalli (Trichy)',
    state: 'Tamil Nadu',
    branches: [
      'Thillai Nagar Main Branch',
      'Cantonment Branch',
      'Srirangam Branch',
      'K.K. Nagar Trichy Branch'
    ]
  },
  {
    city: 'Salem',
    state: 'Tamil Nadu',
    branches: [
      'Junction Main Road Branch',
      'Fairlands Branch',
      'Meyyanur Branch',
      'Shevapet Branch'
    ]
  },
  {
    city: 'Tirunelveli',
    state: 'Tamil Nadu',
    branches: [
      'Town Hall Main Branch',
      'Palayamkottai Branch',
      'Vannarpettai Branch'
    ]
  },
  {
    city: 'Erode',
    state: 'Tamil Nadu',
    branches: [
      'Brough Road Main Branch',
      'Perundurai Road Branch',
      'Surampatti Branch'
    ]
  },
  {
    city: 'Vellore',
    state: 'Tamil Nadu',
    branches: [
      'Officer’s Line Main Branch',
      'Katpadi Branch',
      'Bagayam Branch'
    ]
  },
  {
    city: 'Thanjavur',
    state: 'Tamil Nadu',
    branches: [
      'South Rampart Main Branch',
      'Medical College Road Branch'
    ]
  },
  {
    city: 'Dindigul',
    state: 'Tamil Nadu',
    branches: [
      'Main Bazaar Branch',
      'Salai Road Branch'
    ]
  },
  {
    city: 'Tiruppur',
    state: 'Tamil Nadu',
    branches: [
      'Kumaran Road Main Branch',
      'Avinashi Road Branch'
    ]
  },
  {
    city: 'Bengaluru',
    state: 'Karnataka',
    branches: [
      'MG Road Main Branch',
      'Koramangala Branch',
      'Indiranagar Branch',
      'Jayanagar Branch',
      'Whitefield Branch',
      'Marathahalli Branch',
      'Malleshwaram Branch',
      'HSR Layout Branch'
    ]
  },
  {
    city: 'Hyderabad',
    state: 'Telangana',
    branches: [
      'Banjara Hills Main Branch',
      'Ameerpet Branch',
      'Dilsukhnagar Branch',
      'Secunderabad Branch',
      'Kukatpally Branch',
      'Gachibowli Branch'
    ]
  },
  {
    city: 'Kochi',
    state: 'Kerala',
    branches: [
      'MG Road Kochi Branch',
      'Edappally Branch',
      'Kaloor Branch',
      'Aluva Branch'
    ]
  },
  {
    city: 'Thiruvananthapuram',
    state: 'Kerala',
    branches: [
      'MG Road Trivandrum Branch',
      'Kazhakkoottam Branch'
    ]
  },
  {
    city: 'Mumbai',
    state: 'Maharashtra',
    branches: [
      'Fort Main Branch',
      'Andheri West Branch',
      'Dadar Branch',
      'Bandra Kurla Complex (BKC) Branch',
      'Borivali Branch',
      'Thane Branch'
    ]
  },
  {
    city: 'Pune',
    state: 'Maharashtra',
    branches: [
      'FC Road Main Branch',
      'Kothrud Branch',
      'Hinjewadi Branch'
    ]
  },
  {
    city: 'Delhi NCR',
    state: 'Delhi NCR',
    branches: [
      'Connaught Place Main Branch',
      'Karol Bagh Branch',
      'Nehru Place Branch',
      'Noida Sector 18 Branch',
      'Gurugram Cyber Hub Branch'
    ]
  }
];

const Employees = () => {
  const { user, isAdmin, isCoordinator } = useAuth();
  const [activeTab, setActiveTab] = useState('directory'); // 'directory', 'coordinators', 'create_coordinator'
  const [citiesBranches, setCitiesBranches] = useState(DEFAULT_CITIES_BRANCHES);

  // Employee Directory states
  const [employees, setEmployees] = useState([]);
  const [coordinators, setCoordinators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Coordinator Workload state
  const [workloadData, setWorkloadData] = useState(null);
  const [loadingWorkload, setLoadingWorkload] = useState(false);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editEmp, setEditEmp] = useState(null);
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyData, setHistoryData] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Reassignment form
  const [selectedExecIds, setSelectedExecIds] = useState([]);
  const [targetCoordinatorId, setTargetCoordinatorId] = useState('');
  const [reassigning, setReassigning] = useState(false);

  // Add / Edit form
  const [formData, setFormData] = useState({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    emergency_contact: '',
    pan_or_aadhaar: '',
    address: '',
    city: 'Chennai',
    branch: 'T. Nagar Main Branch',
    joining_date: '',
    role: 'SALES_EXECUTIVE',
    assigned_coordinator: '',
    status: 'ACTIVE',
    password: ''
  });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchCitiesBranches = async () => {
    try {
      const res = await api.get('/accounts/cities-branches/');
      if (Array.isArray(res.data) && res.data.length > 0) {
        setCitiesBranches(res.data);
      }
    } catch (err) {
      // Keep DEFAULT_CITIES_BRANCHES if network fails
    }
  };

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.status = statusFilter;

      const res = await api.get('/accounts/employees/', { params });
      setEmployees(res.data.results || res.data);
    } catch (err) {
      console.error('Failed to load employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCoordinators = async () => {
    try {
      const res = await api.get('/accounts/coordinators/');
      setCoordinators(res.data);
    } catch (err) {
      console.error('Failed to load coordinators:', err);
    }
  };

  const fetchCoordinatorWorkload = async () => {
    setLoadingWorkload(true);
    try {
      const res = await api.get('/accounts/coordinator-workload/');
      setWorkloadData(res.data);
    } catch (err) {
      console.error('Failed to load coordinator workload:', err);
    } finally {
      setLoadingWorkload(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchCoordinators();
    fetchCitiesBranches();
  }, [search, roleFilter, statusFilter]);

  useEffect(() => {
    if (activeTab === 'coordinators') {
      fetchCoordinatorWorkload();
    }
  }, [activeTab]);

  const handleCityChange = (newCity) => {
    const cityObj = citiesBranches.find(c => c.city.toLowerCase() === newCity.toLowerCase());
    const firstBranch = cityObj?.branches?.[0] || '';
    setFormData(prev => ({
      ...prev,
      city: newCity,
      branch: firstBranch
    }));
  };

  const currentCityObj = citiesBranches.find(c => c.city.toLowerCase() === (formData.city || '').toLowerCase());
  const availableBranches = currentCityObj ? currentCityObj.branches : citiesBranches.flatMap(c => c.branches);

  const openAddModal = (defaultRole = 'SALES_EXECUTIVE') => {
    setEditEmp(null);
    setFormData({
      username: '',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      emergency_contact: '',
      pan_or_aadhaar: '',
      address: '',
      city: defaultRole === 'COORDINATOR' ? 'Chennai' : '',
      branch: defaultRole === 'COORDINATOR' ? 'T. Nagar Main Branch' : '',
      joining_date: new Date().toISOString().split('T')[0],
      role: defaultRole,
      assigned_coordinator: defaultRole === 'COORDINATOR' ? '' : (isCoordinator ? user.id : ''),
      status: 'ACTIVE',
      password: ''
    });
    setErrorMsg('');
    setModalOpen(true);
  };

  const openEditModal = (emp) => {
    setEditEmp(emp);
    setFormData({
      username: emp.username,
      first_name: emp.first_name || '',
      last_name: emp.last_name || '',
      email: emp.email || '',
      phone: emp.phone || '',
      emergency_contact: emp.emergency_contact || '',
      pan_or_aadhaar: emp.pan_or_aadhaar || '',
      address: emp.address || '',
      city: emp.city || 'Chennai',
      branch: emp.branch || 'T. Nagar Main Branch',
      joining_date: emp.joining_date || '',
      role: emp.role,
      assigned_coordinator: emp.assigned_coordinator || '',
      status: emp.status,
      password: ''
    });
    setErrorMsg('');
    setModalOpen(true);
  };

  const openHistoryModal = async (empId) => {
    setLoadingHistory(true);
    setHistoryModalOpen(true);
    try {
      const res = await api.get(`/accounts/history/${empId}/`);
      setHistoryData(res.data);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const openDetailModal = async (empOrId) => {
    if (!empOrId) return;
    let empObj = null;
    const targetId = typeof empOrId === 'object' ? (empOrId.id || empOrId.coordinator_id) : empOrId;

    empObj = employees.find(e => e.id === targetId);
    if (!empObj && typeof empOrId === 'object') {
      empObj = empOrId;
    }

    setSelectedEmp(empObj || null);
    setDetailModalOpen(true);

    if (targetId) {
      setLoadingDetail(true);
      try {
        const res = await api.get(`/accounts/employees/${targetId}/`);
        if (res.data) {
          setSelectedEmp(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch latest employee details:', err);
      } finally {
        setLoadingDetail(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');

    try {
      const payload = { ...formData };
      if (payload.role === 'COORDINATOR' || payload.role === 'ADMIN' || !payload.assigned_coordinator) {
        payload.assigned_coordinator = null;
      }
      if (!payload.password) {
        delete payload.password;
      }

      if (editEmp) {
        await api.patch(`/accounts/employees/${editEmp.id}/`, payload);
        setSuccessMsg(`Staff details for ${formData.first_name || formData.username} updated successfully.`);
      } else {
        const res = await api.post('/accounts/employees/', payload);
        const createdCode = res.data?.employee_id || '';
        setSuccessMsg(
          payload.role === 'COORDINATOR'
            ? `Project Coordinator created successfully! Assigned ID: ${createdCode}`
            : `Sales Executive created successfully! Assigned ID: ${createdCode}`
        );
      }
      setModalOpen(false);
      fetchEmployees();
      fetchCoordinators();
      if (activeTab === 'coordinators') fetchCoordinatorWorkload();
    } catch (err) {
      setErrorMsg(JSON.stringify(err.response?.data || 'Failed to save employee.'));
    } finally {
      setSaving(false);
    }
  };

  const handleReassignSubmit = async (e) => {
    e.preventDefault();
    if (selectedExecIds.length === 0) {
      setErrorMsg('Select at least one sales executive.');
      return;
    }

    setReassigning(true);
    try {
      await api.post('/accounts/reassign-coordinator/', {
        employee_ids: selectedExecIds,
        coordinator_id: targetCoordinatorId || null
      });
      setReassignModalOpen(false);
      setSelectedExecIds([]);
      setTargetCoordinatorId('');
      fetchEmployees();
      fetchCoordinatorWorkload();
      setSuccessMsg('Coordinator reassignments updated successfully.');
    } catch (err) {
      setErrorMsg('Failed to reassign coordinator.');
    } finally {
      setReassigning(false);
    }
  };

  const formatCurrency = (amt) => {
    return `₹${Number(amt || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            <span>Employee Management & Coordinator Hierarchy Hub</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Full staff directory, role assignments, coordinator workload management, and individual field records.
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedExecIds([]);
                setTargetCoordinatorId('');
                setErrorMsg('');
                setReassignModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-lg bg-[#111e3f] hover:bg-[#1a2c5b] text-amber-300 border border-amber-500/30 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
            >
              <UserCheck className="w-4 h-4 text-amber-400" />
              <span>Reassign Coordinators</span>
            </button>
            <button
              onClick={() => openAddModal('COORDINATOR')}
              className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white font-bold text-xs border border-blue-400/30 shadow-md shadow-blue-500/20 transition flex items-center gap-1.5 cursor-pointer"
              title="Register a new Project Coordinator with CRD-XXXX credentials"
            >
              <Building className="w-4 h-4 text-amber-300" />
              <span>+ Add Coordinator</span>
            </button>
            <button
              onClick={() => openAddModal('SALES_EXECUTIVE')}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition flex items-center gap-1.5 cursor-pointer"
              title="Register a new Sales Executive with EMP-XXXX credentials"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Add Executive</span>
            </button>
          </div>
        )}
      </div>

      {/* Coordinator Scoped Fleet Banner */}
      {isCoordinator && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#0b1329] via-[#111e3f] to-[#0b1329] border border-amber-500/40 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-semibold mb-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Project Coordinator View</span>
            </div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>My Assigned Field Sales Executives</span>
              <span className="text-xs px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-500/30 font-mono">
                Coordinator: {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username} ({user?.employee_id})
              </span>
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Employees assigned to you by Administration appear below automatically with their system ID, mobile number, shift status, and collection history.
            </p>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-[#070c18] border border-[#1a2c5b] text-right shrink-0">
            <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Assigned Staff</span>
            <span className="text-xl font-bold text-amber-400 font-mono">
              {employees.filter(e => e.role === 'SALES_EXECUTIVE' && (e.assigned_coordinator === user?.id || e.assigned_coordinator_name)).length} Executives
            </span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-[#1a2c5b] pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('directory')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
            activeTab === 'directory'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-slate-400 hover:text-white hover:bg-[#111e3f]'
          }`}
        >
          <Users className="w-4 h-4 text-amber-400" />
          <span>Staff Directory ({employees.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('coordinators')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
            activeTab === 'coordinators'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-slate-400 hover:text-white hover:bg-[#111e3f]'
          }`}
        >
          <Building className="w-4 h-4 text-amber-400" />
          <span>Coordinator Teams & Workload</span>
        </button>

        {isAdmin && (
          <button
            onClick={() => {
              setActiveTab('create_coordinator');
              setEditEmp(null);
              setFormData({
                username: '',
                first_name: '',
                last_name: '',
                email: '',
                phone: '',
                emergency_contact: '',
                pan_or_aadhaar: '',
                address: '',
                city: 'Chennai',
                branch: 'T. Nagar Main Branch',
                joining_date: new Date().toISOString().split('T')[0],
                role: 'COORDINATOR',
                assigned_coordinator: '',
                status: 'ACTIVE',
                password: ''
              });
              setErrorMsg('');
            }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'create_coordinator'
                ? 'bg-gradient-to-r from-blue-700 to-indigo-700 text-white font-bold border border-blue-400/50 shadow-md shadow-blue-500/20'
                : 'text-slate-400 hover:text-white hover:bg-[#111e3f]'
            }`}
          >
            <Shield className="w-4 h-4 text-amber-300" />
            <span>+ Coordinator Create Page</span>
          </button>
        )}
      </div>

      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-between text-xs text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400 font-bold">✕</button>
        </div>
      )}

      {/* TAB 1: Staff Directory */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="p-4 rounded-xl bg-[#0b1329] border border-[#1a2c5b] grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, employee ID, mobile..."
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#070c18] border border-[#1a2c5b] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
              />
            </div>

            <div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#070c18] border border-[#1a2c5b] text-white text-xs focus:outline-none focus:border-amber-400 transition"
              >
                <option value="">All Roles</option>
                <option value="ADMIN">Administrator</option>
                <option value="COORDINATOR">Project Coordinator</option>
                <option value="SALES_EXECUTIVE">Sales Executive</option>
              </select>
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#070c18] border border-[#1a2c5b] text-white text-xs focus:outline-none focus:border-amber-400 transition"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="ON_LEAVE">On Leave</option>
              </select>
            </div>
          </div>

          {/* Directory Table */}
          <div className="p-5 rounded-xl bg-[#0b1329] border border-[#1a2c5b] shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#1a2c5b] text-slate-400 text-[11px] uppercase bg-[#0c1530]">
                    <th className="py-3 px-3">Employee</th>
                    <th className="py-3 px-3">Role</th>
                    <th className="py-3 px-3">Contact Details</th>
                    <th className="py-3 px-3">Reporting Coordinator</th>
                    <th className="py-3 px-3">Shift Status</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a2c5b]/60">
                  {employees.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-slate-400">
                        No employees found matching filter criteria.
                      </td>
                    </tr>
                  ) : (
                    employees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-[#111e3f]/50 transition">
                        <td className="py-3 px-3">
                          <div className="flex items-center space-x-2.5">
                            <button
                              type="button"
                              onClick={() => openDetailModal(emp)}
                              className="w-8 h-8 rounded-full bg-[#16254e] hover:bg-red-950/70 border border-amber-500/30 hover:border-red-500 flex items-center justify-center text-amber-300 hover:text-red-300 font-bold text-xs shrink-0 transition cursor-pointer"
                              title="Click to view full employee particulars"
                            >
                              {emp.first_name ? emp.first_name[0] : emp.username[0].toUpperCase()}
                            </button>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openDetailModal(emp)}
                                  className="text-left font-bold text-slate-100 hover:text-red-400 transition cursor-pointer group flex items-center gap-1.5"
                                  title="Click to view full employee particulars"
                                >
                                  <span className="group-hover:underline underline-offset-2">
                                    {emp.first_name ? `${emp.first_name} ${emp.last_name || ''}` : emp.username}
                                  </span>
                                  <Eye className="w-3 h-3 text-slate-400 group-hover:text-red-400 opacity-0 group-hover:opacity-100 transition shrink-0" />
                                </button>
                                {emp.id === user?.id && (
                                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-bold">
                                    You
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-amber-400 font-mono font-bold">{emp.employee_id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#1a2c5b] text-amber-300 border border-amber-400/20">
                            {emp.role_display}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <p className="text-slate-300 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                            <span>{emp.phone || '—'}</span>
                          </p>
                          {emp.email && (
                            <p className="text-slate-500 text-[10px] flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3 shrink-0" />
                              <span className="truncate max-w-[150px]">{emp.email}</span>
                            </p>
                          )}
                          {emp.address && (
                            <p className="text-slate-400 text-[10px] flex items-center gap-1 mt-0.5 truncate max-w-[180px]">
                              <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                              <span>{emp.address}</span>
                            </p>
                          )}
                          {(emp.city || emp.branch) && (
                            <p className="text-blue-300 text-[10px] flex items-center gap-1 mt-0.5 font-medium truncate max-w-[180px]">
                              <Building className="w-2.5 h-2.5 text-blue-400 shrink-0" />
                              <span>{emp.branch || emp.city} {emp.city && emp.branch ? `(${emp.city})` : ''}</span>
                            </p>
                          )}
                          {emp.joining_date && (
                            <p className="text-slate-500 text-[9px] flex items-center gap-1 mt-0.5">
                              <Calendar className="w-2.5 h-2.5 shrink-0" />
                              <span>Joined: {emp.joining_date}</span>
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {emp.assigned_coordinator_name ? (
                            <div>
                              <button
                                type="button"
                                onClick={() => emp.assigned_coordinator && openDetailModal(emp.assigned_coordinator)}
                                className={`text-slate-200 font-medium flex items-center gap-1 text-left transition ${emp.assigned_coordinator ? 'hover:text-red-400 cursor-pointer group' : ''}`}
                                title={emp.assigned_coordinator ? "Click to view coordinator details" : ""}
                              >
                                <UserCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span className={emp.assigned_coordinator ? "group-hover:underline" : ""}>
                                  {emp.assigned_coordinator_name}
                                </span>
                              </button>
                              {emp.assigned_coordinator_code && (
                                <p className="text-[10px] text-amber-400 font-mono mt-0.5">
                                  ID: {emp.assigned_coordinator_code}
                                </p>
                              )}
                              {isCoordinator && emp.assigned_coordinator === user?.id && (
                                <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 text-[9px] font-semibold">
                                  Assigned to Your Fleet
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/40 text-amber-400/80 border border-amber-500/20 text-[10px]">
                              <AlertCircle className="w-2.5 h-2.5" />
                              <span>Unassigned</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${emp.is_working ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${emp.is_working ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                            {emp.is_working ? 'On Field Duty' : 'Off Duty'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            emp.status === 'ACTIVE' ? 'text-emerald-400 bg-emerald-950/60' : (emp.status === 'ON_LEAVE' ? 'text-amber-400 bg-amber-950/60' : 'text-rose-400 bg-rose-950/60')
                          }`}>
                            {emp.status_display}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openDetailModal(emp)}
                              className="px-2.5 py-1 rounded bg-[#111e3f] hover:bg-red-950/60 text-slate-200 hover:text-red-300 border border-slate-700/50 hover:border-red-500/40 transition flex items-center gap-1 text-[11px] cursor-pointer"
                              title="View Full Employee Particulars"
                            >
                              <Eye className="w-3.5 h-3.5 text-red-400" />
                              <span>Details</span>
                            </button>
                            <button
                              onClick={() => openHistoryModal(emp.id)}
                              className="px-2.5 py-1 rounded bg-[#111e3f] hover:bg-[#1a2c5b] text-slate-200 hover:text-white transition flex items-center gap-1 text-[11px] cursor-pointer"
                              title="View Employee Lifetime History"
                            >
                              <History className="w-3.5 h-3.5 text-amber-400" />
                              <span>History</span>
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => openEditModal(emp)}
                                className="p-1.5 rounded bg-[#111e3f] hover:bg-[#1a2c5b] text-amber-300 hover:text-amber-200 transition cursor-pointer"
                                title="Edit Employee Particulars"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
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
        </div>
      )}

      {/* TAB 2: Coordinator Teams & Workload */}
      {activeTab === 'coordinators' && (
        <div className="space-y-6">
          {/* Admin Coordinator Operations Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-[#0b1329] via-[#101c3d] to-[#0b1329] border border-[#1a2c5b] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Building className="w-4 h-4 text-amber-400" />
                <span>Regional Project Coordinators & Fleet Management</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Coordinators supervise field executive operations, verify collections, and manage regional recovery targets.
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={() => openAddModal('COORDINATOR')}
                className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white font-bold text-xs border border-blue-400/30 shadow-md shadow-blue-500/20 transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                title="Register a new Project Coordinator with CRD-XXXX credentials"
              >
                <Building className="w-4 h-4 text-amber-300" />
                <span>+ Create New Coordinator</span>
              </button>
            )}
          </div>

          {loadingWorkload ? (
            <div className="py-12 flex justify-center text-xs text-slate-400">Loading Coordinator Workload...</div>
          ) : (
            <>
              {/* Coordinator Cards Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {workloadData?.coordinators?.map((crd) => (
                  <div
                    key={crd.coordinator_id}
                    className="p-5 rounded-2xl bg-[#0b1329] border border-[#1a2c5b] shadow-xl space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <button
                          type="button"
                          onClick={() => openDetailModal(crd.coordinator_id)}
                          className="w-12 h-12 rounded-xl bg-amber-500/20 hover:bg-red-950/60 border border-amber-500/40 hover:border-red-500 flex items-center justify-center font-bold text-amber-300 hover:text-red-400 text-lg transition cursor-pointer shrink-0"
                          title="Click to view coordinator details"
                        >
                          <Building className="w-6 h-6 text-amber-400" />
                        </button>
                        <div>
                          <button
                            type="button"
                            onClick={() => openDetailModal(crd.coordinator_id)}
                            className="text-left text-base font-bold text-white hover:text-red-400 transition cursor-pointer group flex items-center gap-1.5"
                            title="Click to view coordinator details"
                          >
                            <span className="group-hover:underline">{crd.name}</span>
                            <Eye className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-400 opacity-0 group-hover:opacity-100 transition shrink-0" />
                          </button>
                          <p className="text-[11px] text-amber-400 font-mono">{crd.employee_id} • Project Coordinator</p>
                          {(crd.city || crd.branch) && (
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              {crd.city && (
                                <span className="px-2 py-0.5 rounded-full bg-blue-950/80 border border-blue-500/30 text-blue-300 text-[10px] font-semibold flex items-center gap-1">
                                  <MapPin className="w-2.5 h-2.5 text-blue-400" />
                                  <span>{crd.city}</span>
                                </span>
                              )}
                              {crd.branch && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/30 text-amber-300 text-[10px] font-semibold flex items-center gap-1">
                                  <Building className="w-2.5 h-2.5 text-amber-400" />
                                  <span>{crd.branch}</span>
                                </span>
                              )}
                            </div>
                          )}
                          <p className="text-[11px] text-slate-400 mt-1">{crd.phone || 'No phone'} • {crd.email || 'No email'}</p>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-full bg-[#111e3f] border border-[#1a2c5b] text-amber-300 text-xs font-bold">
                        {crd.total_assigned} Assigned Staff
                      </span>
                    </div>

                    {/* Team Metrics Summary */}
                    <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-[#070c18] border border-[#1a2c5b] text-center text-xs">
                      <div>
                        <span className="text-slate-400 text-[10px] block">Active Working</span>
                        <span className="font-bold text-emerald-400 text-sm">{crd.active_working} / {crd.total_assigned}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Team Gold (Month)</span>
                        <span className="font-bold text-amber-300 text-sm">{crd.month_gold_grams}g</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Team Cash (Month)</span>
                        <span className="font-bold text-emerald-300 text-sm">{formatCurrency(crd.month_cash_amount)}</span>
                      </div>
                    </div>

                    {/* Assigned Sales Executives List */}
                    <div>
                      <p className="text-xs font-semibold text-slate-300 mb-2">Assigned Field Executives Roster:</p>
                      {crd.executives.length === 0 ? (
                        <p className="text-xs text-slate-500 italic p-3 bg-[#070c18] rounded-lg border border-[#1a2c5b]">
                          No sales executives currently assigned.
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {crd.executives.map((e) => (
                            <div
                              key={e.id}
                              className="p-2.5 rounded-lg bg-[#070c18] border border-[#1a2c5b] text-xs hover:border-amber-500/30 transition"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => openDetailModal(e.id)}
                                    className="text-left font-semibold text-white hover:text-red-400 transition cursor-pointer group flex items-center gap-1"
                                    title="Click to view executive details"
                                  >
                                    <span className="group-hover:underline">{e.name}</span>
                                    <Eye className="w-3 h-3 text-slate-400 group-hover:text-red-400 opacity-0 group-hover:opacity-100 transition shrink-0" />
                                  </button>
                                  <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-bold">
                                    {e.employee_id}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className={`w-2 h-2 rounded-full ${e.is_working ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                                  <span className={`text-[10px] font-semibold ${e.is_working ? 'text-emerald-400' : 'text-slate-500'}`}>
                                    {e.is_working ? 'On Field Duty' : 'Off Duty'}
                                  </span>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-1 mt-2 text-[10px] text-slate-400 pt-2 border-t border-[#1a2c5b]/40">
                                <p className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                                  <span>{e.phone || '—'}</span>
                                </p>
                                {e.email && (
                                  <p className="flex items-center gap-1 truncate">
                                    <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                                    <span className="truncate">{e.email}</span>
                                  </p>
                                )}
                                {e.address && (
                                  <p className="flex items-center gap-1 truncate sm:col-span-2">
                                    <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                                    <span className="truncate">{e.address}</span>
                                  </p>
                                )}
                                {e.joining_date && (
                                  <p className="flex items-center gap-1 text-slate-500">
                                    <Calendar className="w-3 h-3 text-slate-500 shrink-0" />
                                    <span>Joined: {e.joining_date}</span>
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Unassigned Executives Queue */}
              {workloadData?.unassigned_executives?.length > 0 && (
                <div className="p-5 rounded-2xl bg-amber-950/20 border border-amber-500/40 shadow-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-400" />
                        <span>Unassigned Sales Executives ({workloadData.unassigned_count})</span>
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        These sales executives are currently operating without a reporting project coordinator.
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedExecIds(workloadData.unassigned_executives.map(e => e.id));
                        setReassignModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition"
                    >
                      Assign All Now
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {workloadData.unassigned_executives.map((e) => (
                      <div
                        key={e.id}
                        className="p-3 rounded-xl bg-[#0b1329] border border-[#1a2c5b] flex items-center justify-between text-xs"
                      >
                        <div>
                          <button
                            type="button"
                            onClick={() => openDetailModal(e.id)}
                            className="text-left font-semibold text-white hover:text-red-400 transition cursor-pointer group flex items-center gap-1"
                            title="Click to view executive details"
                          >
                            <span className="group-hover:underline">{e.name}</span>
                            <Eye className="w-3 h-3 text-slate-400 group-hover:text-red-400 opacity-0 group-hover:opacity-100 transition shrink-0" />
                          </button>
                          <p className="text-[10px] text-amber-400 font-mono">{e.employee_id}</p>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedExecIds([e.id]);
                            setReassignModalOpen(true);
                          }}
                          className="px-2 py-1 rounded bg-[#111e3f] hover:bg-[#1a2c5b] text-amber-300 text-[11px] font-semibold"
                        >
                          Assign →
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB 3: Dedicated Coordinator Create Page */}
      {activeTab === 'create_coordinator' && isAdmin && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0b1329] via-[#101c3d] to-[#0b1329] border border-blue-500/40 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-semibold mb-2">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>Regional Leadership Provisioning</span>
              </div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Building className="w-5 h-5 text-amber-400" />
                <span>Project Coordinator Regional Onboarding</span>
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                Onboard a regional project coordinator. Choose the operational city and branch office to establish supervisory hierarchy, manage field teams, and conduct Stage-1 collateral verification.
              </p>
            </div>

            <button
              onClick={() => setActiveTab('coordinators')}
              className="px-4 py-2 rounded-lg bg-[#111e3f] hover:bg-[#1a2c5b] text-slate-200 hover:text-white border border-[#1a2c5b] text-xs font-semibold transition flex items-center gap-2 cursor-pointer"
            >
              <span>View Coordinator Fleets ({coordinators.length})</span>
              <ArrowRight className="w-4 h-4 text-amber-400" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Live Coordinator ID & Jurisdiction Preview Card */}
            <div className="p-6 rounded-2xl bg-[#0b1329] border border-[#1a2c5b] shadow-xl flex flex-col justify-between space-y-6">
              <div>
                <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Coordinator Credentials Preview</span>
                </h4>

                <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0c1530] via-[#111e3f] to-[#070c18] border border-amber-500/40 shadow-lg relative overflow-hidden space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-bold text-amber-300 text-lg">
                      {formData.first_name ? formData.first_name[0].toUpperCase() : 'C'}
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-blue-900/60 text-blue-300 border border-blue-400/40 text-[10px] font-mono font-bold">
                      CRD-XXXX
                    </span>
                  </div>

                  <div>
                    <h5 className="text-base font-bold text-white">
                      {formData.first_name ? `${formData.first_name} ${formData.last_name || ''}` : 'Coordinator Name'}
                    </h5>
                    <p className="text-xs text-amber-400 font-mono mt-0.5">
                      @{formData.username || 'username'} • Project Coordinator
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#1a2c5b]/60 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span>City:</span>
                      </span>
                      <span className="font-semibold text-white">
                        {formData.city || 'Not Selected'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Building className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Branch:</span>
                      </span>
                      <span className="font-semibold text-amber-300 truncate max-w-[170px]" title={formData.branch}>
                        {formData.branch || 'Not Selected'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Phone:</span>
                      </span>
                      <span className="font-mono text-slate-200">
                        {formData.phone || '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#070c18] border border-[#1a2c5b] text-xs text-slate-400 space-y-2">
                <p className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Coordinator Privileges</span>
                </p>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-400">
                  <li>Manages field executive team within assigned city/branch</li>
                  <li>Conducts Stage-1 physical verification of gold & cash</li>
                  <li>Live tracking & telemetry for subordinate executive fleet</li>
                </ul>
              </div>
            </div>

            {/* Coordinator Creation Form */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-[#0b1329] border border-[#1a2c5b] shadow-xl">
              <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Building className="w-4 h-4 text-amber-400" />
                <span>Coordinator Particulars & Regional Deployment</span>
              </h4>

              {errorMsg && (
                <div className="mb-4 p-3 rounded-lg bg-rose-950 border border-rose-500/50 text-xs text-rose-200">
                  {errorMsg}
                </div>
              )}


              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                {/* Personal Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">First Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      placeholder="e.g. Ramesh"
                      className="w-full px-3 py-2 rounded-lg bg-[#070c18] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">Last Name</label>
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      placeholder="e.g. Sundaram"
                      className="w-full px-3 py-2 rounded-lg bg-[#070c18] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                {/* Login Credentials */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">Username *</label>
                    <input
                      type="text"
                      required
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="e.g. ramesh_coord"
                      className="w-full px-3 py-2 rounded-lg bg-[#070c18] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">Initial Password (default Gold@123)</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 rounded-lg bg-[#070c18] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                {/* Contact Information */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">Mobile Phone *</label>
                    <input
                      type="text"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 98401 23456"
                      className="w-full px-3 py-2 rounded-lg bg-[#070c18] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">Email Address</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="coordinator@goldfinance.com"
                      className="w-full px-3 py-2 rounded-lg bg-[#070c18] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">Emergency Contact</label>
                    <input
                      type="text"
                      value={formData.emergency_contact}
                      onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                      placeholder="+91 94440 99999"
                      className="w-full px-3 py-2 rounded-lg bg-[#070c18] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                {/* SCROLL DOWN BUTTON 1 (CITIES) & SCROLL DOWN BUTTON 2 (BRANCHES) */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-[#070c18] via-[#0d1633] to-[#070c18] border border-blue-500/30 space-y-3">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-amber-400" />
                    <span className="text-white font-bold text-xs uppercase tracking-wider">
                      Regional Jurisdiction & Branch Allocation
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* SCROLL DOWN BUTTON 1: ALL THE CITIES */}
                    <div>
                      <label className="block text-amber-300 font-semibold mb-1 flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-amber-400" />
                        <span>Operational City (All Cities) *</span>
                      </label>
                      <select
                        required
                        value={formData.city}
                        onChange={(e) => handleCityChange(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg bg-[#070c18] border border-amber-500/40 text-white font-medium text-xs focus:outline-none focus:border-amber-300 cursor-pointer shadow-inner"
                      >
                        <option value="">-- Select Operational City (All Cities) --</option>
                        {citiesBranches.map((c) => (
                          <option key={c.city} value={c.city}>
                            {c.city} ({c.state})
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Select from all configured operational cities.
                      </p>
                    </div>

                    {/* SCROLL DOWN BUTTON 2: WHAT ARE BRANCHES */}
                    <div>
                      <label className="block text-amber-300 font-semibold mb-1 flex items-center gap-1.5">
                        <Building className="w-4 h-4 text-amber-400" />
                        <span>Assigned Branch (What are Branches) *</span>
                      </label>
                      <select
                        required
                        value={formData.branch}
                        onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-lg bg-[#070c18] border border-amber-500/40 text-white font-medium text-xs focus:outline-none focus:border-amber-300 cursor-pointer shadow-inner"
                      >
                        <option value="">-- Select Branch (What are Branches) --</option>
                        {availableBranches.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {formData.city ? `Branches active in ${formData.city}` : 'Branches available for selection'}
                      </p>
                    </div>
                  </div>

                  {formData.city && formData.branch && (
                    <div className="p-2.5 rounded-lg bg-blue-950/60 border border-blue-400/30 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span className="text-slate-200">
                          Active Assignment: <strong className="text-amber-300">{formData.city}</strong> → <strong className="text-white">{formData.branch}</strong>
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold">
                        CRD Hierarchy Ready
                      </span>
                    </div>
                  )}
                </div>

                {/* Government ID, Joining Date, Address */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">Government ID (PAN / Aadhaar)</label>
                    <input
                      type="text"
                      value={formData.pan_or_aadhaar}
                      onChange={(e) => setFormData({ ...formData, pan_or_aadhaar: e.target.value })}
                      placeholder="e.g. ABCDE1234F"
                      className="w-full px-3 py-2 rounded-lg bg-[#070c18] border border-[#1a2c5b] text-white font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">Joining Date</label>
                    <input
                      type="date"
                      value={formData.joining_date}
                      onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-[#070c18] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Office / Residential Address</label>
                  <textarea
                    rows="2"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Branch premises or residential street address..."
                    className="w-full px-3 py-2 rounded-lg bg-[#070c18] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Submit Actions */}
                <div className="pt-4 border-t border-[#1a2c5b] flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('coordinators')}
                    className="px-4 py-2.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Building className="w-4 h-4 text-slate-950" />
                    <span>{saving ? 'Registering Coordinator...' : 'Create Project Coordinator'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reassign Coordinators */}
      {reassignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0b1329] border border-[#1a2c5b] rounded-2xl p-6 shadow-2xl relative">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-amber-400" />
              <span>Assign / Reassign Project Coordinator</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Select field executive(s) and assign their reporting coordinator.
            </p>

            {errorMsg && (
              <div className="mb-3 p-2 rounded bg-rose-950 border border-rose-500 text-xs text-rose-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleReassignSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Select Sales Executive(s) *</label>
                <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 rounded-lg bg-[#070c18] border border-[#1a2c5b]">
                  {employees
                    .filter(e => e.role === 'SALES_EXECUTIVE')
                    .map((emp) => {
                      const isChecked = selectedExecIds.includes(emp.id);
                      return (
                        <label
                          key={emp.id}
                          className="flex items-center space-x-2.5 p-1.5 rounded hover:bg-[#111e3f] cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedExecIds([...selectedExecIds, emp.id]);
                              } else {
                                setSelectedExecIds(selectedExecIds.filter(id => id !== emp.id));
                              }
                            }}
                            className="rounded border-[#1a2c5b] text-amber-500 focus:ring-amber-400"
                          />
                          <div className="flex-1">
                            <span className="font-semibold text-white">{emp.first_name ? `${emp.first_name} ${emp.last_name || ''}` : emp.username}</span>
                            <span className="text-[10px] text-amber-400 font-mono ml-2">({emp.employee_id})</span>
                            <span className="text-[10px] text-slate-500 block">
                              Currently: {emp.assigned_coordinator_name || 'Unassigned'}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Selected: {selectedExecIds.length} executive(s)</p>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Target Project Coordinator *</label>
                <select
                  required
                  value={targetCoordinatorId}
                  onChange={(e) => setTargetCoordinatorId(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[#070c18] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="">Select Coordinator</option>
                  {coordinators.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.first_name ? `${c.first_name} ${c.last_name || ''}` : c.username} ({c.employee_id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-[#1a2c5b] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReassignModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reassigning || selectedExecIds.length === 0}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold transition shadow-md shadow-amber-500/20 disabled:opacity-50"
                >
                  {reassigning ? 'Reassigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Employee Lifetime History Viewer */}
      {historyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-[#0b1329] border border-[#1a2c5b] rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            {loadingHistory ? (
              <div className="py-12 flex justify-center text-xs text-slate-400">Loading Full Staff History...</div>
            ) : historyData ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#1a2c5b]">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <History className="w-4 h-4 text-amber-400" />
                      <span>Individual Employee Lifetime History & Performance</span>
                    </h3>
                    <p className="text-xs text-amber-400 font-mono">
                      {historyData.employee?.first_name} {historyData.employee?.last_name} ({historyData.employee?.employee_id})
                    </p>
                  </div>
                  <button
                    onClick={() => setHistoryModalOpen(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                {/* Metrics Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-3 rounded-xl bg-[#070c18] border border-[#1a2c5b]">
                    <span className="text-[10px] text-slate-400 block">Gold Approved</span>
                    <span className="font-bold text-amber-300 text-sm">{historyData.metrics?.total_gold_grams}g</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#070c18] border border-[#1a2c5b]">
                    <span className="text-[10px] text-slate-400 block">Cash Approved</span>
                    <span className="font-bold text-emerald-300 text-sm">{formatCurrency(historyData.metrics?.total_cash_amount)}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#070c18] border border-[#1a2c5b]">
                    <span className="text-[10px] text-slate-400 block">Completed Visits</span>
                    <span className="font-bold text-white text-sm">{historyData.metrics?.completed_visits} / {historyData.metrics?.total_visits}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#070c18] border border-[#1a2c5b]">
                    <span className="text-[10px] text-slate-400 block">Work Shifts Logged</span>
                    <span className="font-bold text-white text-sm">{historyData.metrics?.total_shifts} Shifts</span>
                  </div>
                </div>

                {/* Recent Gold Records */}
                <div className="p-3.5 rounded-xl bg-[#070c18] border border-[#1a2c5b] text-xs">
                  <h4 className="font-bold text-white mb-2 flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-amber-400" />
                    <span>Recent Gold Collateral Records ({historyData.recent_gold?.length})</span>
                  </h4>
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {historyData.recent_gold?.length === 0 ? (
                      <p className="text-slate-500 italic">No gold collections recorded.</p>
                    ) : (
                      historyData.recent_gold?.map((g) => (
                        <div key={g.receipt_number} className="flex justify-between py-1 border-b border-[#1a2c5b]/40">
                          <span className="font-mono text-amber-400">{g.receipt_number} - {g.customer_name}</span>
                          <span className="font-bold text-white">{g.weight}g ({g.purity}) • {g.status}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Recent Cash Records */}
                <div className="p-3.5 rounded-xl bg-[#070c18] border border-[#1a2c5b] text-xs">
                  <h4 className="font-bold text-white mb-2 flex items-center gap-1.5">
                    <Banknote className="w-4 h-4 text-emerald-400" />
                    <span>Recent Cash Collection Records ({historyData.recent_cash?.length})</span>
                  </h4>
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {historyData.recent_cash?.length === 0 ? (
                      <p className="text-slate-500 italic">No cash collections recorded.</p>
                    ) : (
                      historyData.recent_cash?.map((c) => (
                        <div key={c.receipt_number} className="flex justify-between py-1 border-b border-[#1a2c5b]/40">
                          <span className="font-mono text-emerald-400">{c.receipt_number} - {c.customer_name}</span>
                          <span className="font-bold text-white">{formatCurrency(c.amount)} • {c.deposit_status}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#1a2c5b] flex justify-end">
                  <button
                    onClick={() => setHistoryModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Modal: Employee Complete Details Profile */}
      {detailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-[#0b1329] border border-red-500/30 rounded-2xl shadow-2xl relative max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-red-950/90 via-[#101c3d] to-red-950/90 border-b border-red-500/30 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 to-amber-600 text-white font-black text-xl flex items-center justify-center border-2 border-red-400/40 shadow-lg shadow-red-500/20 shrink-0">
                  {selectedEmp?.first_name
                    ? selectedEmp.first_name[0].toUpperCase()
                    : selectedEmp?.name
                    ? selectedEmp.name[0].toUpperCase()
                    : selectedEmp?.username
                    ? selectedEmp.username[0].toUpperCase()
                    : 'U'}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold text-white">
                      {selectedEmp?.first_name
                        ? `${selectedEmp.first_name} ${selectedEmp.last_name || ''}`
                        : selectedEmp?.name || selectedEmp?.username || 'Staff Profile'}
                    </h3>
                    {selectedEmp?.employee_id && (
                      <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 text-[11px] font-mono font-bold">
                        {selectedEmp.employee_id}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-[#16254e] text-amber-300 border border-amber-500/30 text-[10px] font-semibold">
                      {selectedEmp?.role_display || selectedEmp?.role || 'Staff Member'}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                        selectedEmp?.is_working
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          selectedEmp?.is_working ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                        }`}
                      />
                      {selectedEmp?.is_working ? 'On Field Duty' : 'Off Duty'}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                        selectedEmp?.status === 'ACTIVE'
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-950/60 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {selectedEmp?.status_display || selectedEmp?.status || 'Active'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                title="Close Profile"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)] text-xs">
              {loadingDetail && (
                <div className="p-2 rounded-lg bg-blue-950/40 border border-blue-500/30 text-blue-300 text-center text-[11px] flex items-center justify-center gap-2">
                  <div className="w-3 h-3 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                  <span>Syncing latest field telemetry & status...</span>
                </div>
              )}

              {/* Quick Communication & Location Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {selectedEmp?.phone ? (
                  <a
                    href={`tel:${selectedEmp.phone}`}
                    className="p-2.5 rounded-xl bg-[#070c18] border border-[#1a2c5b] hover:border-red-500/50 hover:bg-red-950/20 text-slate-200 transition flex items-center gap-2 group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <span className="text-[10px] text-slate-400 block">Mobile Phone</span>
                      <span className="font-semibold text-emerald-300 group-hover:underline truncate">
                        {selectedEmp.phone}
                      </span>
                    </div>
                  </a>
                ) : (
                  <div className="p-2.5 rounded-xl bg-[#070c18] border border-[#1a2c5b] text-slate-500 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span>No Phone Provided</span>
                  </div>
                )}

                {selectedEmp?.email ? (
                  <a
                    href={`mailto:${selectedEmp.email}`}
                    className="p-2.5 rounded-xl bg-[#070c18] border border-[#1a2c5b] hover:border-red-500/50 hover:bg-red-950/20 text-slate-200 transition flex items-center gap-2 group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <span className="text-[10px] text-slate-400 block">Email Address</span>
                      <span className="font-semibold text-blue-300 group-hover:underline truncate">
                        {selectedEmp.email}
                      </span>
                    </div>
                  </a>
                ) : (
                  <div className="p-2.5 rounded-xl bg-[#070c18] border border-[#1a2c5b] text-slate-500 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span>No Email Registered</span>
                  </div>
                )}

                <div className="p-2.5 rounded-xl bg-[#070c18] border border-[#1a2c5b] flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate">
                    <span className="text-[10px] text-slate-400 block">City & Branch</span>
                    <span className="font-semibold text-amber-300 truncate">
                      {selectedEmp?.branch || selectedEmp?.city || 'Unassigned'}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 1: Organizational & Hierarchy */}
              <div className="p-4 rounded-xl bg-[#070c18] border border-[#1a2c5b] space-y-3">
                <h4 className="font-bold text-white flex items-center gap-2 text-xs uppercase tracking-wider text-red-400">
                  <Building className="w-4 h-4 text-red-500" />
                  <span>Organizational Hierarchy & Deployment</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Operational City</span>
                    <span className="font-semibold text-white">{selectedEmp?.city || 'Not Specified'}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[11px] block">Assigned Branch Office</span>
                    <span className="font-semibold text-amber-300">{selectedEmp?.branch || 'Not Specified'}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[11px] block">Reporting Project Coordinator</span>
                    {selectedEmp?.assigned_coordinator_name ? (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                        <span className="font-semibold text-white">{selectedEmp.assigned_coordinator_name}</span>
                        {selectedEmp.assigned_coordinator_code && (
                          <span className="text-[10px] font-mono text-amber-400">
                            ({selectedEmp.assigned_coordinator_code})
                          </span>
                        )}
                      </div>
                    ) : selectedEmp?.role === 'COORDINATOR' ? (
                      <span className="text-blue-300 font-medium">Regional Coordinator (Direct Admin Oversight)</span>
                    ) : selectedEmp?.role === 'ADMIN' ? (
                      <span className="text-amber-300 font-medium">Headquarters Administration</span>
                    ) : (
                      <span className="text-amber-400 italic">Unassigned (Direct Head Office)</span>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-400 text-[11px] block">System Role</span>
                    <span className="font-semibold text-white">
                      {selectedEmp?.role_display || selectedEmp?.role || 'Staff Member'}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Identity & Statutory Credentials */}
              <div className="p-4 rounded-xl bg-[#070c18] border border-[#1a2c5b] space-y-3">
                <h4 className="font-bold text-white flex items-center gap-2 text-xs uppercase tracking-wider text-amber-400">
                  <IdCard className="w-4 h-4 text-amber-500" />
                  <span>Identity & Statutory Particulars</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px] block">System Login Username</span>
                    <span className="font-mono font-semibold text-slate-200">@{selectedEmp?.username || '—'}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[11px] block">Government ID (PAN / Aadhaar)</span>
                    <span className="font-mono font-semibold text-white">
                      {selectedEmp?.pan_or_aadhaar || 'Not Recorded'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[11px] block">Joining Date</span>
                    <span className="font-semibold text-white">{selectedEmp?.joining_date || 'Not Recorded'}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[11px] block">Emergency Contact</span>
                    <span className="font-semibold text-slate-300">
                      {selectedEmp?.emergency_contact || 'None Listed'}
                    </span>
                  </div>

                  <div className="sm:col-span-2">
                    <span className="text-slate-400 text-[11px] block">Residential Address</span>
                    <span className="font-semibold text-slate-300">
                      {selectedEmp?.address || 'No residential address recorded.'}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Live Field Telemetry & GPS Tracking */}
              <div className="p-4 rounded-xl bg-[#070c18] border border-[#1a2c5b] space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white flex items-center gap-2 text-xs uppercase tracking-wider text-emerald-400">
                    <Navigation className="w-4 h-4 text-emerald-400" />
                    <span>Live Field Telemetry & GPS Tracking</span>
                  </h4>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      selectedEmp?.gps_enabled
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {selectedEmp?.gps_enabled ? 'GPS Active' : 'GPS Standby'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Last Known Coordinates</span>
                    {selectedEmp?.current_latitude && selectedEmp?.current_longitude ? (
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono font-semibold text-white">
                          {selectedEmp.current_latitude}, {selectedEmp.current_longitude}
                        </span>
                        <a
                          href={`https://www.google.com/maps?q=${selectedEmp.current_latitude},${selectedEmp.current_longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-500/30 text-[10px] font-semibold flex items-center gap-1 hover:bg-blue-900 transition"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Maps</span>
                        </a>
                      </div>
                    ) : (
                      <span className="text-slate-500 italic">No GPS coordinates recorded yet</span>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-400 text-[11px] block">Last Location Ping Time</span>
                    <span className="font-semibold text-white">
                      {selectedEmp?.last_location_time
                        ? new Date(selectedEmp.last_location_time).toLocaleString()
                        : 'No recent ping'}
                    </span>
                  </div>

                  {selectedEmp?.device_info && (
                    <div className="sm:col-span-2">
                      <span className="text-slate-400 text-[11px] block">Registered Device / Client Terminal</span>
                      <span className="font-mono text-[11px] text-slate-400">{selectedEmp.device_info}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#070c18] border-t border-[#1a2c5b] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {selectedEmp?.id && (
                  <button
                    type="button"
                    onClick={() => {
                      setDetailModalOpen(false);
                      openHistoryModal(selectedEmp.id);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#111e3f] hover:bg-[#1a2c5b] text-amber-300 hover:text-amber-200 border border-amber-500/30 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5 text-amber-400" />
                    <span>View Lifetime History</span>
                  </button>
                )}

                {isAdmin && selectedEmp?.id && (
                  <button
                    type="button"
                    onClick={() => {
                      setDetailModalOpen(false);
                      openEditModal(selectedEmp);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-red-950/80 hover:bg-red-900/80 text-red-200 border border-red-500/40 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-red-400" />
                    <span>Edit Particulars</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add / Edit Employee Form */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0b1329] border border-[#1a2c5b] rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              {formData.role === 'COORDINATOR' ? (
                <Building className="w-5 h-5 text-amber-400" />
              ) : (
                <UserPlus className="w-5 h-5 text-amber-400" />
              )}
              <span>
                {editEmp 
                  ? `Edit ${formData.role === 'COORDINATOR' ? 'Coordinator' : 'Staff'} Particulars` 
                  : (formData.role === 'COORDINATOR' ? 'Register New Project Coordinator' : 'Register New Sales Executive')}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              {formData.role === 'COORDINATOR'
                ? 'Creates a regional Project Coordinator with auto-generated CRD-XXXX credentials to manage field executive teams and approvals.'
                : 'Unique ID generated automatically. Sales executives can be assigned to a project coordinator.'}
            </p>

            {errorMsg && (
              <div className="mb-4 p-2.5 rounded bg-rose-950 border border-rose-500/50 text-xs text-rose-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-[#070c18] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-[#070c18] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editEmp}
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-[#070c18] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Mobile Phone *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 rounded bg-[#070c18] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="emp@goldfinance.com"
                    className="w-full px-3 py-2 rounded bg-[#070c18] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Emergency Contact Number</label>
                  <input
                    type="text"
                    value={formData.emergency_contact}
                    onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                    placeholder="+91 94440 99999"
                    className="w-full px-3 py-2 rounded bg-[#070c18] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Government ID (PAN / Aadhaar)</label>
                  <input
                    type="text"
                    value={formData.pan_or_aadhaar}
                    onChange={(e) => setFormData({ ...formData, pan_or_aadhaar: e.target.value })}
                    placeholder="e.g. ABCDE1234F"
                    className="w-full px-3 py-2 rounded bg-[#070c18] border border-[#1a2c5b] text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Joining Date</label>
                  <input
                    type="date"
                    value={formData.joining_date}
                    onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-[#070c18] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">System Role *</label>
                  <select
                    value={formData.role}
                    disabled={!isAdmin}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-[#070c18] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="SALES_EXECUTIVE">Sales Executive (EMP-XXXX)</option>
                    <option value="COORDINATOR">Project Coordinator (CRD-XXXX)</option>
                    {isAdmin && <option value="ADMIN">Administrator (ADM-XXXX)</option>}
                  </select>
                </div>

                <div>
                  {formData.role === 'COORDINATOR' ? (
                    <div className="p-2.5 rounded-lg bg-blue-950/40 border border-blue-500/30 flex items-start gap-2 text-xs">
                      <Building className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-blue-200 font-semibold block">Coordinator Hierarchy</span>
                        <p className="text-[10px] text-slate-300 mt-0.5">
                          Assigned code: <span className="font-mono text-amber-300 font-bold">CRD-XXXX</span>. Coordinators manage fleet executives and do not report to another coordinator.
                        </p>
                      </div>
                    </div>
                  ) : formData.role === 'ADMIN' ? (
                    <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/30 flex items-start gap-2 text-xs">
                      <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-amber-200 font-semibold block">System Administrator</span>
                        <p className="text-[10px] text-slate-300 mt-0.5">
                          Assigned code: <span className="font-mono text-amber-300 font-bold">ADM-XXXX</span>. Headquarters access with full oversight.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <label className="block text-slate-300 mb-1">Reporting Project Coordinator</label>
                      <select
                        value={formData.assigned_coordinator}
                        onChange={(e) => setFormData({ ...formData, assigned_coordinator: e.target.value })}
                        className="w-full px-3 py-2 rounded bg-[#070c18] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
                      >
                        <option value="">None / Unassigned</option>
                        {coordinators.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.first_name ? `${c.first_name} ${c.last_name || ''}` : c.username} ({c.employee_id})
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-amber-400/80 mt-1">
                        When assigned, the new employee ID and complete details are routed directly into this coordinator's fleet roster.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* SCROLL DOWN BUTTON 1: ALL CITIES & SCROLL DOWN BUTTON 2: WHAT ARE BRANCHES */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-[#070c18] border border-amber-500/20">
                <div>
                  <label className="block text-amber-300 font-semibold mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    <span>Operational City (All Cities) *</span>
                  </label>
                  <select
                    required
                    value={formData.city}
                    onChange={(e) => handleCityChange(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-[#0b1329] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400 font-medium"
                  >
                    <option value="">-- Select Operational City --</option>
                    {citiesBranches.map((c) => (
                      <option key={c.city} value={c.city}>
                        {c.city} ({c.state})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Select city to load corresponding branches
                  </p>
                </div>

                <div>
                  <label className="block text-amber-300 font-semibold mb-1 flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-amber-400" />
                    <span>Assigned Branch (What are Branches) *</span>
                  </label>
                  <select
                    required
                    value={formData.branch}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-[#0b1329] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400 font-medium"
                  >
                    <option value="">-- Select Branch --</option>
                    {availableBranches.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {formData.city ? `Branches in ${formData.city}` : 'Select city first'}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 rounded bg-[#070c18] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="ON_LEAVE">On Leave</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Residential Street Address</label>
                <textarea
                  rows="2"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Full street address..."
                  className="w-full px-3 py-2 rounded bg-[#070c18] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">
                  {editEmp ? 'Reset Password (leave empty to keep unchanged)' : 'Initial Password (default Gold@123)'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded bg-[#070c18] border border-[#1a2c5b] text-white focus:outline-none focus:border-amber-400"
                />
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
                  {saving ? 'Saving...' : (editEmp ? 'Update Staff Record' : (formData.role === 'COORDINATOR' ? 'Create Project Coordinator' : 'Create Executive'))}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Employees;
