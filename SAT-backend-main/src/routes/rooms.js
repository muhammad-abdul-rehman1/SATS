import express from 'express';
import Room from '../models/Room.js';
import Asset from '../models/Asset.js';
import ScanLog from '../models/ScanLog.js';
import { isAuthenticated } from '../middleware/auth.js';
import { generateQRCodeForRoom } from '../utils/qrcode-proxy.js';

const router = express.Router();

// Get all rooms with filtering
router.get('/', isAuthenticated, async (req, res) => {
  try {
    let query = {};
    const { search } = req.query;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { building: { $regex: search, $options: 'i' } }
      ];
    }

    const rooms = await Room.find(query).sort({ building: 1, floor: 1, name: 1 });
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching rooms', error: error.message });
  }
});

// Get single room
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.json(room);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching room', error: error.message });
  }
});

// Create new room (Super Admin only)
router.post('/', isAuthenticated, async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Only super admins can create rooms' });
    }
    
    const roomData = req.body;
    
    // Generate QR code data
    const qrData = JSON.stringify({
      type: 'ROOM',
      id: 'temp', // Will be updated after creation
      code: roomData.code,
      timestamp: new Date().toISOString()
    });
    
    const room = await Room.create({
      ...roomData,
      qrCode: qrData
    });
    
    // Update QR code with actual room ID
    room.qrCode = JSON.stringify({
      type: 'ROOM',
      id: room._id,
      code: room.code,
      timestamp: new Date().toISOString()
    });
    await room.save();
    
    res.status(201).json(room);
  } catch (error) {
    res.status(500).json({ message: 'Error creating room', error: error.message });
  }
});

// Update room (Super Admin only)
router.put('/:id', isAuthenticated, async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Only super admins can update rooms' });
    }
    
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    
    Object.assign(room, req.body);
    await room.save();
    
    res.json(room);
  } catch (error) {
    res.status(500).json({ message: 'Error updating room', error: error.message });
  }
});

// Delete room (Super Admin only)
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Only super admins can delete rooms' });
    }
    
    await Room.findByIdAndDelete(req.params.id);
    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting room', error: error.message });
  }
});

// Get assets belonging to a room
router.get('/:id/assets', isAuthenticated, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });

    let query = { roomId: req.params.id };
    if (req.user.role !== 'SUPER_ADMIN') {
      query.ownerId = req.user._id;
    }

    const assets = await Asset.find(query)
      .populate('ownerId', 'name email')
      .sort({ name: 1 });
    res.json(assets);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching room assets', error: error.message });
  }
});

// Generate QR code for room (FR14-01, FR14-02)
router.get('/:id/qr-code', isAuthenticated, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    
    const qrStyle = {
      color: req.query.color || room.qrStyle?.color || '#0066CC',
      backgroundColor: req.query.backgroundColor || room.qrStyle?.backgroundColor || '#FFFFFF',
      size: parseInt(req.query.size) || room.qrStyle?.size || 200
    };

    const qrCodeDataURL = await generateQRCodeForRoom(room._id, room.code, qrStyle);
    res.json({ qrCode: qrCodeDataURL, qrStyle });
  } catch (error) {
    res.status(500).json({ message: 'Error generating QR code', error: error.message });
  }
});

// Scan room QR code
router.post('/:id/scan', isAuthenticated, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    
    // Log the scan
    const scanLog = await ScanLog.create({
      qrData: room.qrCode,
      qrType: 'ROOM',
      scannedBy: req.user._id,
      location: req.body.location,
      deviceInfo: req.body.deviceInfo,
      action: req.body.action || 'VIEW',
      metadata: req.body.metadata
    });
    
    // Update room scan statistics
    room.scanCount += 1;
    room.lastScanned = new Date();
    await room.save();
    
    res.json({
      room,
      scanLog,
      message: 'Room scanned successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error scanning room', error: error.message });
  }
});

export default router;
