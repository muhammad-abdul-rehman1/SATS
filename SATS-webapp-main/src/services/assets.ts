import api from './api';
import { Asset, ApiResponse, PaginatedResponse, AssetFilters } from '@/types';

export const assetsAPI = {
  getAll: async (filters?: AssetFilters) => {
    const response = await api.get<ApiResponse<PaginatedResponse<Asset>>>('/assets', {
      params: filters,
    });
    return response;
  },

  getById: async (id: string) => {
    const response = await api.get<ApiResponse<Asset>>(`/assets/${id}`);
    return response;
  },

  create: async (assetData: Partial<Asset>) => {
    const response = await api.post<ApiResponse<Asset>>('/assets', assetData);
    return response;
  },

  update: async (id: string, assetData: Partial<Asset>) => {
    const response = await api.put<ApiResponse<Asset>>(`/assets/${id}`, assetData);
    return response;
  },

  delete: async (id: string) => {
    const response = await api.delete<ApiResponse<null>>(`/assets/${id}`);
    return response;
  },

  generateQRCode: async (id: string) => {
    const response = await api.get<ApiResponse<{ qrCode: string }>>(`/assets/${id}/qr-code`);
    return response;
  },

  getAllQRPdf: async () => {
    const response = await api.get('/assets/all/qr-pdf', {
      responseType: 'blob',
    });
    return response;
  },

  bulkUpdate: async (payload: { assetIds: string[]; updates: any }) => {
    const response = await api.post<ApiResponse<{ message: string; modifiedCount: number }>>('/assets/bulk-update', payload);
    return response;
  },

  bulkDelete: async (assetIds: string[]) => {
    const response = await api.post<ApiResponse<{ message: string; deletedCount: number }>>('/assets/bulk-delete', { assetIds });
    return response;
  },

  getLogs: async (id: string) => {
    const response = await api.get<ApiResponse<any[]>>(`/assets/${id}/logs`);
    return response;
  },

  getMovementHistory: async (id: string, params?: { startDate?: string; endDate?: string; page?: number; limit?: number }) => {
    const response = await api.get<ApiResponse<{ asset: any; movements: any[]; total: number; pagination: any }>>(`/assets/${id}/movement-history`, {
      params,
    });
    return response;
  },

  exportMovementHistory: async (id: string, format: 'pdf' | 'csv' = 'pdf', params?: { startDate?: string; endDate?: string }) => {
    const response = await api.get(`/assets/${id}/movement-history/export`, {
      params: { ...params, format },
      responseType: 'blob',
    });
    return response;
  },

  getAllMovementHistory: async (params?: { startDate?: string; endDate?: string; search?: string; assetTag?: string; page?: number; limit?: number }) => {
    const response = await api.get<ApiResponse<{ movements: any[]; total: number; pagination: any }>>('/assets/movement-history', {
      params,
    });
    return response;
  },
};
