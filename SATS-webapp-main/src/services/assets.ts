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
};
