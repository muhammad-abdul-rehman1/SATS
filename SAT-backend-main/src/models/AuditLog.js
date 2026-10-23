import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  email: { type: String, default: null },
  userName: { type: String, default: null },
  role: { type: String, default: null },
  targetType: {
    type: String,
    enum: ['AUTH', 'USER', 'ASSET', 'ROOM', 'MAINTENANCE', 'NOTIFICATION'],
    default: 'AUTH'
  },
  targetId: { type: mongoose.Schema.Types.ObjectId, default: null },
  action: {
    type: String,
    enum: [
      'LOGIN_SUCCESS',
      'LOGIN_FAILED',
      'ACCOUNT_LOCKED',
      '2FA_CHALLENGE',
      '2FA_SUCCESS',
      '2FA_FAILED',
      'PASSWORD_RESET',
      'LOGOUT',
      'ASSET_CREATED',
      'ASSET_UPDATED',
      'ASSET_DELETED',
      'ASSET_DEACTIVATED',
      'ASSET_ASSIGNED',
      'ASSET_TRANSFERRED',
      'ASSET_BULK_UPDATED',
      'ASSET_BULK_DELETED',
      'ASSET_STATUS_ALERT',
      'MAINTENANCE_SCHEDULED',
      'MAINTENANCE_RESCHEDULED',
      'MAINTENANCE_COMPLETED',
      'MAINTENANCE_CANCELLED',
      'ALERT_RESOLVED',
      'ALERT_DISMISSED',
      'NOTIFICATION_SETTINGS_UPDATED',
      'NOTIFICATION_BROADCAST'
    ],
    required: true
  },
  ipAddress: { type: String, default: 'Unknown' },
  userAgent: { type: String, default: 'Unknown' },
  status: { type: String, enum: ['SUCCESS', 'FAILURE', 'WARNING'], default: 'SUCCESS' },
  details: { type: String, default: '' },
  metadata: { type: Object, default: {} }
}, { timestamps: true });

auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ email: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ targetId: 1, createdAt: -1 });

export default mongoose.model('AuditLog', auditLogSchema);
