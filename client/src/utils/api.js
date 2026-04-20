import axios from 'axios';
import toast from 'react-hot-toast'; // ✅ FIX ADDED

const api = axios.create({
  //baseURL: '/api',
  baseURL: import.meta.env.VITE_API_URL, // ✅ FIXED
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lms_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
// api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if (error.response?.status === 401) {
//       localStorage.removeItem('lms_token');
//       localStorage.removeItem('lms_user');
//       window.location.href = '/login';
//     }
//     return Promise.reject(error);
//   }
// );

api.interceptors.response.use(
  (response) => response, // ✅ KEEP FULL RESPONSE
  (error) => {
    if (!error.response) {
      toast.error('Network error. Please check your connection.');
      return Promise.reject(error);
    }

    if (error.response.status === 401) {
      localStorage.removeItem('lms_token');
      localStorage.removeItem('lms_user');
      window.location.href = '/login';
    }

    if (error.response.status === 403) {
      toast.error('Access denied');
    }

    return Promise.reject(error);
  }
);
export default api;
