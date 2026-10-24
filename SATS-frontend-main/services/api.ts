import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import {
  API_PATH,
  API_PORT,
  clearLastGoodBase,
  discoverBackend,
  getLastGoodBase,
  isPrivateUrl,
  metroHost,
  probeHealth,
  setLastGoodBase,
  stripTrailingSlash,
  toBaseUrl,
} from './discovery';

// ─── API base URL resolution ───────────────────────────────────────────────────

// @ts-ignore – EXPO_PUBLIC_* vars are replaced at bundle time by Metro
const explicit = process.env.EXPO_PUBLIC_API_URL as string | undefined;

// Placeholder only. A LAN backend address cannot be known at build time, so
// discovery replaces this before the first request is issued.
const UNRESOLVED_BASE_URL = `http://127.0.0.1:${API_PORT}${API_PATH}`;

// Earlier builds let users save a server URL by hand; a stale entry would
// otherwise pin the app to an address that no longer exists.
AsyncStorage.removeItem('customApiUrl').catch(() => {});

function computeBase(): string {
  // 1. Explicit remote production URL (non-local) always wins
  if (explicit && explicit.trim()) {
    const trimmed = stripTrailingSlash(explicit.trim());
    if (!isPrivateUrl(trimmed)) return trimmed;
  }

  // 2. In development, adapt to the live Metro host IP
  const detected = metroHost();
  if (detected) return toBaseUrl(detected);

  // 3. Explicit local URL baked into the build (standalone fallback)
  if (explicit && explicit.trim()) return stripTrailingSlash(explicit.trim());

  // 4. Default fallback
  return UNRESOLVED_BASE_URL;
}

export const API_BASE_URL = computeBase();

if (__DEV__) {
  console.log('[API] Initial base URL:', API_BASE_URL);
}

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Bypass-Tunnel-Reminder': 'true',
  },
});

// ─── Dynamic URL helpers ──────────────────────────────────────────────────────

/**
 * Resolve the API base URL without network I/O.
 * The live Metro host wins in development because it always reflects the PC's
 * current IP, whereas a persisted URL can outlive the network it came from.
 */
export async function getEffectiveApiBaseUrl(): Promise<string> {
  try {
    const liveHost = metroHost();
    if (liveHost) {
      const autoUrl = toBaseUrl(liveHost);
      api.defaults.baseURL = autoUrl;
      return autoUrl;
    }

    const lastGood = await getLastGoodBase();
    if (lastGood) {
      api.defaults.baseURL = lastGood;
      return lastGood;
    }

    if (explicit && explicit.trim()) {
      const url = stripTrailingSlash(explicit.trim());
      api.defaults.baseURL = url;
      return url;
    }
  } catch (e) {}

  const fallback = computeBase();
  api.defaults.baseURL = fallback;
  return fallback;
}

let discoveryInFlight: Promise<string | null> | null = null;

/**
 * Guarantee a reachable backend URL before making a request.
 * Uses the cached last-known-good URL when it still responds; otherwise runs a
 * full automatic discovery (Metro host + Wi-Fi subnet scan) and caches the result.
 * This is what makes manual server configuration unnecessary.
 */
export async function ensureApiReachable(
  opts: { force?: boolean; onProgress?: (message: string) => void } = {}
): Promise<string> {
  const { force = false, onProgress } = opts;

  if (!force) {
    const cached = await getLastGoodBase();
    if (cached && (await probeHealth(cached, 2500))) {
      api.defaults.baseURL = cached;
      return cached;
    }
    if (cached) await clearLastGoodBase();

    const current = await getEffectiveApiBaseUrl();
    if (await probeHealth(current, 2500)) {
      await setLastGoodBase(current);
      api.defaults.baseURL = current;
      return current;
    }
  }

  if (!discoveryInFlight) {
    discoveryInFlight = discoverBackend({ onProgress }).finally(() => {
      discoveryInFlight = null;
    });
  }

  const found = await discoveryInFlight;
  if (found) {
    api.defaults.baseURL = found;
    return found;
  }

  return getEffectiveApiBaseUrl();
}

// Request interceptor to add auth token and dynamically attach freshest base URL
api.interceptors.request.use(
  async (config) => {
    try {
      const targetBase = await getEffectiveApiBaseUrl();
      config.baseURL = targetBase;
    } catch (e) {}

    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors and self-heal network errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Self-healing: on a network failure, re-discover the backend once and retry.
    const originalRequest = error.config;
    const isNetworkError =
      error.code === 'ERR_NETWORK' ||
      error.message?.includes('Network Error') ||
      error.message?.includes('timeout') ||
      !error.response;

    if (originalRequest && !originalRequest._retried && isNetworkError) {
      originalRequest._retried = true;
      try {
        console.log('[API] Network error – auto-discovering backend...');
        const healedUrl = await ensureApiReachable({ force: true });
        if (healedUrl && healedUrl !== originalRequest.baseURL) {
          console.log(`[API] Self-healing retry → ${healedUrl}`);
          originalRequest.baseURL = healedUrl;
          api.defaults.baseURL = healedUrl;
          return api(originalRequest);
        }
      } catch (e) {
        console.warn('[API] Auto-discovery failed:', e);
      }
    }
    if (error.response?.status === 401) {
      // Clear auth state
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('user');
      
      // Use Expo Router to redirect to login
      const { router } = require('expo-router');
      router.replace('/login');
      
      // Return a resolved promise to prevent error propagation
      return Promise.resolve({ data: null });
    }
    
    // Enhanced error logging
    const errorInfo = {
      message: error.message,
      url: error.config?.baseURL + (error.config?.url || ''),
      code: error.code,
      method: error.config?.method,
      platform: Platform.OS,
      status: error.response?.status,
      statusText: error.response?.statusText,
      responseData: error.response?.data,
      headers: error.config?.headers
    };
    
    console.error('[API Error Details]', JSON.stringify(errorInfo, null, 2));
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    try {
      console.log('[Auth] Attempting login with:', { email });
      console.log('[Auth] API URL:', api.defaults.baseURL);
      
      const response = await api.post('/auth/login', { email, password });
      console.log('[Auth] Login response:', {
        status: response.status,
        data: response.data,
        headers: response.headers
      });
      
      return response.data;
    } catch (error: any) {
      console.error('[Auth] Login error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: api.defaults.baseURL + '/auth/login'
      });
      throw error;
    }
  },
  
  register: async (userData: { name: string; email: string; password: string; role?: string }) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
  
  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  verifyEmail: async (data: { email: string; code: string }) => {
    const response = await api.post('/auth/verify-email', data);
    return response.data;
  },

  resendVerification: async (email: string) => {
    const response = await api.post('/auth/resend-verification', { email });
    return response.data;
  },

  forgotPassword: async (email: string) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (data: { email: string; code: string; password: string }) => {
    const response = await api.post('/auth/reset-password', data);
    return response.data;
  }
};

// Assets API
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export const assetsAPI = {
  getAll: async () => {
    const response = await api.get('/assets');
    return response.data;
  },
  
  getById: async (id: string) => {
    const response = await api.get(`/assets/${id}`);
    return response.data;
  },
  
  create: async (assetData: any) => {
    const response = await api.post('/assets', assetData);
    return response.data;
  },
  
  update: async (id: string, assetData: any) => {
    const response = await api.put(`/assets/${id}`, assetData);
    return response.data;
  },
  
  delete: async (id: string) => {
    const response = await api.delete(`/assets/${id}`);
    return response.data;
  },
  
  generateQRCode: async (id: string) => {
    const response = await api.get(`/assets/${id}/qr-code`);
    return response.data;
  },
  
  downloadQrPng: async (id: string, size = 300): Promise<{ uri: string; filename: string }> => {
    const response = await api.get(`/assets/${id}/qr`, {
      responseType: 'arraybuffer',
      params: { size },
    });
    const base64 = arrayBufferToBase64(response.data);
    const uri = `data:image/png;base64,${base64}`;
    return { uri, filename: `asset-${id}.png` };
  },
  downloadQrPdf: async (id: string, size = 300, copies = 1): Promise<{ uri: string; filename: string }> => {
    const response = await api.get(`/assets/${id}/qr`, {
      responseType: 'arraybuffer',
      params: { size, format: 'pdf', copies },
    });
    const base64 = arrayBufferToBase64(response.data);
    const uri = `data:application/pdf;base64,${base64}`;
    return { uri, filename: `asset-${id}.pdf` };
  },
  downloadAllQrPdf: async (size = 300): Promise<{ uri: string; filename: string }> => {
  const response = await api.get('/assets/all/qr-pdf', {
    responseType: 'arraybuffer',
    params: { size },
  });
  const base64 = arrayBufferToBase64(response.data);
  const uri = `data:application/pdf;base64,${base64}`;
  return { uri, filename: 'all-assets-qr.pdf' };
},
  getMovementHistory: async (id: string, params?: { startDate?: string; endDate?: string; page?: number; limit?: number }) => {
    const response = await api.get(`/assets/${id}/movement-history`, { params });
    return response.data;
  },
};

// Rooms API
export const roomsAPI = {
  getAll: async () => {
    const response = await api.get('/rooms');
    return response.data;
  },
  
  getById: async (id: string) => {
    const response = await api.get(`/rooms/${id}`);
    return response.data;
  },
  
  checkCodeExists: async (code: string) => {
    try {
      const response = await api.get('/rooms');
      const rooms = response.data;
      return rooms.some((room: any) => room.code.toLowerCase() === code.toLowerCase());
    } catch (error) {
      console.error('Error checking room code:', error);
      return false; // If we can't check, assume it doesn't exist
    }
  },

  create: async (roomData: any) => {
    const response = await api.post('/rooms', roomData);
    return response.data;
  },
  
  update: async (id: string, roomData: any) => {
    const response = await api.put(`/rooms/${id}`, roomData);
    return response.data;
  },
  
  delete: async (id: string) => {
    const response = await api.delete(`/rooms/${id}`);
    return response.data;
  },
  
  getAssets: async (id: string) => {
    const response = await api.get(`/rooms/${id}/assets`);
    return response.data;
  },

  generateQRCode: async (id: string) => {
    const response = await api.get(`/rooms/${id}/qr-code`);
    return response.data;
  },
  
  scan: async (id: string, scanData: any) => {
    const response = await api.post(`/rooms/${id}/scan`, scanData);
    return response.data;
  }
};

// QR Code Resolution API
export const qrAPI = {
  resolve: async (qrData: string, location?: any, deviceInfo?: any, action?: string) => {
    const response = await api.post('/resolve', {
      qrData,
      location,
      deviceInfo,
      action
    });
    return response.data;
  },
  
  getScanHistory: async (page = 1, limit = 20, type?: string) => {
    const response = await api.get('/resolve/scan-history', {
      params: { page, limit, type }
    });
    return response.data;
  },
  
  getScanStats: async () => {
    const response = await api.get('/resolve/scan-stats');
    return response.data;
  }
};

// Maintenance Operations API
export const maintenanceAPI = {
  getByAssetId: async (assetId: string) => {
    const response = await api.get(`/maintenance/asset/${assetId}`);
    return response.data;
  },
  schedule: async (data: any) => {
    const response = await api.post('/maintenance', data);
    return response.data;
  },
  updateStatus: async (id: string, data: any) => {
    const response = await api.patch(`/maintenance/${id}/status`, data);
    return response.data;
  },
  reschedule: async (id: string, data: any) => {
    const response = await api.put(`/maintenance/${id}/reschedule`, data);
    return response.data;
  },
};

// System Notifications API
export const notificationsAPI = {
  getAll: async (params?: { page?: number; limit?: number; status?: string; category?: string; priority?: string; search?: string }) => {
    const response = await api.get('/notifications', { params });
    return response.data;
  },
  getStats: async () => {
    const response = await api.get('/notifications/stats');
    return response.data;
  },
  getActive: async (limit = 10) => {
    const response = await api.get('/notifications/active', { params: { limit } });
    return response.data;
  },
  resolve: async (id: string, resolutionNotes?: string) => {
    const response = await api.patch(`/notifications/${id}/resolve`, { resolutionNotes });
    return response.data;
  },
  acknowledge: async (id: string, notes?: string) => {
    const response = await api.patch(`/notifications/${id}/acknowledge`, { notes });
    return response.data;
  },
  simulateMovementAlert: async (data?: { assetTag?: string; assetName?: string; locationName?: string; severity?: string }) => {
    const response = await api.post('/notifications/simulate-movement-alert', data);
    return response.data;
  },
  dismiss: async (id: string) => {
    const response = await api.patch(`/notifications/${id}/dismiss`);
    return response.data;
  },
  markRead: async (id: string) => {
    const response = await api.patch(`/notifications/${id}/read`);
    return response.data;
  },
  markAllRead: async () => {
    const response = await api.post('/notifications/mark-all-read');
    return response.data;
  },
  getSettings: async () => {
    const response = await api.get('/notifications/settings');
    return response.data;
  },
  updateSettings: async (settings: any) => {
    const response = await api.put('/notifications/settings', settings);
    return response.data;
  },
};

// Issues API (FR25 - Asset Issue Reporting)
export const issuesAPI = {
  reportIssue: async (data: {
    assetId?: string;
    assetTag?: string;
    title?: string;
    description: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    imageUrl?: string;
  }) => {
    const response = await api.post('/issues', data);
    return response.data;
  },
  getMyIssues: async (params?: { status?: string; search?: string }) => {
    const response = await api.get('/issues/my-issues', { params });
    return response.data;
  },
  getAll: async (params?: { status?: string; priority?: string; search?: string; page?: number; limit?: number }) => {
    const response = await api.get('/issues', { params });
    return response.data;
  },
  getByAssetId: async (assetId: string) => {
    const response = await api.get(`/issues/asset/${assetId}`);
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/issues/${id}`);
    return response.data;
  },
  updateStatus: async (id: string, data: { status: string; resolutionNotes?: string; assignedTo?: string }) => {
    const response = await api.patch(`/issues/${id}/status`, data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/issues/${id}`);
    return response.data;
  },
};

export default api;
