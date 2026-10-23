import api from './api';
import { MaintenanceSchedule, MaintenanceStats, MaintenanceFilters, PaginatedResponse, ApiResponse } from '@/types';

export const maintenanceAPI = {
  getAll: async (filters?: MaintenanceFilters) => {
    const response = await api.get<PaginatedResponse<MaintenanceSchedule>>('/maintenance', {
      params: filters,
    });
    return response;
  },

  getStats: async () => {
    const response = await api.get<MaintenanceStats>('/maintenance/stats');
    return response;
  },

  getByAssetId: async (assetId: string) => {
    const response = await api.get<MaintenanceSchedule[]>(`/maintenance/asset/${assetId}`);
    return response;
  },

  getById: async (id: string) => {
    const response = await api.get<MaintenanceSchedule>(`/maintenance/${id}`);
    return response;
  },

  schedule: async (data: {
    assetId: string;
    title: string;
    description?: string;
    scheduledDate: string | Date;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    assignedTo?: string;
    notes?: string;
    setAssetMaintenance?: boolean;
  }) => {
    const response = await api.post<ApiResponse<MaintenanceSchedule>>('/maintenance', data);
    return response;
  },

  reschedule: async (id: string, data: { newDate: string | Date; reason?: string }) => {
    const response = await api.put<ApiResponse<MaintenanceSchedule>>(`/maintenance/${id}/reschedule`, data);
    return response;
  },

  updateStatus: async (
    id: string,
    data: {
      status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
      notes?: string;
      restoreAssetStatus?: boolean;
    }
  ) => {
    const response = await api.patch<ApiResponse<MaintenanceSchedule>>(`/maintenance/${id}/status`, data);
    return response;
  },

  update: async (id: string, data: Partial<MaintenanceSchedule>) => {
    const response = await api.put<ApiResponse<MaintenanceSchedule>>(`/maintenance/${id}`, data);
    return response;
  },

  delete: async (id: string) => {
    const response = await api.delete<ApiResponse<null>>(`/maintenance/${id}`);
    return response;
  },

  checkReminders: async () => {
    const response = await api.post<{ message: string; dispatched: number; tasksChecked: number }>(
      '/maintenance/reminders/check'
    );
    return response;
  },
};
