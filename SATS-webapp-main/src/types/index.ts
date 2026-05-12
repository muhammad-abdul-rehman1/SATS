// User Types
export interface User {
  _id: string;
  id?: string;
  name: string;
  email: string;
  role: 'USER' | 'SUPER_ADMIN';
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Asset Types
export interface Asset {
  _id: string;
  assetTag: string;
  name: string;
  description?: string;
  assetType: 'EQUIPMENT' | 'FURNITURE' | 'ELECTRONICS' | 'VEHICLE' | 'OTHER';
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'RETIRED';
  ownerId?: string | Pick<User, '_id' | 'name' | 'email'>;
  roomId?: string | Pick<Room, '_id' | 'name' | 'code' | 'building' | 'floor' | 'latitude' | 'longitude'>;
  qrCode?: string;
  scanCount: number;
  lastScanned?: string;
  createdAt: string;
  updatedAt: string;
}

// Room Types
export interface Room {
  _id: string;
  code: string;
  name: string;
  building?: string;
  floor?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  roomType?: 'OFFICE' | 'MEETING_ROOM' | 'STORAGE' | 'LAB' | 'OTHER';
  capacity?: number;
  scanCount: number;
  lastScanned?: string;
  createdAt: string;
  updatedAt: string;
}

// Scan Log Types
export interface ScanLog {
  _id: string;
  qrData: string;
  qrType: 'ASSET' | 'ROOM' | 'LOCATION';
  scannedBy: string;
  scannedAt: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  deviceInfo?: string;
  action?: 'VIEW' | 'UPDATE' | 'MOVE' | 'MAINTENANCE';
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// Dashboard Stats
export interface DashboardStats {
  totalAssets: number;
  totalRooms: number;
  totalUsers: number;
  activeAssets: number;
  recentScans: ScanLog[];
  assetsByType: Record<string, number>;
  assetsByStatus: Record<string, number>;
}

// Filter Types
export interface AssetFilters {
  search?: string;
  type?: string;
  status?: string;
  roomId?: string;
  page?: number;
  limit?: number;
}

export interface UserFilters {
  search?: string;
  role?: string;
  page?: number;
  limit?: number;
}
