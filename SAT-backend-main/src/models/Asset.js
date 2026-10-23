import mongoose from 'mongoose';

const assetSchema = new mongoose.Schema({
  assetTag: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  description: String,
  assetType: { type: String, enum: ['EQUIPMENT', 'FURNITURE', 'ELECTRONICS', 'VEHICLE', 'OTHER'], default: 'EQUIPMENT' },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'RETIRED'], default: 'ACTIVE' },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  // qrCode: unique but allow multiple docs without it (sparse avoids null duplicate errors during seed before assignment)
  qrCode: { type: String, unique: true, sparse: true },
  nfcTagId: { type: String, sparse: true },
  qrStyle: {
    type: { type: String, enum: ['ASSET', 'ROOM', 'LOCATION'], default: 'ASSET' },
    color: { type: String, default: '#000000' },
    backgroundColor: { type: String, default: '#FFFFFF' },
    size: { type: Number, default: 200 }
  },
  department: { type: String, trim: true, default: '' },
  imageUrl: { type: String, default: null },
  purchaseDate: { type: Date, default: null },
  assetValue: { type: Number, default: 0 },
  customFields: Object,
  lastScanned: Date,
  scanCount: { type: Number, default: 0 }
}, { timestamps: true });

assetSchema.index({ department: 1 });

export default mongoose.model('Asset', assetSchema);
