
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User } from '../types';
import * as api from '../services/api';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  loginDemo: () => void;
  logout: () => void;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize user from localStorage to persist session across refreshes
  const [user, setUser] = useState<User | null>(() => {
      try {
          const storedUser = localStorage.getItem('naf_session_user');
          return storedUser ? JSON.parse(storedUser) : null;
      } catch (e) {
          console.error("Failed to parse stored session", e);
          return null;
      }
  });
  
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string|null>(null);

  // Sync user state with localStorage and restore API state
  useEffect(() => {
      if (user) {
          localStorage.setItem('naf_session_user', JSON.stringify(user));
          // If the persistent user is the demo user, ensure the API service knows we are in demo mode
          if (user.email === 'demo@nafat.com') {
              api.enableDemoMode();
          }
      } else {
          localStorage.removeItem('naf_session_user');
      }
  }, [user]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const userData = await api.login(email, password);
      setUser(userData);
    } catch (err: any) {
      setError(err.message || 'Échec de la connexion');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginDemo = () => {
      setLoading(true);
      const demoUser = api.enableDemoMode();
      setUser(demoUser);
      setLoading(false);
  };

  const logout = () => {
    setUser(null);
    api.disableDemoMode();
    // LocalStorage is cleared by the useEffect
  };

  return (
    <AuthContext.Provider value={{ user, login, loginDemo, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
