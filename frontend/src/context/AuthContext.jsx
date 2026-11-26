import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('access_token'));
  const [loading, setLoading] = useState(false);

  // Validate existing stored session ONCE on initial app mount only
  // (Prevents double-render flickering when logging in)
  useEffect(() => {
    const savedToken = localStorage.getItem('access_token');
    if (savedToken) {
      api.get('/accounts/me/')
        .then((res) => {
          setUser(res.data);
          localStorage.setItem('user', JSON.stringify(res.data));
        })
        .catch((err) => {
          if (err.response && err.response.status === 401) {
            logout();
          }
        });
    }
  }, []);

  const login = async (username, password) => {
    const res = await api.post('/accounts/login/', { username, password });
    const { access, refresh, user: userData } = res.data;
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(access);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const res = await api.get('/accounts/me/');
      setUser(res.data);
      localStorage.setItem('user', JSON.stringify(res.data));
      return res.data;
    } catch (err) {
      console.error('Error refreshing user details:', err);
      return null;
    }
  };

  const toggleWorkShift = async (action, gpsCoords = null) => {
    try {
      const payload = { action };
      if (gpsCoords) {
        payload.latitude = gpsCoords.latitude;
        payload.longitude = gpsCoords.longitude;
        payload.accuracy = gpsCoords.accuracy || 10;
        payload.battery_level = gpsCoords.battery_level || 90;
      }
      const res = await api.post('/tracking/shift-toggle/', payload);
      await refreshUser();
      return res.data;
    } catch (err) {
      throw err;
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    refreshUser,
    toggleWorkShift,
    isAdmin: user?.role === 'ADMIN' || user?.is_superuser,
    isCoordinator: user?.role === 'COORDINATOR',
    isSalesExecutive: user?.role === 'SALES_EXECUTIVE',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
