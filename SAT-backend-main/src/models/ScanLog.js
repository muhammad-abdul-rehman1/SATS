import mongoose from 'mongoose';

const scanLogSchema = new mongoose.Schema({
  qrData: { type: String, required: true },
  qrType: { type: String, enum: ['ASSET', 'ROOM', 'LOCATION'], required: true },
  scannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scannedAt: { type: Date, default: Date.now },
  location: {
    latitude: Number,
    longitude: Number,
    accuracy: Number
  },
  deviceInfo: {
    platform: String,
    version: String,
    model: String
  },
  action: { type: String, enum: ['VIEW', 'UPDATE', 'MOVE', 'MAINTENANCE'], default: 'VIEW' },
  metadata: Object,
  // Legacy fields for backward compatibility
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  payload: String,
  resolvedEntity: String,
  entityId: String,
  coords: Object,
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('ScanLog', scanLogSchema);
