import React, { createContext, useState, useEffect, useContext } from 'react';
import client from '../api/client';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  // sessionStorage, not localStorage: each browser tab gets its own isolated
  // token, so several tabs (one per role, e.g. for a live demo) can each stay
  // logged in as a different user at the same time instead of sharing one
  // login across every tab of the browser.
  const [token, setToken] = useState(sessionStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const { data } = await client.get('/api/auth/me');
        setUser(data.data.user);
      } catch (error) {
        console.error('Failed to fetch user', error);
        logout();
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, [token]);

  const login = async (email, password) => {
    const { data } = await client.post('/api/auth/login', { email, password });
    if (data.success) {
      const { token: newToken, user: userData } = data.data;
      sessionStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
      return userData;
    }
    throw new Error('Login failed');
  };

  const quickLogin = async (email) => {
    const { data } = await client.post('/api/test/quick-login', { email });
    if (data.success) {
      const { token: newToken, user: userData } = data.data;
      sessionStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
      return userData;
    }
    throw new Error('Quick login failed');
  };

  const logout = () => {
    sessionStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, quickLogin, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

// ADD THIS EXPORT:
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};