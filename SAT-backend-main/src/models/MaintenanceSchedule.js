import mongoose from 'mongoose';

const maintenanceScheduleSchema = new mongoose.Schema({
  assetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset',
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  scheduledDate: {
    type: Date,
    required: true,
    index: true,
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM',
  },
  status: {
    type: String,
    enum: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
    default: 'SCHEDULED',
    index: true,
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  notes: {
    type: String,
    default: '',
  },
  completedAt: {
    type: Date,
    default: null,
  },
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  reminderSent: {
    type: Boolean,
    default: false,
  },
  rescheduledCount: {
    type: Number,
    default: 0,
  },
  previousDates: [{
    date: { type: Date, required: true },
    rescheduledAt: { type: Date, default: Date.now },
    reason: { type: String, default: '' },
    rescheduledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
}, {
  timestamps: true,
});

maintenanceScheduleSchema.index({ assetId: 1, scheduledDate: -1 });
maintenanceScheduleSchema.index({ status: 1, scheduledDate: 1 });

export default mongoose.model('MaintenanceSchedule', maintenanceScheduleSchema);
