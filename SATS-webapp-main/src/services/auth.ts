import api from './api';
import { AuthResponse, ApiResponse } from '@/types';

export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', {
      email,
      password,
    });
    return response;
  },

  register: async (userData: { name: string; email: string; password: string }) => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', userData);
    return response;
  },

  getProfile: async () => {
    const response = await api.get<ApiResponse<AuthResponse>>('/auth/profile');
    return response;
  },

  verifyEmail: async (data: { email: string; code: string }) => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/verify-email', data);
    return response;
  },

  resendVerification: async (email: string) => {
    const response = await api.post<{ message: string }>('/auth/resend-verification', { email });
    return response;
  },

  forgotPassword: async (email: string) => {
    const response = await api.post<{ message: string; email?: string }>('/auth/forgot-password', {
      email,
    });
    return response;
  },

  verifyResetToken: async (token: string) => {
    const response = await api.get<{ valid: boolean; email: string }>(`/auth/verify-reset-token/${token}`);
    return response;
  },

  resetPassword: async (data: { token?: string; code?: string; email?: string; password: string }) => {
    const response = await api.post<{ message: string }>('/auth/reset-password', data);
    return response;
  },

  verify2FA: async (data: { tempToken: string; code: string }) => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/verify-2fa', data);
    return response;
  },

  resend2FA: async (tempToken: string) => {
    const response = await api.post<{ message: string; devCode?: string }>('/auth/resend-2fa', { tempToken });
    return response;
  },

  toggle2FA: async (enable: boolean) => {
    const response = await api.post<{ message: string; twoFactorEnabled: boolean }>('/auth/2fa/toggle', { enable });
    return response;
  },

  getMyLoginHistory: async () => {
    const response = await api.get<{ logs: any[] }>('/auth/my-login-history');
    return response;
  },

  getAuditLogs: async (params?: { page?: number; limit?: number; action?: string; email?: string }) => {
    const response = await api.get<{ total: number; logs: any[]; page: number; limit: number }>('/auth/audit-logs', { params });
    return response;
  },

  logout: async (reason?: string) => {
    const response = await api.post<{ success: boolean; message: string }>('/auth/logout', { reason });
    return response;
  },
};
