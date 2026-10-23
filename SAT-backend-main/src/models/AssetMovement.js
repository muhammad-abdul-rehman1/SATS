import mongoose from 'mongoose';

const assetMovementSchema = new mongoose.Schema({
  assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true, index: true },
  assetTag: { type: String, required: true, index: true },
  assetName: { type: String, required: true },
  fromRoomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', default: null },
  fromRoomName: { type: String, default: 'Unassigned' },
  toRoomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', default: null },
  toRoomName: { type: String, default: 'Unassigned' },
  fromDepartment: { type: String, default: '' },
  toDepartment: { type: String, default: '' },
  movedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  movedByName: { type: String, default: 'System' },
  movedByEmail: { type: String, default: '' },
  movedAt: { type: Date, default: Date.now, index: true },
  source: {
    type: String,
    enum: ['MANUAL_UPDATE', 'TRANSFER', 'QR_SCAN', 'NFC_SCAN', 'ROOM_ASSIGNMENT', 'SYSTEM'],
    default: 'MANUAL_UPDATE'
  },
  reason: { type: String, default: 'Location update' },
  notes: { type: String, default: '' },
  coordinates: {
    latitude: { type: Number },
    longitude: { type: Number },
    accuracy: { type: Number }
  }
}, { timestamps: true });

assetMovementSchema.index({ assetId: 1, movedAt: -1 });
assetMovementSchema.index({ assetTag: 1, movedAt: -1 });
assetMovementSchema.index({ movedAt: -1 });

export default mongoose.model('AssetMovement', assetMovementSchema);
