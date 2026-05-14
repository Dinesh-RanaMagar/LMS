import React, { createContext, useState, useContext, useEffect } from 'react';
import { adminAPI } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedAdmin = localStorage.getItem('admin');
    
    if (savedToken && savedAdmin) {
      setToken(savedToken);
      setAdmin(JSON.parse(savedAdmin));
    }
    setLoading(false);
  }, []);

  const register = async (name, email, password, confirmPassword) => {
    const response = await adminAPI.register({
      name,
      email,
      password,
      confirmPassword,
    });
    return response.data;
  };

  const login = async (email, password) => {
    const response = await adminAPI.login({ email, password });
    const { token: newToken, admin: adminData } = response.data;
    
    localStorage.setItem('token', newToken);
    localStorage.setItem('admin', JSON.stringify(adminData));
    
    setToken(newToken);
    setAdmin(adminData);
    
    return response.data;
  };

  const logout = async () => {
    try {
      await adminAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('admin');
      setToken(null);
      setAdmin(null);
    }
  };

  const isAuthenticated = !!token && !!admin;

  return (
    <AuthContext.Provider
      value={{
        admin,
        token,
        loading,
        isAuthenticated,
        register,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
