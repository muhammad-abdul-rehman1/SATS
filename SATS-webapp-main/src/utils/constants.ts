// Constants
export const ASSET_TYPES = ['EQUIPMENT', 'FURNITURE', 'ELECTRONICS', 'VEHICLE', 'OTHER'];
export const ASSET_STATUSES = ['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'RETIRED'];
export const USER_ROLES = ['USER', 'ADMIN', 'SUPER_ADMIN'];
export const AVAILABLE_PERMISSIONS: { id: string; label: string; description: string }[] = [
  { id: 'manage_assets', label: 'Manage Assets', description: 'Create, edit, transfer, and delete assets' },
  { id: 'manage_rooms', label: 'Manage Rooms', description: 'Create and edit rooms and location maps' },
  { id: 'manage_users', label: 'Manage Users', description: 'Manage user accounts, roles, and status' },
  { id: 'view_reports', label: 'View Reports', description: 'Generate and export asset and audit reports' },
  { id: 'manage_maintenance', label: 'Manage Maintenance', description: 'Schedule and track asset maintenance tasks' },
];
export const ROOM_TYPES = ['OFFICE', 'MEETING_ROOM', 'STORAGE', 'LAB', 'OTHER'];

export const DEPARTMENTS = [
  'Computer Science',
  'Electrical Engineering',
  'IT Lab',
  'Architecture & Design',
  'Management Sciences',
  'Administration',
  'Library',
  'Research & Development',
  'General',
];

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
