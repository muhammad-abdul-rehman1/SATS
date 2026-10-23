import api from './api';
import { AssetIssue, ApiResponse } from '@/types';

export interface IssueFilters {
  status?: string;
  priority?: string;
  assetId?: string;
  assetTag?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface IssueStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
}

export const issuesAPI = {
  reportIssue: async (data: {
    assetId?: string;
    assetTag?: string;
    title?: string;
    description: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    imageUrl?: string;
  }) => {
    const response = await api.post<ApiResponse<AssetIssue>>('/issues', data);
    return response;
  },

  getMyIssues: async (params?: { status?: string; search?: string }) => {
    const response = await api.get<{
      issues: AssetIssue[];
      total: number;
      stats: IssueStats;
    }>('/issues/my-issues', { params });
    return response;
  },

  getAll: async (filters?: IssueFilters) => {
    const response = await api.get<{
      issues: AssetIssue[];
      total: number;
      stats: IssueStats;
      pagination: {
        page: number;
        limit: number;
        pages: number;
      };
    }>('/issues', { params: filters });
    return response;
  },

  getByAssetId: async (assetId: string) => {
    const response = await api.get<AssetIssue[]>(`/issues/asset/${assetId}`);
    return response;
  },

  getById: async (id: string) => {
    const response = await api.get<AssetIssue>(`/issues/${id}`);
    return response;
  },

  updateStatus: async (
    id: string,
    data: {
      status: string;
      resolutionNotes?: string;
      assignedTo?: string;
    }
  ) => {
    const response = await api.patch<ApiResponse<AssetIssue>>(`/issues/${id}/status`, data);
    return response;
  },

  delete: async (id: string) => {
    const response = await api.delete<ApiResponse<null>>(`/issues/${id}`);
    return response;
  },
};
