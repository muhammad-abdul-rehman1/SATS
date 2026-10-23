// User Types
export interface User {
  _id: string;
  id?: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  isActive?: boolean;
  isEmailVerified?: boolean;
  permissions?: string[];
  twoFactorEnabled?: boolean;
  lastLoginAt?: string;
  lastLoginIp?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user?: User;
  token?: string;
  require2FA?: boolean;
  tempToken?: string;
  email?: string;
  message?: string;
  isLocked?: boolean;
  remainingMinutes?: number;
}

export interface AuditLogEntry {
  _id: string;
  userId?: string;
  email?: string;
  userName?: string;
  role?: string;
  action: string;
  ipAddress: string;
  userAgent: string;
  status: 'SUCCESS' | 'FAILURE' | 'WARNING';
  details?: string;
  createdAt: string;
}

// Asset Types
export interface Asset {
  _id: string;
  assetTag: string;
  name: string;
  description?: string;
  assetType: 'EQUIPMENT' | 'FURNITURE' | 'ELECTRONICS' | 'VEHICLE' | 'OTHER';
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'RETIRED';
  department?: string;
  imageUrl?: string;
  purchaseDate?: string | Date;
  assetValue?: number;
  ownerId?: string | Pick<User, '_id' | 'name' | 'email'>;
  roomId?: string | Pick<Room, '_id' | 'name' | 'code' | 'building' | 'floor' | 'latitude' | 'longitude'>;
  qrCode?: string;
  qrStyle?: {
    color?: string;
    backgroundColor?: string;
    size?: number;
  };
  customFields?: Record<string, any>;
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
  department?: string;
  roomId?: string;
  page?: number;
  limit?: number;
}

export interface BulkUpdateAssetPayload {
  assetIds: string[];
  updates: {
    status?: string;
    department?: string;
    roomId?: string | null;
    ownerId?: string | null;
    assetType?: string;
  };
}

export interface UserFilters {
  search?: string;
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
}

// Maintenance Types (FR11)
export interface MaintenanceSchedule {
  _id: string;
  assetId: Asset;
  title: string;
  description?: string;
  scheduledDate: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  assignedTo?: User | null;
  createdBy?: User | null;
  notes?: string;
  completedAt?: string | null;
  completedBy?: User | null;
  reminderSent?: boolean;
  rescheduledCount?: number;
  previousDates?: Array<{
    date: string;
    rescheduledAt: string;
    reason?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceStats {
  total: number;
  scheduled: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

export interface MaintenanceFilters {
  search?: string;
  status?: string;
  priority?: string;
  assetId?: string;
  page?: number;
  limit?: number;
}

// System Notifications & Settings Types
export interface SystemNotification {
  _id: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL' | 'MAINTENANCE' | 'SECURITY' | 'SYSTEM';
  category: 'ASSET' | 'MAINTENANCE' | 'SECURITY' | 'USER' | 'SYSTEM';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'ACTIVE' | 'RESOLVED' | 'DISMISSED';
  resolvedBy?: User | null;
  resolvedAt?: string | null;
  resolutionNotes?: string;
  isAcknowledged?: boolean;
  acknowledgedBy?: User | null;
  acknowledgedAt?: string | null;
  recipient?: User | null;
  targetType?: string;
  targetId?: string | null;
  metadata?: Record<string, any>;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationSetting {
  _id?: string;
  scope: 'GLOBAL' | 'USER';
  userId?: string | null;
  emailNotifications: boolean;
  inAppAlerts: boolean;
  maintenanceReminders: boolean;
  securityAlerts: boolean;
  assetStatusAlerts: boolean;
  assetMovementAlerts: boolean;
  notificationFrequency: 'REALTIME' | 'HOURLY' | 'DAILY' | 'WEEKLY';
  digestTime: string;
  minSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  updatedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface NotificationStats {
  total: number;
  active: number;
  resolved: number;
  dismissed: number;
  critical: number;
  unread: number;
}

export interface NotificationFilters {
  search?: string;
  status?: string;
  priority?: string;
  category?: string;
  page?: number;
  limit?: number;
}

// Asset Movement History Types
export interface AssetMovement {
  _id: string;
  assetId: string | { _id: string; assetTag: string; name: string };
  assetTag: string;
  assetName: string;
  fromRoomId?: string | { _id: string; name: string; code: string; building?: string; floor?: string };
  fromRoomName: string;
  toRoomId?: string | { _id: string; name: string; code: string; building?: string; floor?: string };
  toRoomName: string;
  fromDepartment?: string;
  toDepartment?: string;
  movedBy?: string | { _id: string; name: string; email: string };
  movedByName: string;
  movedByEmail?: string;
  movedAt: string;
  source: 'MANUAL_UPDATE' | 'TRANSFER' | 'QR_SCAN' | 'ROOM_ASSIGNMENT' | 'SYSTEM';
  reason: string;
  notes?: string;
  coordinates?: {
    latitude?: number;
    longitude?: number;
    accuracy?: number;
  };
}

// Asset Issue Reporting Types (FR25)
export interface AssetIssue {
  _id: string;
  assetId: {
    _id: string;
    name: string;
    assetTag: string;
    assetType?: string;
    status?: string;
    imageUrl?: string;
    roomId?: {
      _id: string;
      name: string;
      code: string;
    };
  } | string;
  assetTag: string;
  assetName: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'UNDER_REVIEW' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  imageUrl?: string | null;
  reportedBy?: {
    _id: string;
    name: string;
    email: string;
    role?: string;
  };
  reportedByName?: string;
  reportedByEmail?: string;
  assignedTo?: {
    _id: string;
    name: string;
    email: string;
    role?: string;
  } | null;
  resolutionNotes?: string;
  resolvedBy?: {
    _id: string;
    name: string;
    email: string;
  } | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

