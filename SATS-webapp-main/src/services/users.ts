import api from './api';
import { User, ApiResponse, PaginatedResponse, UserFilters } from '@/types';

export const usersAPI = {
  getAll: async (filters?: UserFilters) => {
    const response = await api.get<ApiResponse<PaginatedResponse<User>>>('/users', {
      params: filters,
    });
    return response;
  },

  getById: async (id: string) => {
    const response = await api.get<ApiResponse<User>>(`/users/${id}`);
    return response;
  },

  create: async (userData: Partial<User> & { password?: string }) => {
    const response = await api.post<ApiResponse<User>>('/users', userData);
    return response;
  },

  update: async (id: string, userData: Partial<User>) => {
    const response = await api.put<ApiResponse<User>>(`/users/${id}`, userData);
    return response;
  },

  delete: async (id: string) => {
    const response = await api.delete<ApiResponse<null>>(`/users/${id}`);
    return response;
  },

  toggleStatus: async (id: string, isActive: boolean) => {
    const response = await api.patch<ApiResponse<User>>(`/users/${id}/status`, { isActive });
    return response;
  },

  sendResetLink: async (id: string) => {
    const response = await api.post<ApiResponse<any>>(`/users/${id}/reset-password`, { mode: 'email' });
    return response;
  },

  resetPassword: async (id: string, newPassword: string) => {
    const response = await api.post<ApiResponse<any>>(`/users/${id}/reset-password`, {
      mode: 'manual',
      newPassword,
    });
    return response;
  },
};
