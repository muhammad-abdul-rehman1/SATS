import express from 'express';
import Asset from '../models/Asset.js';
import Room from '../models/Room.js';
import ScanLog from '../models/ScanLog.js';
import AssetMovement from '../models/AssetMovement.js';
import Notification from '../models/Notification.js';
import { isAuthenticated } from '../middleware/auth.js';

const router = express.Router();

function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // distance in meters
}

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

// Resolve QR code or NFC tag data to entity
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const { qrData, location, deviceInfo, action, nfcTagId } = req.body;
    let scanMethod = req.body.scanMethod;
    
    if (!qrData && !nfcTagId) {
      return res.status(400).json({ message: 'QR or NFC data is required' });
    }
    
    const rawStr = String(qrData || nfcTagId).trim();
    let parsed = null;
    
    // 1. Try parsing as JSON
    try {
      const jsonCandidate = JSON.parse(rawStr);
      if (jsonCandidate && typeof jsonCandidate === 'object') {
        const t = (jsonCandidate.type || jsonCandidate.t || '').toUpperCase();
        if (t === 'ASSET' || t === 'A') {
          parsed = { type: 'ASSET', id: jsonCandidate.id || jsonCandidate._id, code: jsonCandidate.code || jsonCandidate.tag || jsonCandidate.c };
        } else if (t === 'ROOM' || t === 'R') {
          parsed = { type: 'ROOM', id: jsonCandidate.id || jsonCandidate._id, code: jsonCandidate.code || jsonCandidate.c };
        } else if (t === 'LOCATION') {
          parsed = { type: 'LOCATION', id: jsonCandidate.id || jsonCandidate._id, name: jsonCandidate.name };
        }
      }
    } catch (e) {
      // Not JSON, continue to other parsers
    }

    // 2. Try parsing as custom URI: sats://room/:id, sats://r/:id, sats://asset/:id, sats://a/:id
    if (!parsed) {
      const uriMatch = rawStr.match(/^sats:\/\/(room|r|asset|a)\/([a-fA-F0-9]{24}|[^\s/?#]+)/i);
      if (uriMatch) {
        scanMethod = scanMethod || 'NFC';
        const prefix = uriMatch[1].toLowerCase();
        const idVal = uriMatch[2];
        if (prefix === 'room' || prefix === 'r') {
          parsed = { type: 'ROOM', id: idVal };
        } else {
          parsed = { type: 'ASSET', id: idVal };
        }
      }
    }

    // 3. Fallback: Lookup by NFC Tag UID or assetTag / room code
    if (!parsed) {
      const queryId = nfcTagId || rawStr;
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(queryId);

      // Check Asset
      const assetCandidate = await Asset.findOne({
        $or: [
          ...(isObjectId ? [{ _id: queryId }] : []),
          { assetTag: queryId },
          { nfcTagId: queryId },
        ]
      });

      if (assetCandidate) {
        parsed = { type: 'ASSET', id: String(assetCandidate._id) };
      } else {
        // Check Room
        const roomCandidate = await Room.findOne({
          $or: [
            ...(isObjectId ? [{ _id: queryId }] : []),
            { code: queryId },
            { nfcTagId: queryId },
          ]
        });
        if (roomCandidate) {
          parsed = { type: 'ROOM', id: String(roomCandidate._id) };
        }
      }
    }
    
    if (!parsed || !parsed.type) {
      return res.status(400).json({ message: 'Invalid QR/NFC code format' });
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
    
    // Auto-detect scanMethod if not specified
    if (!scanMethod) {
      scanMethod = (rawStr.startsWith('sats://') || !!nfcTagId) ? 'NFC' : 'QR';
    }

    // Log the scan
    const scanLog = await ScanLog.create({
      qrData: rawStr,
      qrType: parsed.type,
      scanMethod,
      scannedBy: req.user._id,
      location,
      deviceInfo,
      action: action || 'VIEW',
      metadata: { entityType, entityId: entity._id || entity.id, nfcTagId: nfcTagId || undefined }
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

    // If action is MOVE and it's an asset, record movement history
    if (entityType === 'asset' && action === 'MOVE') {
      try {
        await AssetMovement.create({
          assetId: entity._id,
          assetTag: entity.assetTag,
          assetName: entity.name,
          fromRoomId: entity.roomId?._id || entity.roomId || null,
          fromRoomName: entity.roomId?.name ? `${entity.roomId.name} (${entity.roomId.code || ''})` : 'Unassigned',
          toRoomId: req.body.targetRoomId || entity.roomId?._id || entity.roomId || null,
          toRoomName: req.body.targetRoomName || (entity.roomId?.name ? `${entity.roomId.name} (${entity.roomId.code || ''})` : 'Unassigned'),
          fromDepartment: entity.department || '',
          toDepartment: entity.department || '',
          movedBy: req.user._id,
          movedByName: req.user.name || req.user.email || 'User',
          movedByEmail: req.user.email || '',
          movedAt: new Date(),
          source: scanMethod === 'NFC' ? 'NFC_SCAN' : 'QR_SCAN',
          reason: req.body.reason || (scanMethod === 'NFC' ? 'NFC scan relocation check-in' : 'QR scan relocation check-in'),
          coordinates: location
        });
      } catch (moveErr) {
        console.warn('[AssetMovement] Failed to record move on scan:', moveErr.message);
      }
    }

    // Geofence & Unauthorized Movement Detection
    let unauthorizedAlert = null;
    let isUnauthorizedMovement = false;

    if (entityType === 'asset' && action !== 'MOVE') {
      const assignedRoom = entity.roomId;
      let breachReason = null;
      let distanceMeters = null;

      if (req.body.locationMatch === false) {
        breachReason = 'Location mismatch flagged during mobile scan.';
      } else if (req.body.activeRoomId && assignedRoom?._id && String(req.body.activeRoomId) !== String(assignedRoom._id)) {
        breachReason = `Asset scanned inside an unexpected room instead of assigned location "${assignedRoom.name}".`;
      } else if (location && location.latitude && location.longitude && assignedRoom?.latitude && assignedRoom?.longitude) {
        distanceMeters = calculateHaversineDistance(
          location.latitude,
          location.longitude,
          assignedRoom.latitude,
          assignedRoom.longitude
        );
        if (distanceMeters > 150) {
          breachReason = `Asset detected approximately ${Math.round(distanceMeters)}m outside assigned room geofence perimeter.`;
        }
      }

      if (breachReason) {
        isUnauthorizedMovement = true;
        try {
          unauthorizedAlert = await Notification.create({
            title: `Unauthorized Movement Alert: ${entity.name}`,
            message: `Asset ${entity.assetTag} (${entity.name}) was detected outside its defined area (${assignedRoom?.name || 'Assigned Room'}). ${breachReason}`,
            type: 'CRITICAL',
            category: 'SECURITY',
            priority: 'HIGH',
            status: 'ACTIVE',
            recipient: entity.ownerId?._id || null,
            targetType: 'ASSET',
            targetId: entity._id,
            metadata: {
              assetTag: entity.assetTag,
              assetName: entity.name,
              breachType: 'GEOFENCE_BREACH',
              assignedRoom: assignedRoom ? `${assignedRoom.name} (${assignedRoom.code})` : 'Unassigned',
              scanLocation: location,
              distanceMeters: distanceMeters ? Math.round(distanceMeters) : null,
              detectedBy: req.user?.name || req.user?.email || 'User',
              detectedAt: new Date(),
              requiresAcknowledgement: true,
            }
          });
        } catch (alertErr) {
          console.warn('[Resolve] Failed to create unauthorized movement alert:', alertErr.message);
        }
      }
    }

    res.json({
      entity,
      entityType,
      scanLog,
      unauthorizedMovement: isUnauthorizedMovement,
      alert: unauthorizedAlert,
      message: isUnauthorizedMovement
        ? `Warning: Unauthorized movement detected for ${entity.name}!`
        : `${entityType} resolved successfully`
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
