import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['INFO', 'WARNING', 'ERROR', 'CRITICAL', 'MAINTENANCE', 'SECURITY', 'SYSTEM'],
      default: 'INFO',
    },
    category: {
      type: String,
      enum: ['ASSET', 'MAINTENANCE', 'SECURITY', 'USER', 'SYSTEM'],
      default: 'SYSTEM',
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'RESOLVED', 'DISMISSED'],
      default: 'ACTIVE',
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolutionNotes: {
      type: String,
      default: '',
    },
    isAcknowledged: {
      type: Boolean,
      default: false,
    },
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    acknowledgedAt: {
      type: Date,
      default: null,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null means broadcast to all administrators
    },
    targetType: {
      type: String,
      enum: ['ASSET', 'ROOM', 'MAINTENANCE', 'USER', 'SYSTEM'],
      default: 'SYSTEM',
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    metadata: {
      type: Object,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ status: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ category: 1, priority: 1 });
notificationSchema.index({ targetId: 1 });

export default mongoose.model('Notification', notificationSchema);
