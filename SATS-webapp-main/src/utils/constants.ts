// Constants
export const ASSET_TYPES = ['EQUIPMENT', 'FURNITURE', 'ELECTRONICS', 'VEHICLE', 'OTHER'];
export const ASSET_STATUSES = ['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'RETIRED'];
export const USER_ROLES = ['USER', 'SUPER_ADMIN'];
export const ROOM_TYPES = ['OFFICE', 'MEETING_ROOM', 'STORAGE', 'LAB', 'OTHER'];

export const ASSET_TYPE_COLORS: Record<string, string> = {
  EQUIPMENT: '#1976d2',
  FURNITURE: '#dc004e',
  ELECTRONICS: '#ff9800',
  VEHICLE: '#4caf50',
  OTHER: '#9c27b0',
};

export const ASSET_STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#4caf50',
  INACTIVE: '#9e9e9e',
  MAINTENANCE: '#ff9800',
  RETIRED: '#f44336',
};

export const PAGINATION_LIMIT = 10;
export const DEFAULT_PAGE = 1;
