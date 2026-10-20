import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('pm_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('pm_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      if (token) {
        try {
          const data = await api.get('/auth/me');
          setUser(data.user);
          localStorage.setItem('pm_user', JSON.stringify(data.user));
        } catch (err) {
          console.warn('Session verification failed:', err);
          logout();
        }
      }
      setLoading(false);
    }
    checkAuth();
  }, [token]);

  const saveAuth = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('pm_token', newToken);
    localStorage.setItem('pm_user', JSON.stringify(newUser));
  };

  const login = async (email, password) => {
    const data = await api.post('/auth/login', { email, password });
    saveAuth(data.token, data.user);
    return data.user;
  };

  const demoLogin = async (email) => {
    const data = await api.post('/auth/demo-login', { email });
    saveAuth(data.token, data.user);
    return data.user;
  };

  const register = async (name, email, password, avatar_color) => {
    const data = await api.post('/auth/register', { name, email, password, avatar_color });
    saveAuth(data.token, data.user);
    return data.user;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('pm_token');
    localStorage.removeItem('pm_user');
  };

  const updateProfile = async (profileData) => {
    const data = await api.put('/auth/profile', profileData);
    setUser(data.user);
    localStorage.setItem('pm_user', JSON.stringify(data.user));
    return data.user;
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, demoLogin, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
