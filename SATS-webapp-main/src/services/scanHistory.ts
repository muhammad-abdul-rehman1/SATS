import api from './api';

export const scanHistoryAPI = {
  getScanHistory: async (page = 1, limit = 20, type?: string) => {
    const response = await api.get('/resolve/scan-history', {
      params: { page, limit, ...(type ? { type } : {}) },
    });
    return response;
  },

  getScanStats: async () => {
    const response = await api.get('/resolve/scan-stats');
    return response;
  },
};
