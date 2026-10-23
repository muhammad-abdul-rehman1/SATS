import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  code: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  building: String,
  floor: String,
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  description: String,
  // Make qrCode sparse so multiple new rooms without an assigned QR don't violate unique index
  qrCode: { type: String, unique: true, sparse: true },
  nfcTagId: { type: String, sparse: true },
  qrStyle: {
    type: { type: String, enum: ['ASSET', 'ROOM', 'LOCATION'], default: 'ROOM' },
    color: { type: String, default: '#0066CC' },
    backgroundColor: { type: String, default: '#FFFFFF' },
    size: { type: Number, default: 200 }
  },
  capacity: Number,
  roomType: { type: String, enum: ['OFFICE', 'MEETING_ROOM', 'STORAGE', 'LAB', 'OTHER'], default: 'OFFICE' },
  lastScanned: Date,
  scanCount: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('Room', roomSchema);
