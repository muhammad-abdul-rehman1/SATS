import mongoose from 'mongoose';

const issueSchema = new mongoose.Schema({
  assetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset',
    required: true,
    index: true,
  },
  assetTag: {
    type: String,
    required: true,
    index: true,
  },
  assetName: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM',
    index: true,
  },
  status: {
    type: String,
    enum: ['OPEN', 'UNDER_REVIEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
    default: 'OPEN',
    index: true,
  },
  imageUrl: {
    type: String,
    default: null,
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  reportedByName: {
    type: String,
    default: '',
  },
  reportedByEmail: {
    type: String,
    default: '',
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  resolutionNotes: {
    type: String,
    default: '',
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
}, {
  timestamps: true,
});

issueSchema.index({ reportedBy: 1, createdAt: -1 });
issueSchema.index({ status: 1, priority: 1, createdAt: -1 });

export default mongoose.model('Issue', issueSchema);
