import api from './api';
import { ApiResponse, DashboardStats } from '@/types';

export const reportsAPI = {
  getDashboardStats: async () => {
    const response = await api.get<ApiResponse<DashboardStats>>('/dashboard/stats');
    return response;
  },

  getAssetReport: async (filters?: any) => {
    const response = await api.get<ApiResponse<any>>('/reports/assets', {
      params: filters,
    });
    return response;
  },

  getScanHistory: async (filters?: any) => {
    const response = await api.get<ApiResponse<any>>('/reports/scan-history', {
      params: filters,
    });
    return response;
  },
};
