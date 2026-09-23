import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import { DEMO_ACCOUNTS } from '../utils/constants';
import { getAccessToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize session
  const initAuth = useCallback(async () => {
    try {
      if (getAccessToken()) {
        const profile = await authService.getMe();
        setUser(profile);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const login = async (email, password) => {
    const data = await authService.login(email, password);
    setUser(data.user);
    return data.user;
  };

  const register = async (userData) => {
    const data = await authService.register(userData);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const switchDemoAccount = async (role) => {
    const creds = DEMO_ACCOUNTS[role];
    if (!creds) throw new Error(`Unknown role ${role}`);
    return login(creds.email, creds.password);
  };

  const refreshUser = async () => {
    try {
      const profile = await authService.getMe();
      setUser(profile);
    } catch {
      setUser(null);
    }
  };

  const loginWithGoogle = async (payload) => {
    const data = await authService.googleAuth(payload);
    setUser(data.user);
    return data.user;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'ADMIN',
        isAgent: user?.role === 'AGENT',
        isCustomer: user?.role === 'CUSTOMER',
        login,
        loginWithGoogle,
        register,
        logout,
        switchDemoAccount,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
