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
};
