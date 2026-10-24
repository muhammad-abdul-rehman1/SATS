import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'USER' | 'SUPER_ADMIN';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: { name: string; email: string; password: string; role?: string }) => Promise<any>;
  verifyEmail: (email: string, code: string) => Promise<any>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const storedUser = await AsyncStorage.getItem('user');
      
      if (token && storedUser) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await authAPI.login(email, password);
      
      const { token, user: userData } = response || {};
      if (!token) {
        console.warn('[Auth] Login response missing token');
        throw new Error('Login failed: no token returned');
      }
      if (!userData) {
        // Attempt fallback to profile endpoint
        try {
          const prof = await authAPI.getProfile();
          // Expect shape { user: {...} } or direct user
          const resolvedUser = (prof && (prof.user || prof)) || null;
          if (resolvedUser) {
            await AsyncStorage.setItem('authToken', token);
            await AsyncStorage.setItem('user', JSON.stringify(resolvedUser));
            setUser(resolvedUser);
            return;
          }
        } catch (e) {
          console.warn('[Auth] Fallback profile fetch failed', e);
        }
        throw new Error('Login failed: no user data returned');
      }

      await AsyncStorage.setItem('authToken', token);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: { name: string; email: string; password: string; role?: string }) => {
    try {
      setIsLoading(true);
      const response = await authAPI.register(userData);
      
      if (response?.requireVerification) {
        return response;
      }

      const { token, user: newUser } = response || {};
      if (token && newUser) {
        await AsyncStorage.setItem('authToken', token);
        await AsyncStorage.setItem('user', JSON.stringify(newUser));
        setUser(newUser);
      }
      return response;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyEmail = async (email: string, code: string) => {
    try {
      setIsLoading(true);
      const response = await authAPI.verifyEmail({ email, code });
      const { token, user: newUser } = response || {};
      if (token && newUser) {
        await AsyncStorage.setItem('authToken', token);
        await AsyncStorage.setItem('user', JSON.stringify(newUser));
        setUser(newUser);
      }
      return response;
    } catch (error) {
      console.error('Verification error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('user');
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      AsyncStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    verifyEmail,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
