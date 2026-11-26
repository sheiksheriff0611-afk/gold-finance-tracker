import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  MapPin,
  CalendarCheck,
  Coins,
  Banknote,
  CheckCircle2,
  Target,
  FileSpreadsheet,
  LogOut,
  ShieldAlert,
  Sparkles,
  Radio,
  UserCircle
} from 'lucide-react';

const Sidebar = ({ currentTab, setCurrentTab, mobileOpen, setMobileOpen }) => {
  const { user, logout, isAdmin, isCoordinator, isSalesExecutive } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'COORDINATOR', 'SALES_EXECUTIVE'] },
    { id: 'tracking', label: 'Live GPS Map', icon: MapPin, roles: ['ADMIN', 'COORDINATOR', 'SALES_EXECUTIVE'] },
    { id: 'visits', label: 'Customer Visits', icon: CalendarCheck, roles: ['ADMIN', 'COORDINATOR', 'SALES_EXECUTIVE'] },
    { id: 'gold', label: 'Gold Collection', icon: Coins, roles: ['ADMIN', 'COORDINATOR', 'SALES_EXECUTIVE'] },
    { id: 'cash', label: 'Cash Collection', icon: Banknote, roles: ['ADMIN', 'COORDINATOR', 'SALES_EXECUTIVE'] },
    { id: 'approvals', label: 'Approvals & Verify', icon: CheckCircle2, roles: ['ADMIN', 'COORDINATOR'] },
    { id: 'employees', label: 'Employee Hub', icon: Users, roles: ['ADMIN', 'COORDINATOR'] },
    { id: 'targets', label: 'Target & Progress', icon: Target, roles: ['ADMIN', 'COORDINATOR', 'SALES_EXECUTIVE'] },
    { id: 'reports', label: 'Reports & Export', icon: FileSpreadsheet, roles: ['ADMIN', 'COORDINATOR', 'SALES_EXECUTIVE'] },
    { id: 'profile', label: 'My Profile & Security', icon: UserCircle, roles: ['ADMIN', 'COORDINATOR', 'SALES_EXECUTIVE'] },
  ];

  const allowedNav = navItems.filter(item => item.roles.includes(user?.role));

  const handleSelect = (tabId) => {
    setCurrentTab(tabId);
    if (setMobileOpen) setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#080d1a] border-r border-[#1a2749] flex flex-col transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Brand Header with KGF Logo */}
        <div className="p-4 border-b border-[#1a2749] bg-[#0c1222] flex items-center justify-between">
          <div className="flex items-center space-x-3 w-full">
            <div className="bg-white/95 p-1 rounded-xl border border-slate-300 shadow-md shadow-red-950/40 shrink-0">
              <img src="/logo.png" alt="Karur Gold Finance (KGF)" className="h-9 w-auto object-contain" />
            </div>
            <div className="overflow-hidden">
              <h1 className="font-extrabold tracking-wide text-white text-xs flex items-center gap-1">
                <span>KARUR</span>
                <span className="text-red-500">GOLD FINANCE</span>
              </h1>
              <p className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Employee & Collections</p>
            </div>
          </div>
        </div>

        {/* User Role Card */}
        <div 
          onClick={() => handleSelect('profile')}
          className="px-4 py-3 border-b border-[#1a2c5b]/50 bg-[#0c1530] hover:bg-[#111e3f] cursor-pointer transition"
          title="Click to view/edit your profile"
        >
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-[#16254e] border border-amber-500/30 flex items-center justify-center text-amber-300 font-bold text-sm">
              {user?.first_name ? user.first_name[0] : user?.username[0].toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-slate-200 truncate">
                {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`inline-block w-2 h-2 rounded-full ${user?.is_working ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                <span className="text-[10px] font-medium tracking-wide uppercase px-1.5 py-0.5 rounded bg-[#1a2c5b] text-amber-300 border border-amber-400/20">
                  {user?.role === 'ADMIN' ? 'Admin' : (user?.role === 'COORDINATOR' ? 'Coordinator' : 'Field Executive')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {allowedNav.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`
                  w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200
                  ${active
                    ? 'bg-gradient-to-r from-amber-500/20 to-amber-500/5 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#111e3f]'
                  }
                `}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Live GPS Telemetry Indicator */}
        {isSalesExecutive && (
          <div className="p-3 mx-3 mb-3 rounded-lg bg-[#0d1736] border border-[#1a2c5b] text-[11px]">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="flex items-center gap-1.5">
                <Radio className={`w-3.5 h-3.5 ${user?.is_working ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
                Shift Telemetry
              </span>
              <span className={`px-1.5 py-0.2 rounded font-semibold text-[10px] ${user?.is_working ? 'text-emerald-400 bg-emerald-950/60' : 'text-slate-400 bg-slate-800'}`}>
                {user?.is_working ? 'ACTIVE' : 'IDLE'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              {user?.is_working ? 'GPS location broadcasting active' : 'Start work to begin tracking'}
            </p>
          </div>
        )}

        {/* Logout */}
        <div className="p-3 border-t border-[#1a2c5b]/60">
          <button
            onClick={logout}
            className="w-full flex items-center space-x-3 px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-950/30 hover:text-rose-300 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

