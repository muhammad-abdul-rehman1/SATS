import api from './api';
import {
  SystemNotification,
  NotificationSetting,
  NotificationStats,
  NotificationFilters,
  PaginatedResponse,
  ApiResponse,
} from '@/types';

export const notificationsAPI = {
  getAll: async (filters?: NotificationFilters) => {
    const response = await api.get<PaginatedResponse<SystemNotification>>('/notifications', {
      params: filters,
    });
    return response;
  },

  getStats: async () => {
    const response = await api.get<NotificationStats>('/notifications/stats');
    return response;
  },

  getActive: async () => {
    const response = await api.get<{ data: SystemNotification[]; unreadCount: number }>('/notifications/active');
    return response;
  },

  getSettings: async () => {
    const response = await api.get<NotificationSetting>('/notifications/settings');
    return response;
  },

  updateSettings: async (settings: Partial<NotificationSetting>) => {
    const response = await api.put<ApiResponse<NotificationSetting>>('/notifications/settings', settings);
    return response;
  },

  resolve: async (id: string, resolutionNotes?: string) => {
    const response = await api.patch<ApiResponse<SystemNotification>>(`/notifications/${id}/resolve`, {
      resolutionNotes,
    });
    return response;
  },

  acknowledge: async (id: string, notes?: string) => {
    const response = await api.patch<ApiResponse<SystemNotification>>(`/notifications/${id}/acknowledge`, {
      notes,
    });
    return response;
  },

  simulateMovementAlert: async (data?: { assetTag?: string; assetName?: string; locationName?: string; severity?: string }) => {
    const response = await api.post<ApiResponse<SystemNotification>>('/notifications/simulate-movement-alert', data);
    return response;
  },

  dismiss: async (id: string) => {
    const response = await api.patch<ApiResponse<SystemNotification>>(`/notifications/${id}/dismiss`);
    return response;
  },

  markRead: async (id: string) => {
    const response = await api.patch<ApiResponse<SystemNotification>>(`/notifications/${id}/read`);
    return response;
  },

  markAllRead: async () => {
    const response = await api.post<{ message: string; modifiedCount: number }>('/notifications/mark-all-read');
    return response;
  },

  clearResolved: async () => {
    const response = await api.delete<{ message: string; modifiedCount: number }>('/notifications/clear-resolved');
    return response;
  },

  broadcast: async (data: {
    title: string;
    message: string;
    type?: string;
    priority?: string;
    category?: string;
  }) => {
    const response = await api.post<ApiResponse<SystemNotification>>('/notifications/broadcast', data);
    return response;
  },
};
