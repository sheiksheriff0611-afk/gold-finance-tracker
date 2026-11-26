import axios from 'axios';

const envApiUrl = import.meta.env.VITE_API_URL;
const BASE_URL = envApiUrl
  ? (envApiUrl.endsWith('/') ? envApiUrl.slice(0, -1) : envApiUrl)
  : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:8000'
    : 'https://gold-finance-tracker-1.onrender.com');

const API_BASE_URL = `${BASE_URL}/api`;

const getMediaUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If unauthorized, clean stale tokens safely in storage
    // NEVER call window.location.href here to avoid browser reload loops
    if (error.response && error.response.status === 401) {
      const url = error.config?.url || '';
      if (!url.includes('/accounts/login/')) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
export { API_BASE_URL, BASE_URL, getMediaUrl };
