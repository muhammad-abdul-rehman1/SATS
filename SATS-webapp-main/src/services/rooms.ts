import api from './api';
import { Room, ApiResponse, PaginatedResponse } from '@/types';

export const roomsAPI = {
  getAll: async (filters?: any) => {
    const response = await api.get<ApiResponse<PaginatedResponse<Room>>>('/rooms', {
      params: filters,
    });
    return response;
  },

  getById: async (id: string) => {
    const response = await api.get<ApiResponse<Room>>(`/rooms/${id}`);
    return response;
  },

  create: async (roomData: Partial<Room>) => {
    const response = await api.post<ApiResponse<Room>>('/rooms', roomData);
    return response;
  },

  update: async (id: string, roomData: Partial<Room>) => {
    const response = await api.put<ApiResponse<Room>>(`/rooms/${id}`, roomData);
    return response;
  },

  delete: async (id: string) => {
    const response = await api.delete<ApiResponse<null>>(`/rooms/${id}`);
    return response;
  },

  generateQRCode: async (id: string) => {
    const response = await api.get<ApiResponse<{ qrCode: string }>>(`/rooms/${id}/qr-code`);
    return response;
  },

  getAssets: async (id: string) => {
    const response = await api.get<ApiResponse<any[]>>(`/rooms/${id}/assets`);
    return response;
  },
};
