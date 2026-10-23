import mongoose from 'mongoose';

const notificationSettingSchema = new mongoose.Schema(
  {
    scope: {
      type: String,
      enum: ['GLOBAL', 'USER'],
      default: 'GLOBAL',
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    emailNotifications: {
      type: Boolean,
      default: true,
    },
    inAppAlerts: {
      type: Boolean,
      default: true,
    },
    maintenanceReminders: {
      type: Boolean,
      default: true,
    },
    securityAlerts: {
      type: Boolean,
      default: true,
    },
    assetStatusAlerts: {
      type: Boolean,
      default: true,
    },
    assetMovementAlerts: {
      type: Boolean,
      default: true,
    },
    notificationFrequency: {
      type: String,
      enum: ['REALTIME', 'HOURLY', 'DAILY', 'WEEKLY'],
      default: 'REALTIME',
    },
    digestTime: {
      type: String,
      default: '09:00',
    },
    minSeverity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'LOW',
    },
    quietHoursEnabled: {
      type: Boolean,
      default: false,
    },
    quietHoursStart: {
      type: String,
      default: '22:00',
    },
    quietHoursEnd: {
      type: String,
      default: '07:00',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model('NotificationSetting', notificationSettingSchema);
