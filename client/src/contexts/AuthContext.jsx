import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('lms_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('lms_token');
    if (token) {
      api.get('/auth/me')
        .then(({ data }) => { setUser(data.user); localStorage.setItem('lms_user', JSON.stringify(data.user)); })
        .catch(() => { localStorage.removeItem('lms_token'); localStorage.removeItem('lms_user'); setUser(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // const login = async (email, password) => {
  //   const { data } = await api.post('/auth/login', { email, password });
  //   localStorage.setItem('lms_token', data.token);
  //   localStorage.setItem('lms_user', JSON.stringify(data.user));
  //   setUser(data.user);
  //   return data.user;
  // };

  const login = async (email, password) => {
  const { data } = await api.post('/auth/login', { email, password });

  console.log("LOGIN RESPONSE:", data); // 🔍 MUST CHECK

  // 🚫 Validate response properly
  if (!data?.token || !data?.user) {
    throw new Error(data?.message || 'Invalid login response');
  }

  localStorage.setItem('lms_token', data.token);
  localStorage.setItem('lms_user', JSON.stringify(data.user));

  setUser(data.user);

  return data.user;
};

  const register = async (formData) => {
    const { data } = await api.post('/auth/register', formData);
    localStorage.setItem('lms_token', data.token);
    localStorage.setItem('lms_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('lms_token');
    localStorage.removeItem('lms_user');
    setUser(null);
  };

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager' || user?.role === 'admin';
  const isMember = user?.role === 'member';

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAdmin, isManager, isMember }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
