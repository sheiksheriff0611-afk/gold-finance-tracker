import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import LiveTracking from './pages/LiveTracking';
import CustomerVisits from './pages/CustomerVisits';
import GoldCollection from './pages/GoldCollection';
import CashCollection from './pages/CashCollection';
import Approvals from './pages/Approvals';
import Employees from './pages/Employees';
import Targets from './pages/Targets';
import Reports from './pages/Reports';
import Profile from './pages/Profile';

const MainLayout = () => {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070c18] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-red-400 font-semibold tracking-wider uppercase">Loading Karur Gold Finance Portal...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard setCurrentTab={setCurrentTab} />;
      case 'tracking':
        return <LiveTracking />;
      case 'visits':
        return <CustomerVisits />;
      case 'gold':
        return <GoldCollection />;
      case 'cash':
        return <CashCollection />;
      case 'approvals':
        return <Approvals />;
      case 'employees':
        return <Employees />;
      case 'targets':
        return <Targets />;
      case 'reports':
        return <Reports />;
      case 'profile':
        return <Profile />;
      default:
        return <Dashboard setCurrentTab={setCurrentTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#070c18] text-slate-100 flex">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        <Navbar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          setMobileOpen={setMobileOpen}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}

export default App;
