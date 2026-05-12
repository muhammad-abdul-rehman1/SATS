import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User, AuthResponse } from '@/types';
import { authAPI } from '@/services/auth';
import { getToken, setToken, removeToken } from '@/utils/storage';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (name: string, email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check authentication on mount (client-side only)
  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    const checkAuth = async () => {
      try {
        setIsLoading(true);
        const token = getToken();

        if (!token) {
          setIsAuthenticated(false);
          setUser(null);
          return;
        }

        // Try to get profile to validate token
        try {
          const response = await authAPI.getProfile();
          // Handle both wrapped and unwrapped responses
          const authData = (response.data?.data || response.data) as AuthResponse | undefined;
          if (authData?.user) {
            setUser(authData.user as User);
            setIsAuthenticated(true);
            setError(null);
          } else {
            removeToken();
            setIsAuthenticated(false);
            setUser(null);
          }
        } catch (err) {
          removeToken();
          setIsAuthenticated(false);
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await authAPI.login(email, password);
      // Handle both wrapped and unwrapped responses
      const authData = (response.data?.data || response.data) as AuthResponse;
      
      if (authData?.token && authData?.user) {
        setToken(authData.token);
        setUser(authData.user as User);
        setIsAuthenticated(true);
      } else {
        throw new Error('Invalid login response');
      }
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Login failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    removeToken();
    setUser(null);
    setIsAuthenticated(false);
    setError(null);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await authAPI.register({ name, email, password });
      // Handle both wrapped and unwrapped responses
      const authData = (response.data?.data || response.data) as AuthResponse;
      
      if (authData?.token && authData?.user) {
        setToken(authData.token);
        setUser(authData.user as User);
        setIsAuthenticated(true);
      } else {
        throw new Error('Invalid registration response');
      }
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Registration failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        error,
        login,
        logout,
        register,
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
