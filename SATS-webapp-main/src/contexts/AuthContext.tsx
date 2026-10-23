import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User, AuthResponse } from '@/types';
import { authAPI } from '@/services/auth';
import { getToken, setToken, removeToken } from '@/utils/storage';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<any>;
  verify2FA: (tempToken: string, code: string) => Promise<any>;
  logout: (reason?: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<any>;
  verifyEmail: (email: string, code: string) => Promise<any>;
  refreshUser: () => Promise<void>;
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
      
      if (authData?.require2FA) {
        return authData;
      }

      if (authData?.token && authData?.user) {
        setToken(authData.token);
        setUser(authData.user as User);
        setIsAuthenticated(true);
        return authData;
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

  const verify2FA = useCallback(async (tempToken: string, code: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await authAPI.verify2FA({ tempToken, code });
      const authData = (response.data?.data || response.data) as AuthResponse;

      if (authData?.token && authData?.user) {
        setToken(authData.token);
        setUser(authData.user as User);
        setIsAuthenticated(true);
        return authData;
      } else {
        throw new Error('Invalid 2FA verification response');
      }
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || '2FA verification failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const response = await authAPI.getProfile();
      const authData = (response.data?.data || response.data) as AuthResponse | undefined;
      if (authData?.user) {
        setUser(authData.user as User);
      }
    } catch (e) {}
  }, []);

  const logout = useCallback(async (reason?: string) => {
    try {
      if (getToken()) {
        await authAPI.logout(reason);
      }
    } catch (e) {
      // Ignore network errors or token expiration during logout
    } finally {
      removeToken();
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
    }
  }, []);

  // Automatic logout after 15 minutes of inactivity (FR06-03, TC-06 Step 6)
  useEffect(() => {
    if (!isAuthenticated || typeof window === 'undefined') return;

    const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
    let timeoutId: NodeJS.Timeout;

    const handleTimeout = async () => {
      await logout('INACTIVITY');
      if (typeof window !== 'undefined') {
        window.location.href = '/login?reason=inactivity';
      }
    };

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(handleTimeout, INACTIVITY_TIMEOUT_MS);
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => window.addEventListener(event, resetTimer, { passive: true }));

    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [isAuthenticated, logout]);


  const register = useCallback(async (name: string, email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await authAPI.register({ name, email, password });
      const data = response.data as any;
      
      if (data?.requireVerification) {
        return { requireVerification: true, email };
      }

      const authData = (response.data?.data || response.data) as AuthResponse;
      if (authData?.token && authData?.user) {
        setToken(authData.token);
        setUser(authData.user as User);
        setIsAuthenticated(true);
      }
      return authData;
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Registration failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyEmail = useCallback(async (email: string, code: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await authAPI.verifyEmail({ email, code });
      const authData = (response.data?.data || response.data) as AuthResponse;
      if (authData?.token && authData?.user) {
        setToken(authData.token);
        setUser(authData.user as User);
        setIsAuthenticated(true);
      }
      return authData;
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Verification failed';
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
        verify2FA,
        logout,
        register,
        verifyEmail,
        refreshUser,
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
