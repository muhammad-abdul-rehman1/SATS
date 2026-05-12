import express from 'express';
import Asset from '../models/Asset.js';
import Room from '../models/Room.js';
import ScanLog from '../models/ScanLog.js';
import { isAuthenticated } from '../middleware/auth.js';

const router = express.Router();

// Legacy endpoint for backward compatibility
router.get('/', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ message: 'No token' });
  const parts = token.split('|');
  if (parts.length < 4) return res.status(400).json({ message: 'Invalid' });
  const type = parts[2];
  const id = parts[3];
  if (type === 'A') {
    const asset = await Asset.findOne({ assetTag: id });
    return res.json({ type: 'Asset', entity: asset });
  } else if (type === 'R') {
    const room = await Room.findOne({ code: id });
    return res.json({ type: 'Room', entity: room });
  }
  return res.json({ type: 'Unknown' });
});

// Resolve QR code data to entity
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const { qrData, location, deviceInfo, action } = req.body;
    
    if (!qrData) {
      return res.status(400).json({ message: 'QR data is required' });
    }
    
    let parsed;
    try {
      parsed = JSON.parse(qrData);
    } catch (error) {
      return res.status(400).json({ message: 'Invalid QR code format' });
    }
    
    let entity = null;
    let entityType = null;
    
    if (parsed.type === 'ASSET') {
      entity = await Asset.findById(parsed.id)
        .populate('ownerId', 'name email')
        .populate('roomId', 'name code building floor latitude longitude');
      entityType = 'asset';
    } else if (parsed.type === 'ROOM') {
      entity = await Room.findById(parsed.id);
      entityType = 'room';
    } else if (parsed.type === 'LOCATION') {
      // Handle location QR codes (could be buildings, floors, etc.)
      entity = { id: parsed.id, name: parsed.name, type: 'location' };
      entityType = 'location';
    }
    
    if (!entity) {
      return res.status(404).json({ message: 'Entity not found' });
    }
    
    // Check permissions for assets
    if (entityType === 'asset' && req.user.role !== 'SUPER_ADMIN') {
      if (String(entity.ownerId?._id) !== String(req.user._id)) {
        return res.status(403).json({ message: 'Access denied to this asset' });
      }
    }
    
    // Log the scan
    const scanLog = await ScanLog.create({
      qrData,
      qrType: parsed.type,
      scannedBy: req.user._id,
      location,
      deviceInfo,
      action: action || 'VIEW',
      metadata: { entityType, entityId: entity._id || entity.id }
    });
    
    // Update entity scan statistics
    if (entityType === 'asset' && entity.scanCount !== undefined) {
      entity.scanCount += 1;
      entity.lastScanned = new Date();
      await entity.save();
    } else if (entityType === 'room' && entity.scanCount !== undefined) {
      entity.scanCount += 1;
      entity.lastScanned = new Date();
      await entity.save();
    }
    
    res.json({
      entity,
      entityType,
      scanLog,
      message: `${entityType} resolved successfully`
    });
  } catch (error) {
    res.status(500).json({ message: 'Error resolving QR code', error: error.message });
  }
});

// Get scan history for user
router.get('/scan-history', isAuthenticated, async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const skip = (page - 1) * limit;
    
    let query = { scannedBy: req.user._id };
    if (type) {
      query.qrType = type;
    }
    
    const scanLogs = await ScanLog.find(query)
      .sort({ scannedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('scannedBy', 'name email');
    
    const total = await ScanLog.countDocuments(query);
    
    res.json({
      scanLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching scan history', error: error.message });
  }
});

// Get scan statistics
router.get('/scan-stats', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const stats = await ScanLog.aggregate([
      { $match: { scannedBy: userId } },
      {
        $group: {
          _id: '$qrType',
          count: { $sum: 1 },
          lastScan: { $max: '$scannedAt' }
        }
      }
    ]);
    
    const totalScans = await ScanLog.countDocuments({ scannedBy: userId });
    
    res.json({
      totalScans,
      byType: stats,
      lastScan: await ScanLog.findOne({ scannedBy: userId })
        .sort({ scannedAt: -1 })
        .select('scannedAt qrType')
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching scan statistics', error: error.message });
  }
});

export default router;
