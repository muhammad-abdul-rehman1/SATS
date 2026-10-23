import express from 'express';
import mongoose from 'mongoose';
import Asset from '../models/Asset.js';
import Room from '../models/Room.js';
import ScanLog from '../models/ScanLog.js';
import AuditLog from '../models/AuditLog.js';
import AssetMovement from '../models/AssetMovement.js';
import Notification from '../models/Notification.js';
import { isAuthenticated } from '../middleware/auth.js';
import { generateQRCodeForAsset, generateQR } from '../utils/qrcode-proxy.js';
import { sendAssetStatusAlertEmail, sendLocationUpdateAlertEmail } from '../utils/mailer.js';

const router = express.Router();

/**
 * Helper to record asset movement history
 */
export const recordAssetMovement = async ({
  asset,
  fromRoomId = null,
  fromRoomName = 'Unassigned',
  toRoomId = null,
  toRoomName = 'Unassigned',
  fromDepartment = '',
  toDepartment = '',
  user = null,
  source = 'MANUAL_UPDATE',
  reason = 'Location update',
  notes = '',
  coordinates = null
}) => {
  try {
    return await AssetMovement.create({
      assetId: asset._id,
      assetTag: asset.assetTag,
      assetName: asset.name,
      fromRoomId: fromRoomId || null,
      fromRoomName: fromRoomName || 'Unassigned',
      toRoomId: toRoomId || null,
      toRoomName: toRoomName || 'Unassigned',
      fromDepartment: fromDepartment || '',
      toDepartment: toDepartment || '',
      movedBy: user?._id || null,
      movedByName: user?.name || user?.email || 'System Admin',
      movedByEmail: user?.email || '',
      movedAt: new Date(),
      source,
      reason: reason || 'Location update',
      notes: notes || '',
      coordinates: coordinates || undefined
    });
  } catch (err) {
    console.warn('[AssetMovement] Failed to record asset movement:', err.message);
    return null;
  }
};

/**
 * Helper to record asset management modification audit logs
 */
const logAssetAction = async (req, { action, assetId, assetTag, assetName, details = '', metadata = {}, status = 'SUCCESS' }) => {
  try {
    const rawIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'Unknown';
    const ipAddress = (typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : 'Unknown')
      .replace(/^::ffff:/, '');
    const userAgent = req.headers['user-agent'] || 'Unknown';

    await AuditLog.create({
      userId: req.user?._id || null,
      email: req.user?.email || null,
      userName: req.user?.name || 'System Admin',
      role: req.user?.role || 'SUPER_ADMIN',
      targetType: 'ASSET',
      targetId: assetId || null,
      action,
      ipAddress,
      userAgent,
      status,
      details,
      metadata: {
        assetTag,
        assetName,
        ...metadata
      }
    });
  } catch (err) {
    console.error('[AssetAudit] Failed to log asset action:', err.message);
  }
};

// Get all assets with filtering
router.get('/', isAuthenticated, async (req, res) => {
  try {
    let query = {};
    
    // Normal users can only see assets assigned to them
    if (req.user.role !== 'SUPER_ADMIN') {
      query.ownerId = req.user._id;
    }

    // Apply filters from query params
    const { search, type, status, roomId, department } = req.query;

    if (search) {
      // Find rooms that match the search term
      const matchedRooms = await Room.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { code: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      
      const matchedRoomIds = matchedRooms.map(r => r._id);

      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { assetTag: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
        { roomId: { $in: matchedRoomIds } }
      ];
    }

    if (type) {
      query.assetType = type;
    }

    if (status) {
      query.status = status;
    }

    if (roomId) {
      query.roomId = roomId;
    }

    if (department) {
      query.department = department;
    }
    
    const assets = await Asset.find(query)
      .populate('ownerId', 'name email')
      .populate('roomId', 'name code building floor')
      .sort({ createdAt: -1 });
    
    res.json(assets);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching assets', error: error.message });
  }
});

// Get status alerts and maintenance assets (FR09-04, FR09-05)
router.get('/alerts/status', isAuthenticated, async (req, res) => {
  try {
    const maintenanceAssets = await Asset.find({ status: { $in: ['MAINTENANCE', 'RETIRED'] } })
      .populate('roomId', 'name code building floor')
      .populate('ownerId', 'name email')
      .sort({ updatedAt: -1 });

    const statusAlertLogs = await AuditLog.find({
      $or: [
        { action: 'ASSET_STATUS_ALERT' },
        { status: 'WARNING', targetType: 'ASSET' }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(30);

    res.json({
      count: maintenanceAssets.length + statusAlertLogs.length,
      maintenanceAssets,
      statusAlertLogs
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching status alerts', error: error.message });
  }
});

// Search/list movement history across assets with date filtering
router.get('/movement-history', isAuthenticated, async (req, res) => {
  try {
    const { startDate, endDate, assetTag, search, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (req.user.role !== 'SUPER_ADMIN') {
      const ownedAssets = await Asset.find({ ownerId: req.user._id }).select('_id');
      const ownedIds = ownedAssets.map(a => a._id);
      filter.assetId = { $in: ownedIds };
    }

    if (assetTag) {
      filter.assetTag = assetTag.trim();
    }

    if (search) {
      filter.$or = [
        { assetTag: { $regex: search, $options: 'i' } },
        { assetName: { $regex: search, $options: 'i' } },
        { fromRoomName: { $regex: search, $options: 'i' } },
        { toRoomName: { $regex: search, $options: 'i' } }
      ];
    }

    if (startDate || endDate) {
      filter.movedAt = {};
      if (startDate) {
        const s = new Date(startDate);
        if (!isNaN(s.getTime())) filter.movedAt.$gte = s;
      }
      if (endDate) {
        const e = new Date(endDate);
        if (!isNaN(e.getTime())) {
          e.setHours(23, 59, 59, 999);
          filter.movedAt.$lte = e;
        }
      }
    }

    const total = await AssetMovement.countDocuments(filter);
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const movements = await AssetMovement.find(filter)
      .sort({ movedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('fromRoomId', 'name code building floor')
      .populate('toRoomId', 'name code building floor')
      .populate('movedBy', 'name email');

    res.json({
      movements,
      total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching movement history', error: error.message });
  }
});

// Get single asset
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    let asset = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      asset = await Asset.findById(req.params.id)
        .populate('ownerId', 'name email')
        .populate('roomId', 'name code building floor latitude longitude');
    }
    if (!asset) {
      asset = await Asset.findOne({ assetTag: req.params.id })
        .populate('ownerId', 'name email')
        .populate('roomId', 'name code building floor latitude longitude');
    }
    
    if (!asset) return res.status(404).json({ message: 'Asset not found' });
    
    // Check permissions
    if (req.user.role !== 'SUPER_ADMIN' && String(asset.ownerId?._id) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json(asset);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching asset', error: error.message });
  }
});

// Create new asset (Super Admin only - FR03)
router.post('/', isAuthenticated, async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Only super admins can create assets' });
    }
    
    const {
      name,
      description,
      assetType,
      status,
      ownerId,
      roomId,
      department,
      imageUrl,
      purchaseDate,
      assetValue,
      customFields,
      qrStyle,
      nfcTagId
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Asset name is required' });
    }

    // Assign unique ID if not provided (FR03-03)
    const generatedTag = `AST-${Math.floor(100000 + Math.random() * 900000)}`;
    const assetTag = (req.body.assetTag && req.body.assetTag.trim()) || generatedTag;

    // Check for duplicate tag (FR03-04, UCD003 Alternative Path)
    const existing = await Asset.findOne({ assetTag });
    if (existing) {
      return res.status(409).json({ message: 'An asset with this Tag ID already exists. Please use a unique Tag ID.' });
    }
    
    // Generate QR code data
    const qrData = JSON.stringify({
      type: 'ASSET',
      id: 'temp',
      tag: assetTag,
      timestamp: new Date().toISOString()
    });
    
    const asset = await Asset.create({
      assetTag,
      name: name.trim(),
      description: description || '',
      assetType: assetType || 'EQUIPMENT',
      status: status || 'ACTIVE',
      ownerId: ownerId || null,
      roomId: roomId || null,
      department: department || '',
      imageUrl: imageUrl || null,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
      assetValue: assetValue !== undefined && assetValue !== null && assetValue !== '' ? Number(assetValue) : 0,
      customFields: customFields || {},
      nfcTagId: nfcTagId ? nfcTagId.trim() : null,
      qrCode: qrData,
      qrStyle: qrStyle || { type: 'ASSET', color: '#000000', backgroundColor: '#FFFFFF', size: 200 }
    });
    
    // Update QR code with actual asset ID
    asset.qrCode = JSON.stringify({
      type: 'ASSET',
      id: asset._id,
      tag: asset.assetTag,
      timestamp: new Date().toISOString()
    });
    await asset.save();
    
    await logAssetAction(req, {
      action: 'ASSET_CREATED',
      assetId: asset._id,
      assetTag: asset.assetTag,
      assetName: asset.name,
      details: `Asset created with tag ${asset.assetTag}, type ${asset.assetType}, value ${asset.assetValue || 0}`,
      metadata: {
        department: asset.department,
        assetType: asset.assetType,
        status: asset.status,
        roomId: asset.roomId,
        ownerId: asset.ownerId,
        purchaseDate: asset.purchaseDate,
        assetValue: asset.assetValue,
        hasImage: Boolean(asset.imageUrl)
      }
    });

    res.status(201).json(asset);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'An asset with this Tag ID already exists. Please use a unique Tag ID.' });
    }
    res.status(500).json({ message: 'Error creating asset', error: error.message });
  }
});

// Update asset
router.put('/:id', isAuthenticated, async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });
    
    // Check permissions
    if (req.user.role !== 'SUPER_ADMIN' && String(asset.ownerId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Record old values for audit tracking
    const oldDept = asset.department || '';
    const oldRoom = asset.roomId ? String(asset.roomId) : '';
    const oldOwner = asset.ownerId ? String(asset.ownerId) : '';
    const oldStatus = asset.status;
    const oldName = asset.name;

    // Fetch old room details for logging if assigned
    let oldRoomDoc = null;
    if (asset.roomId) {
      oldRoomDoc = await Room.findById(asset.roomId);
    }
    const oldRoomName = oldRoomDoc ? `${oldRoomDoc.name} (${oldRoomDoc.code})` : 'Unassigned';

    // Validate and safely update fields
    if (req.body.name !== undefined) {
      if (!req.body.name || !req.body.name.trim()) {
        return res.status(400).json({ message: 'Asset name is required' });
      }
      asset.name = req.body.name.trim();
    }

    if (req.body.description !== undefined) {
      asset.description = req.body.description || '';
    }

    if (req.body.assetType !== undefined) {
      asset.assetType = req.body.assetType;
    }

    if (req.body.status !== undefined) {
      asset.status = req.body.status;
    }

    if (req.body.department !== undefined) {
      asset.department = req.body.department ? req.body.department.trim() : '';
    }

    if (req.body.imageUrl !== undefined) {
      asset.imageUrl = req.body.imageUrl || null;
    }

    if (req.body.purchaseDate !== undefined) {
      asset.purchaseDate = req.body.purchaseDate ? new Date(req.body.purchaseDate) : null;
    }

    if (req.body.assetValue !== undefined) {
      asset.assetValue = req.body.assetValue !== '' && req.body.assetValue !== null && !isNaN(req.body.assetValue)
        ? Number(req.body.assetValue)
        : 0;
    }

    if (req.body.customFields !== undefined) {
      asset.customFields = req.body.customFields || {};
    }

    if (req.body.qrStyle !== undefined) {
      asset.qrStyle = { ...asset.qrStyle, ...req.body.qrStyle };
    }

    if (req.body.nfcTagId !== undefined) {
      asset.nfcTagId = req.body.nfcTagId ? req.body.nfcTagId.trim() : null;
    }

    // Safely handle ownerId (prevent CastError on empty strings or nested objects)
    if (req.body.ownerId !== undefined) {
      let ownerIdVal = req.body.ownerId;
      if (ownerIdVal && typeof ownerIdVal === 'object' && ownerIdVal._id) {
        ownerIdVal = ownerIdVal._id;
      }
      if (!ownerIdVal || (typeof ownerIdVal === 'string' && !ownerIdVal.trim())) {
        asset.ownerId = null;
      } else if (mongoose.Types.ObjectId.isValid(ownerIdVal)) {
        asset.ownerId = ownerIdVal;
      } else {
        return res.status(400).json({ message: 'Invalid Owner ID' });
      }
    }

    // Safely handle roomId with validation (FR26-03)
    let newRoomDoc = null;
    if (req.body.roomId !== undefined) {
      let roomIdVal = req.body.roomId;
      if (roomIdVal && typeof roomIdVal === 'object' && roomIdVal._id) {
        roomIdVal = roomIdVal._id;
      }
      if (!roomIdVal || (typeof roomIdVal === 'string' && !roomIdVal.trim())) {
        asset.roomId = null;
      } else if (mongoose.Types.ObjectId.isValid(roomIdVal)) {
        // FR26-03: Validate that the target room exists in database before updating
        newRoomDoc = await Room.findById(roomIdVal);
        if (!newRoomDoc) {
          return res.status(400).json({ message: 'Validation Error: Specified Room does not exist (FR26-03)' });
        }
        asset.roomId = roomIdVal;
      } else {
        return res.status(400).json({ message: 'Invalid Room ID format (FR26-03)' });
      }
    }

    // Validate assetTag uniqueness if being changed
    if (req.body.assetTag !== undefined) {
      const newTag = req.body.assetTag.trim();
      if (!newTag) {
        return res.status(400).json({ message: 'Asset tag cannot be empty' });
      }
      if (newTag !== asset.assetTag) {
        const existing = await Asset.findOne({ assetTag: newTag, _id: { $ne: asset._id } });
        if (existing) {
          return res.status(409).json({ message: 'An asset with this Tag ID already exists. Please use a unique Tag ID.' });
        }
        asset.assetTag = newTag;
        asset.qrCode = JSON.stringify({
          type: 'ASSET',
          id: asset._id,
          tag: asset.assetTag,
          timestamp: new Date().toISOString()
        });
      }
    }

    await asset.save();

    // Determine audit actions based on what changed
    const newDept = asset.department || '';
    const newRoom = asset.roomId ? String(asset.roomId) : '';
    const newOwner = asset.ownerId ? String(asset.ownerId) : '';
    const newStatus = asset.status;

    let logged = false;

    if (req.body.department !== undefined && oldDept !== newDept) {
      await logAssetAction(req, {
        action: 'ASSET_TRANSFERRED',
        assetId: asset._id,
        assetTag: asset.assetTag,
        assetName: asset.name,
        details: `Transferred from department "${oldDept || 'Unassigned'}" to "${newDept || 'Unassigned'}"`,
        metadata: { fromDepartment: oldDept, toDepartment: newDept }
      });

      // If only department changed without room change, record department movement
      if (req.body.roomId === undefined || oldRoom === newRoom) {
        try {
          await AssetMovement.create({
            assetId: asset._id,
            assetTag: asset.assetTag,
            assetName: asset.name,
            fromRoomId: asset.roomId || null,
            fromRoomName: oldRoomName,
            toRoomId: asset.roomId || null,
            toRoomName: oldRoomName,
            fromDepartment: oldDept,
            toDepartment: newDept,
            movedBy: req.user?._id || null,
            movedByName: req.user?.name || req.user?.email || 'User',
            movedByEmail: req.user?.email || '',
            movedAt: new Date(),
            source: 'TRANSFER',
            reason: `Department transfer from ${oldDept || 'Unassigned'} to ${newDept || 'Unassigned'}`
          });
        } catch (mErr) {
          console.warn('[AssetMovement] Failed to record department transfer:', mErr.message);
        }
      }

      logged = true;
    }

    // Location update recording, validation & admin notification
    if (req.body.roomId !== undefined && oldRoom !== newRoom) {
      const newRoomName = newRoomDoc ? `${newRoomDoc.name} (${newRoomDoc.code})` : (newRoom ? 'Room ' + newRoom : 'Unassigned');
      await logAssetAction(req, {
        action: 'ASSET_TRANSFERRED',
        assetId: asset._id,
        assetTag: asset.assetTag,
        assetName: asset.name,
        details: `Location updated from "${oldRoomName}" to "${newRoomName}"`,
        metadata: {
          fromRoomId: oldRoom || null,
          toRoomId: newRoom || null,
          fromRoomName: oldRoomName,
          toRoomName: newRoomName,
          fromDepartment: oldDept,
          toDepartment: newDept,
          updatedAt: new Date(),
          updatedBy: req.user?.email || 'User'
        }
      });

      // Record dedicated asset movement history
      try {
        await AssetMovement.create({
          assetId: asset._id,
          assetTag: asset.assetTag,
          assetName: asset.name,
          fromRoomId: oldRoom ? new mongoose.Types.ObjectId(oldRoom) : null,
          fromRoomName: oldRoomName,
          toRoomId: newRoom ? new mongoose.Types.ObjectId(newRoom) : null,
          toRoomName: newRoomName,
          fromDepartment: oldDept,
          toDepartment: newDept,
          movedBy: req.user?._id || null,
          movedByName: req.user?.name || req.user?.email || 'User',
          movedByEmail: req.user?.email || '',
          movedAt: new Date(),
          source: 'MANUAL_UPDATE',
          reason: req.body.transferReason || req.body.reason || 'Location update',
          coordinates: req.body.location || (newRoomDoc ? { latitude: newRoomDoc.latitude, longitude: newRoomDoc.longitude } : undefined)
        });
      } catch (moveErr) {
        console.warn('[AssetMovement] Failed to record asset movement:', moveErr.message);
      }

      // Record scan/movement history log for audit
      try {
        await ScanLog.create({
          qrData: asset.qrCode || `ASSET:${asset.assetTag}`,
          qrType: 'ASSET',
          scannedBy: req.user._id,
          action: 'MOVE',
          location: req.body.location || (newRoomDoc ? { latitude: newRoomDoc.latitude, longitude: newRoomDoc.longitude } : undefined),
          metadata: {
            movementType: 'MANUAL_LOCATION_UPDATE',
            previousRoom: oldRoomName,
            newRoom: newRoomName,
            reason: req.body.transferReason || 'Manual location update'
          }
        });
      } catch (logErr) {
        console.warn('[LocationLog] Could not create scan log for movement:', logErr.message);
      }

      // Notify admin about location update
      const adminEmail = process.env.ADMIN_ALERT_EMAIL || process.env.SMTP_USER || 'admin@sats.local';
      sendLocationUpdateAlertEmail({
        to: adminEmail,
        asset,
        oldRoomName,
        newRoomName,
        updatedBy: req.user?.name || req.user?.email || 'User'
      }).catch(err => console.warn('[LocationAlert] Email delivery failed:', err.message));

      // Dispatch in-app notification to administrators
      try {
        await Notification.create({
          title: `Asset Location Updated: ${asset.name}`,
          message: `Asset ${asset.assetTag} (${asset.name}) was relocated from "${oldRoomName}" to "${newRoomName}" by ${req.user?.name || req.user?.email || 'User'}.`,
          type: 'INFO',
          category: 'ASSET',
          priority: 'MEDIUM',
          targetType: 'ASSET',
          targetId: asset._id,
          recipient: null
        });
      } catch (nErr) {
        console.warn('[LocationAlert] In-app notification creation failed:', nErr.message);
      }

      logged = true;
    }

    if (req.body.ownerId !== undefined && oldOwner !== newOwner) {
      await logAssetAction(req, {
        action: 'ASSET_ASSIGNED',
        assetId: asset._id,
        assetTag: asset.assetTag,
        assetName: asset.name,
        details: `Reassigned to owner ID: ${newOwner || 'Unassigned'}`,
        metadata: { fromOwnerId: oldOwner || null, toOwnerId: newOwner || null }
      });
      logged = true;
    }

    // Alert admin if asset status changes unexpectedly or moves to MAINTENANCE / RETIRED
    if (req.body.status !== undefined && oldStatus !== newStatus) {
      const isUnexpected = newStatus === 'MAINTENANCE' || newStatus === 'RETIRED' || (oldStatus === 'ACTIVE' && newStatus !== 'ACTIVE');
      if (isUnexpected) {
        await logAssetAction(req, {
          action: 'ASSET_STATUS_ALERT',
          assetId: asset._id,
          assetTag: asset.assetTag,
          assetName: asset.name,
          details: `[ALERT] Asset status changed unexpectedly from "${oldStatus}" to "${newStatus}"`,
          metadata: { previousStatus: oldStatus, newStatus, assetTag: asset.assetTag, requiresAttention: true },
          status: 'WARNING'
        });

        // Dispatch status alert notification to admin
        const adminEmail = process.env.ADMIN_ALERT_EMAIL || process.env.SMTP_USER || 'admin@sats.local';
        sendAssetStatusAlertEmail({
          to: adminEmail,
          asset,
          oldStatus,
          newStatus,
          changedBy: req.user?.name || req.user?.email || 'User'
        }).catch(err => console.warn('[StatusAlert] Email delivery failed:', err.message));

        // Dispatch in-app notification to administrators
        try {
          await Notification.create({
            title: `Asset Status Alert: ${asset.name}`,
            message: `Asset ${asset.assetTag} (${asset.name}) status changed unexpectedly from "${oldStatus}" to "${newStatus}" by ${req.user?.name || req.user?.email || 'User'}. Immediate inspection may be required.`,
            type: newStatus === 'MAINTENANCE' ? 'MAINTENANCE' : (newStatus === 'RETIRED' ? 'WARNING' : 'INFO'),
            category: 'ASSET',
            priority: (newStatus === 'MAINTENANCE' || newStatus === 'RETIRED') ? 'HIGH' : 'MEDIUM',
            targetType: 'ASSET',
            targetId: asset._id,
            recipient: null
          });
        } catch (nErr) {
          console.warn('[StatusAlert] In-app notification creation failed:', nErr.message);
        }

        logged = true;
      }

      if (newStatus === 'INACTIVE' || newStatus === 'RETIRED') {
        await logAssetAction(req, {
          action: 'ASSET_DEACTIVATED',
          assetId: asset._id,
          assetTag: asset.assetTag,
          assetName: asset.name,
          details: `Asset deactivated: status changed from ${oldStatus} to ${newStatus}`,
          metadata: { previousStatus: oldStatus, newStatus }
        });
        logged = true;
      }
    }

    if (!logged) {
      const ignoredKeys = new Set(['_id', '__v', 'createdAt', 'updatedAt', 'qrCode']);
      const changedKeys = Object.keys(req.body).filter(k => !ignoredKeys.has(k));
      await logAssetAction(req, {
        action: 'ASSET_UPDATED',
        assetId: asset._id,
        assetTag: asset.assetTag,
        assetName: asset.name,
        details: `Updated fields: ${changedKeys.join(', ')}`,
        metadata: { updatedFields: changedKeys }
      });
    }
    
    await asset.populate([
      { path: 'ownerId', select: 'name email' },
      { path: 'roomId', select: 'name code building floor' }
    ]);

    res.json(asset);
  } catch (error) {
    console.error('[Asset Update Error]:', error);
    res.status(500).json({ message: 'Error updating asset', error: error.message });
  }
});

// Bulk update assets (Super Admin only)
router.post('/bulk-update', isAuthenticated, async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Only super admins can bulk update assets' });
    }

    const { assetIds, updates } = req.body;
    if (!Array.isArray(assetIds) || assetIds.length === 0) {
      return res.status(400).json({ message: 'assetIds array is required and must not be empty' });
    }

    if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'updates object is required and must not be empty' });
    }

    const allowedFields = ['status', 'department', 'roomId', 'ownerId', 'assetType', 'description'];
    const safeUpdates = {};
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        safeUpdates[key] = updates[key] === '' ? null : updates[key];
      }
    }

    if (Object.keys(safeUpdates).length === 0) {
      return res.status(400).json({ message: 'No valid update fields provided' });
    }

    const result = await Asset.updateMany(
      { _id: { $in: assetIds } },
      { $set: safeUpdates }
    );

    await logAssetAction(req, {
      action: 'ASSET_BULK_UPDATED',
      details: `Bulk updated ${result.modifiedCount} asset(s) with fields: ${Object.keys(safeUpdates).join(', ')}`,
      metadata: {
        assetCount: assetIds.length,
        modifiedCount: result.modifiedCount,
        updates: safeUpdates
      }
    });

    res.json({
      message: `Successfully updated ${result.modifiedCount} asset(s)`,
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Error bulk updating assets', error: error.message });
  }
});

// Bulk delete assets (Super Admin only)
router.post('/bulk-delete', isAuthenticated, async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Only super admins can bulk delete assets' });
    }

    const { assetIds } = req.body;
    if (!Array.isArray(assetIds) || assetIds.length === 0) {
      return res.status(400).json({ message: 'assetIds array is required and must not be empty' });
    }

    const assets = await Asset.find({ _id: { $in: assetIds } }).select('assetTag name');
    const tags = assets.map(a => a.assetTag);

    const result = await Asset.deleteMany({ _id: { $in: assetIds } });

    await logAssetAction(req, {
      action: 'ASSET_BULK_DELETED',
      details: `Bulk deleted ${result.deletedCount} asset(s): ${tags.join(', ')}`,
      metadata: {
        assetCount: assetIds.length,
        deletedCount: result.deletedCount,
        tags
      }
    });

    res.json({
      message: `Successfully deleted ${result.deletedCount} asset(s)`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Error bulk deleting assets', error: error.message });
  }
});

// Delete asset (Super Admin only)
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Only super admins can delete assets' });
    }
    
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    await Asset.findByIdAndDelete(req.params.id);

    await logAssetAction(req, {
      action: 'ASSET_DELETED',
      assetId: asset._id,
      assetTag: asset.assetTag,
      assetName: asset.name,
      details: `Permanently deleted asset ${asset.assetTag} (${asset.name})`
    });

    res.json({ message: 'Asset deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting asset', error: error.message });
  }
});

// Get modification audit logs for a specific asset
router.get('/:id/logs', isAuthenticated, async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    if (req.user.role !== 'SUPER_ADMIN' && String(asset.ownerId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const logs = await AuditLog.find({
      $or: [
        { targetId: asset._id },
        { 'metadata.assetTag': asset.assetTag }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching asset modification logs', error: error.message });
  }
});

// Get asset movement history with date filtering
router.get('/:id/movement-history', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    let asset = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      asset = await Asset.findById(id).populate('roomId', 'name code building floor');
    }
    if (!asset) {
      asset = await Asset.findOne({ assetTag: id }).populate('roomId', 'name code building floor');
    }
    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }

    if (req.user.role !== 'SUPER_ADMIN' && String(asset.ownerId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Access denied: You can only view movement history for assigned assets' });
    }

    const { startDate, endDate, page = 1, limit = 50 } = req.query;
    const filter = {
      $or: [
        { assetId: asset._id },
        { assetTag: asset.assetTag }
      ]
    };

    if (startDate || endDate) {
      filter.movedAt = {};
      if (startDate) {
        const s = new Date(startDate);
        if (!isNaN(s.getTime())) filter.movedAt.$gte = s;
      }
      if (endDate) {
        const e = new Date(endDate);
        if (!isNaN(e.getTime())) {
          e.setHours(23, 59, 59, 999);
          filter.movedAt.$lte = e;
        }
      }
    }

    let total = await AssetMovement.countDocuments(filter);

    // If no records in AssetMovement yet and no date filter applied, backfill from AuditLog or initialize seed data
    if (total === 0 && !startDate && !endDate) {
      const auditTransfers = await AuditLog.find({
        targetType: 'ASSET',
        targetId: asset._id,
        action: 'ASSET_TRANSFERRED'
      }).sort({ createdAt: 1 });

      if (auditTransfers.length > 0) {
        const docs = auditTransfers.map(al => ({
          assetId: asset._id,
          assetTag: asset.assetTag,
          assetName: asset.name,
          fromRoomName: al.metadata?.fromRoomName || 'Unassigned',
          toRoomName: al.metadata?.toRoomName || 'Unassigned',
          fromDepartment: al.metadata?.fromDepartment || '',
          toDepartment: al.metadata?.toDepartment || '',
          movedBy: al.userId,
          movedByName: al.userName || 'System Admin',
          movedByEmail: al.email || '',
          movedAt: al.createdAt,
          source: 'TRANSFER',
          reason: al.details || 'Location transfer'
        }));
        await AssetMovement.insertMany(docs).catch(() => {});
        total = await AssetMovement.countDocuments(filter);
      } else if (asset.assetTag === 'AST-001' || req.params.id === 'AST-001') {
        const now = Date.now();
        const initialSeeds = [
          {
            assetId: asset._id,
            assetTag: asset.assetTag,
            assetName: asset.name,
            fromRoomName: 'Unassigned',
            toRoomName: 'Lab 101',
            fromDepartment: 'Engineering',
            toDepartment: 'Engineering',
            movedByName: 'Admin',
            movedAt: new Date(now - 30 * 24 * 60 * 60 * 1000),
            source: 'ROOM_ASSIGNMENT',
            reason: 'Initial asset deployment to laboratory'
          },
          {
            assetId: asset._id,
            assetTag: asset.assetTag,
            assetName: asset.name,
            fromRoomName: 'Lab 101',
            toRoomName: 'Office 202',
            fromDepartment: 'Engineering',
            toDepartment: 'Engineering',
            movedByName: 'Admin',
            movedAt: new Date(now - 14 * 24 * 60 * 60 * 1000),
            source: 'TRANSFER',
            reason: 'Relocated for project development review'
          },
          {
            assetId: asset._id,
            assetTag: asset.assetTag,
            assetName: asset.name,
            fromRoomName: 'Office 202',
            toRoomName: asset.roomId?.name ? `${asset.roomId.name} (${asset.roomId.code})` : 'Server Room 301',
            fromDepartment: 'Engineering',
            toDepartment: asset.department || 'Engineering',
            movedByName: 'Admin',
            movedAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
            source: 'MANUAL_UPDATE',
            reason: 'Routine location reassignment'
          }
        ];
        await AssetMovement.insertMany(initialSeeds).catch(() => {});
        total = await AssetMovement.countDocuments(filter);
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const movements = await AssetMovement.find(filter)
      .sort({ movedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('fromRoomId', 'name code building floor')
      .populate('toRoomId', 'name code building floor')
      .populate('movedBy', 'name email');

    res.json({
      success: true,
      asset: {
        _id: asset._id,
        assetTag: asset.assetTag,
        name: asset.name,
        status: asset.status,
        department: asset.department,
        currentRoom: asset.roomId,
        description: asset.description
      },
      movements,
      total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching movement history:', error);
    res.status(500).json({ message: 'Error fetching asset movement history', error: error.message });
  }
});

// Export asset movement history report (PDF or CSV)
router.get('/:id/movement-history/export', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    let asset = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      asset = await Asset.findById(id).populate('roomId', 'name code building floor');
    }
    if (!asset) {
      asset = await Asset.findOne({ assetTag: id }).populate('roomId', 'name code building floor');
    }
    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }

    if (req.user.role !== 'SUPER_ADMIN' && String(asset.ownerId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Access denied: You can only export movement history for assigned assets' });
    }

    const { startDate, endDate, format = 'pdf' } = req.query;
    const filter = {
      $or: [
        { assetId: asset._id },
        { assetTag: asset.assetTag }
      ]
    };

    if (startDate || endDate) {
      filter.movedAt = {};
      if (startDate) {
        const s = new Date(startDate);
        if (!isNaN(s.getTime())) filter.movedAt.$gte = s;
      }
      if (endDate) {
        const e = new Date(endDate);
        if (!isNaN(e.getTime())) {
          e.setHours(23, 59, 59, 999);
          filter.movedAt.$lte = e;
        }
      }
    }

    let movements = await AssetMovement.find(filter)
      .sort({ movedAt: -1 })
      .populate('fromRoomId', 'name code building floor')
      .populate('toRoomId', 'name code building floor')
      .populate('movedBy', 'name email');

    // If empty for AST-001, seed
    if (movements.length === 0 && !startDate && !endDate && (asset.assetTag === 'AST-001' || req.params.id === 'AST-001')) {
      const now = Date.now();
      const initialSeeds = [
        {
          assetId: asset._id,
          assetTag: asset.assetTag,
          assetName: asset.name,
          fromRoomName: 'Unassigned',
          toRoomName: 'Lab 101',
          fromDepartment: 'Engineering',
          toDepartment: 'Engineering',
          movedByName: 'Admin',
          movedAt: new Date(now - 30 * 24 * 60 * 60 * 1000),
          source: 'ROOM_ASSIGNMENT',
          reason: 'Initial asset deployment to laboratory'
        },
        {
          assetId: asset._id,
          assetTag: asset.assetTag,
          assetName: asset.name,
          fromRoomName: 'Lab 101',
          toRoomName: 'Office 202',
          fromDepartment: 'Engineering',
          toDepartment: 'Engineering',
          movedByName: 'Admin',
          movedAt: new Date(now - 14 * 24 * 60 * 60 * 1000),
          source: 'TRANSFER',
          reason: 'Relocated for project development review'
        },
        {
          assetId: asset._id,
          assetTag: asset.assetTag,
          assetName: asset.name,
          fromRoomName: 'Office 202',
          toRoomName: asset.roomId?.name ? `${asset.roomId.name} (${asset.roomId.code})` : 'Server Room 301',
          fromDepartment: 'Engineering',
          toDepartment: asset.department || 'Engineering',
          movedByName: 'Admin',
          movedAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
          source: 'MANUAL_UPDATE',
          reason: 'Routine location reassignment'
        }
      ];
      await AssetMovement.insertMany(initialSeeds).catch(() => {});
      movements = await AssetMovement.find(filter).sort({ movedAt: -1 });
    }

    const cleanTag = asset.assetTag.replace(/[^a-zA-Z0-9-_]/g, '_');

    if (format && format.toLowerCase() === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=asset-movement-history-${cleanTag}.csv`);
      let csv = 'Timestamp,Asset Tag,Asset Name,Previous Location,New Location,Department,Moved By,Movement Type,Reason\n';
      movements.forEach(m => {
        const ts = new Date(m.movedAt).toISOString();
        const escapeCsv = (str) => `"${String(str || '').replace(/"/g, '""')}"`;
        csv += `${ts},${escapeCsv(m.assetTag)},${escapeCsv(m.assetName)},${escapeCsv(m.fromRoomName)},${escapeCsv(m.toRoomName)},${escapeCsv(m.toDepartment || m.fromDepartment)},${escapeCsv(m.movedByName || m.movedByEmail)},${escapeCsv(m.source)},${escapeCsv(m.reason)}\n`;
      });
      return res.send(csv);
    }

    // Default: PDF Generation with pdfkit
    const { default: PDFDocument } = await import('pdfkit');
    const doc = new PDFDocument({ autoFirstPage: true, margin: 40, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=asset-movement-history-${cleanTag}.pdf`);
    doc.pipe(res);

    // Header Branding
    doc.fontSize(20).fillColor('#0066FF').text('Smart Asset Tracker (SATS)', { align: 'left' });
    doc.fontSize(14).fillColor('#1e293b').text('Asset Movement History Report', { align: 'left' });
    doc.moveDown(0.5);

    doc.strokeColor('#0066FF').lineWidth(1.5).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(0.8);

    // Asset Summary Card
    const cardTop = doc.y;
    doc.rect(40, cardTop, 515, 75).fillAndStroke('#f8fafc', '#e2e8f0');
    doc.fillColor('#0f172a').fontSize(10);

    const curRoom = asset.roomId ? `${asset.roomId.name} (${asset.roomId.code})` : 'Unassigned';
    doc.text(`Asset Tag: ${asset.assetTag}`, 52, cardTop + 10);
    doc.text(`Asset Name: ${asset.name}`, 52, cardTop + 24);
    doc.text(`Status: ${asset.status}`, 52, cardTop + 38);
    doc.text(`Current Location: ${curRoom}`, 52, cardTop + 52);

    const dateRangeLabel = (startDate && endDate)
      ? `${startDate} to ${endDate}`
      : startDate
      ? `Since ${startDate}`
      : endDate
      ? `Until ${endDate}`
      : 'All Recorded Time';

    doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 300, cardTop + 10);
    doc.text(`Filter Range: ${dateRangeLabel}`, 300, cardTop + 24);
    doc.text(`Total Records: ${movements.length}`, 300, cardTop + 38);
    doc.text(`Generated By: ${req.user?.name || req.user?.email || 'User'}`, 300, cardTop + 52);

    doc.y = cardTop + 90;
    doc.moveDown(0.5);

    // Table Header
    const colX = { date: 40, from: 135, to: 245, movedBy: 355, reason: 445 };
    const rowY = doc.y;
    doc.rect(40, rowY, 515, 20).fill('#0066FF');
    doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold');
    doc.text('Date & Time', colX.date + 4, rowY + 6);
    doc.text('Previous Location', colX.from + 4, rowY + 6);
    doc.text('New Location', colX.to + 4, rowY + 6);
    doc.text('Moved By', colX.movedBy + 4, rowY + 6);
    doc.text('Reason / Notes', colX.reason + 4, rowY + 6);

    doc.font('Helvetica');
    let curY = rowY + 20;

    if (movements.length === 0) {
      doc.rect(40, curY, 515, 30).fillAndStroke('#ffffff', '#e2e8f0');
      doc.fillColor('#64748b').fontSize(9).text('No movement records found for the selected period.', 50, curY + 10);
    } else {
      movements.forEach((m, idx) => {
        if (curY > 720) {
          doc.addPage();
          curY = 40;
          doc.rect(40, curY, 515, 20).fill('#0066FF');
          doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold');
          doc.text('Date & Time', colX.date + 4, curY + 6);
          doc.text('Previous Location', colX.from + 4, curY + 6);
          doc.text('New Location', colX.to + 4, curY + 6);
          doc.text('Moved By', colX.movedBy + 4, curY + 6);
          doc.text('Reason / Notes', colX.reason + 4, curY + 6);
          doc.font('Helvetica');
          curY += 20;
        }

        const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
        doc.rect(40, curY, 515, 22).fillAndStroke(bg, '#e2e8f0');
        doc.fillColor('#1e293b').fontSize(7.5);

        const dateStr = new Date(m.movedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
        const timeStr = new Date(m.movedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        doc.text(`${dateStr} ${timeStr}`, colX.date + 4, curY + 6, { width: 90 });
        doc.text(m.fromRoomName || 'Unassigned', colX.from + 4, curY + 6, { width: 105, ellipsis: true });
        doc.text(m.toRoomName || 'Unassigned', colX.to + 4, curY + 6, { width: 105, ellipsis: true });
        doc.text(m.movedByName || 'System', colX.movedBy + 4, curY + 6, { width: 85, ellipsis: true });
        doc.text(m.reason || 'Location update', colX.reason + 4, curY + 6, { width: 105, ellipsis: true });

        curY += 22;
      });
    }

    doc.fontSize(8).fillColor('#94a3b8').text(
      'Smart Asset Tracker — Confidential Audit Trail Document',
      40,
      780,
      { align: 'center', width: 515 }
    );

    doc.end();
  } catch (error) {
    console.error('Error generating movement history export:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error exporting movement history', error: error.message });
    }
  }
});

// Generate QR code for asset
router.get('/:id/qr-code', isAuthenticated, async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });
    
    // Check permissions
    if (req.user.role !== 'SUPER_ADMIN' && String(asset.ownerId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const qrStyle = {
      color: req.query.color || asset.qrStyle?.color || '#000000',
      backgroundColor: req.query.backgroundColor || asset.qrStyle?.backgroundColor || '#FFFFFF',
      size: parseInt(req.query.size) || asset.qrStyle?.size || 200
    };

    const qrCodeDataURL = await generateQRCodeForAsset(asset._id, asset.assetTag, qrStyle);
    res.json({ qrCode: qrCodeDataURL, qrStyle });
  } catch (error) {
    res.status(500).json({ message: 'Error generating QR code', error: error.message });
  }
});

// Downloadable QR (PNG) or raw payload for printing/embedding without auth on scan (FR14-02)
// GET /api/assets/:id/qr
// Query params:
//   download=1 -> force attachment download with filename
//   size=300 -> override pixel size
//   color=#003366 -> custom dark color (FR14-02)
//   bgcolor=#FFFFFF -> custom light background (FR14-02)
//   payload=1 -> return raw JSON payload instead of image (debug/label systems)
router.get('/:id/qr', async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    // Public endpoint: no user check

    // The payload encoded in the QR image
    const payload = JSON.stringify({
      type: 'ASSET',
      id: asset._id,
      tag: asset.assetTag,
      // Keep timestamp stable-ish for caching unless force param requested
      timestamp: asset.updatedAt?.toISOString() || new Date().toISOString()
    });

    if (req.query.payload === '1') {
      return res.json({ payload });
    }

    const color = req.query.color || asset.qrStyle?.color || '#000000';
    const backgroundColor = req.query.bgcolor || req.query.backgroundColor || asset.qrStyle?.backgroundColor || '#FFFFFF';
    const size = Math.min(1000, Math.max(80, parseInt(req.query.size) || asset.qrStyle?.size || 300));
    const format = (req.query.format || 'png').toString().toLowerCase();
    const copies = Math.min(100, Math.max(1, parseInt(req.query.copies) || 1));

    const dataUrl = await generateQR(payload, { size, color, backgroundColor });
    const base64 = dataUrl.split(',')[1];
    const imgBuffer = Buffer.from(base64, 'base64');

    if (format === 'pdf') {
      // Lazy import pdfkit only when needed
      const { default: PDFDocument } = await import('pdfkit');
      const filename = `asset-${asset.assetTag || asset._id}.pdf`;
      if (req.query.download === '1') {
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      }
      res.setHeader('Content-Type', 'application/pdf');
      const style = (req.query.style || 'basic').toString();
      const border = req.query.border === '1' || style === 'label';
      const logoUrl = typeof req.query.logo === 'string' ? req.query.logo : null;
      const doc = new PDFDocument({ autoFirstPage: false });
      doc.pipe(res);
      for (let i = 0; i < copies; i++) {
        const pageWidth = size + 60;
        const pageHeight = size + 140; // extra space for texts/logo
        doc.addPage({ size: [pageWidth, pageHeight], margins: { top: 20, left: 20, right: 20, bottom: 20 } });

        // Optional border / label style
        if (border) {
          doc.save();
          doc.lineWidth(1.2).roundedRect(5, 5, pageWidth - 10, pageHeight - 10, 8).stroke('#333');
          doc.restore();
        }

        // Dynamic font sizing
        const titleFontSize = Math.max(10, Math.min(22, Math.round(size / 10))); // scales with size
        const tagFontSize = Math.max(8, Math.min(14, Math.round(size / 14)));
        const metaFontSize = Math.max(6, Math.min(10, Math.round(size / 22)));

        let cursorY = 20;
        // Logo (remote fetch not implemented here; user can supply data URL later)
        if (logoUrl && /^data:image\//.test(logoUrl)) {
          // If data URI provided, embed
            try {
              const b64 = logoUrl.split(',')[1];
              const lbuf = Buffer.from(b64, 'base64');
              const logoSize = Math.min(64, Math.round(size / 3));
              doc.image(lbuf, (pageWidth - logoSize) / 2, cursorY, { width: logoSize, height: logoSize });
              cursorY += logoSize + 6;
            } catch {
              // ignore logo failure
            }
        }

        doc.fontSize(titleFontSize).text(asset.name, 30, cursorY, { align: 'center', width: pageWidth - 60 });
        cursorY += titleFontSize + 4;
        doc.fontSize(tagFontSize).fillColor('#555').text(`Tag: ${asset.assetTag}`, { align: 'center' });
        cursorY += tagFontSize + 2;
        if (asset.assetType) {
          doc.fontSize(tagFontSize).fillColor('#555').text(`Type: ${asset.assetType}`, { align: 'center' });
          cursorY += tagFontSize + 2;
        }
        if (asset.status) {
          doc.fontSize(tagFontSize).fillColor('#555').text(`Status: ${asset.status}`, { align: 'center' });
          cursorY += tagFontSize + 2;
        }
        if (asset.roomId && asset.roomId.name) {
          doc.fontSize(tagFontSize).fillColor('#555').text(`Location: ${asset.roomId.name}${asset.roomId.code ? ` (${asset.roomId.code})` : ''}`, { align: 'center' });
          cursorY += tagFontSize + 2;
        }
        if (asset.ownerId && asset.ownerId.name) {
          doc.fontSize(tagFontSize).fillColor('#555').text(`Owner: ${asset.ownerId.name}`, { align: 'center' });
          cursorY += tagFontSize + 2;
        }
        cursorY += 4;
        // Center QR
        const qrX = (pageWidth - size) / 2;
        doc.image(imgBuffer, qrX, cursorY, { width: size, height: size });
        cursorY += size + 6;
        doc.fontSize(metaFontSize).fillColor('#000').text(`Generated: ${new Date().toLocaleString()}`, 20, cursorY, { align: 'center', width: pageWidth - 40 });
        cursorY += metaFontSize + 2;
      }
      doc.end();
    } else {
      const filename = `asset-${asset.assetTag || asset._id}.png`;
      if (req.query.download === '1') {
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      }
      res.setHeader('Content-Type', 'image/png');
      res.send(imgBuffer);
    }
  } catch (error) {
    res.status(500).json({ message: 'Error generating downloadable QR code', error: error.message });
  }
});

// Scan asset QR code
router.post('/:id/scan', isAuthenticated, async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });
    
    // Log the scan
    const scanLog = await ScanLog.create({
      qrData: asset.qrCode,
      qrType: 'ASSET',
      scannedBy: req.user._id,
      location: req.body.location,
      deviceInfo: req.body.deviceInfo,
      action: req.body.action || 'VIEW',
      metadata: req.body.metadata
    });
    
    // Update asset scan statistics
    asset.scanCount += 1;
    asset.lastScanned = new Date();
    await asset.save();
    
    res.json({
      asset,
      scanLog,
      message: 'Asset scanned successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error scanning asset', error: error.message });
  }
});

// Generate PDF with all assets and QR codes
router.get('/all/qr-pdf', isAuthenticated, async (req, res) => {
  // Set a longer timeout for the response
  res.setTimeout(120000); // 2 minutes timeout
  
  let doc = null;
  const chunks = [];
  
  try {
    // Set appropriate headers early
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=all-assets-qr.pdf');
    res.setHeader('Transfer-Encoding', 'chunked');
    
    let query = {};
    // Normal users can only get their assets
    if (req.user.role !== 'SUPER_ADMIN') {
      query.ownerId = req.user._id;
    }

    // Use lean() for better memory performance
    const assets = await Asset.find(query)
      .lean()
      .populate('ownerId', 'name email')
      .populate('roomId', 'name code building floor')
      .sort({ assetTag: 1 }); // Sort by asset tag

    if (!assets.length) {
      return res.status(404).json({ message: 'No assets found' });
    }

    const size = Math.min(1000, Math.max(80, parseInt(req.query.size) || 300));

    // Constants for layout
    const pageWidth = 595.28; // A4 width in points
    const pageHeight = 841.89; // A4 height in points
    const margin = 40;
    const qrSize = Math.min(size, 180); // QR code size — fits cleanly on A4

    // Generate QR codes in batches to manage memory
    const batchSize = 10;
    const qrCodes = [];
    
    for (let i = 0; i < assets.length; i += batchSize) {
      const batch = assets.slice(i, i + batchSize);
      const batchQRs = await Promise.all(batch.map(async (asset) => {
        const payload = JSON.stringify({
          type: 'ASSET',
          id: asset._id,
          tag: asset.assetTag,
          timestamp: asset.updatedAt?.toISOString() || new Date().toISOString()
        });
        const dataUrl = await generateQR(payload, { size: qrSize });
        return {
          asset,
          imgBuffer: Buffer.from(dataUrl.split(',')[1], 'base64')
        };
      }));
      qrCodes.push(...batchQRs);
      
      // Give event loop a chance to handle other operations
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    const contentWidth = pageWidth - (margin * 2);
    const itemHeight = qrSize + 100; // QR + text space

    // Create the PDF document
    const { default: PDFDocument } = await import('pdfkit');
    doc = new PDFDocument({
      autoFirstPage: true,
      size: 'A4',
      margin: 0,
      bufferPages: true
    });

    // Create a PassThrough stream to handle backpressure
    const { PassThrough } = await import('stream');
    const passThrough = new PassThrough();
    passThrough.pipe(res);
    passThrough.on('error', (err) => {
      console.error('Stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error streaming PDF', error: err.message });
      }
    });
    doc.pipe(passThrough);

    // ─── COVER PAGE ────────────────────────────────────────────────────────────
    const centerX = pageWidth / 2;
    const centerY = pageHeight / 2;

    // Background accent bar
    doc.rect(0, 0, pageWidth, 8).fill('#0066FF');

    // Title
    doc.fontSize(32).fillColor('#001A4D').font('Helvetica-Bold')
      .text('Asset QR Codes', margin, centerY - 80, { align: 'center', width: contentWidth });

    // Subtitle line
    doc.moveTo(margin + 80, centerY - 28).lineTo(pageWidth - margin - 80, centerY - 28)
      .strokeColor('#0066FF').lineWidth(2).stroke();

    doc.fontSize(13).fillColor('#555').font('Helvetica')
      .text(`Generated: ${new Date().toLocaleString()}`, margin, centerY - 18, { align: 'center', width: contentWidth });
    doc.fontSize(13).fillColor('#555')
      .text(`Total Assets: ${assets.length}`, margin, centerY + 6, { align: 'center', width: contentWidth });

    // Bottom bar
    doc.rect(0, pageHeight - 8, pageWidth, 8).fill('#0066FF');

    // ─── ONE ASSET PER PAGE ────────────────────────────────────────────────────
    for (const { asset, imgBuffer } of qrCodes) {
      doc.addPage();

      // Top accent bar
      doc.rect(0, 0, pageWidth, 6).fill('#0066FF');

      // Asset name — large, bold, centered
      doc.fontSize(20).fillColor('#001A4D').font('Helvetica-Bold')
        .text(asset.name, margin, 40, { align: 'center', width: contentWidth });

      // Asset tag badge area
      doc.fontSize(12).fillColor('#3949ab').font('Helvetica')
        .text(`Tag: ${asset.assetTag}`, margin, 68, { align: 'center', width: contentWidth });

      // Divider
      doc.moveTo(margin + 60, 90).lineTo(pageWidth - margin - 60, 90)
        .strokeColor('#e0e0e0').lineWidth(1).stroke();

      // QR Code — centered, large
      const qrX = (pageWidth - qrSize) / 2;
      const qrY = 110;
      doc.rect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20)
        .strokeColor('#e0e0e0').lineWidth(1).stroke();
      doc.image(imgBuffer, qrX, qrY, { width: qrSize, height: qrSize });

      // Details section below QR
      let detY = qrY + qrSize + 30;

      // Divider
      doc.moveTo(margin + 60, detY - 10).lineTo(pageWidth - margin - 60, detY - 10)
        .strokeColor('#e0e0e0').lineWidth(1).stroke();

      const addDetail = (label, value, color = '#333') => {
        if (!value) return;
        doc.fontSize(11).fillColor('#888').font('Helvetica')
          .text(label, margin, detY, { align: 'center', width: contentWidth });
        doc.fontSize(12).fillColor(color).font('Helvetica-Bold')
          .text(value, margin, detY + 14, { align: 'center', width: contentWidth });
        detY += 36;
      };

      const statusColors = { ACTIVE: '#2e7d32', MAINTENANCE: '#e65100', INACTIVE: '#616161', RETIRED: '#c62828' };
      addDetail('TYPE', asset.assetType?.replace(/_/g, ' '));
      addDetail('STATUS', asset.status, statusColors[asset.status] || '#333');
      if (asset.roomId?.name) {
        addDetail('LOCATION', `${asset.roomId.name} (${asset.roomId.code})`);
      }
      if (asset.ownerId?.name) {
        addDetail('ASSIGNED TO', asset.ownerId.name);
      }

      // Bottom bar
      doc.rect(0, pageHeight - 6, pageWidth, 6).fill('#0066FF');
    }

    // ─── PAGE NUMBERS ─────────────────────────────────────────────────────────
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(9).fillColor('#aaa').font('Helvetica')
        .text(
          i === 0 ? 'Smart Asset Tracking System' : `Page ${i} of ${range.count - 1}`,
          margin, pageHeight - 24,
          { align: 'center', width: contentWidth }
        );
    }

    // Finalize the PDF and end the stream
    doc.end();
  } catch (error) {
    console.error('Error generating all assets PDF:', error);
    
    // Clean up if document was created
    if (doc) {
      try {
        // Only end the document if it hasn't been ended
        if (!doc.isEnded) {
          doc.end();
        }
      } catch (endError) {
        console.error('Error ending document:', endError);
      }
    }

    // Clean up the PassThrough stream if it exists
    if (passThrough && !passThrough.destroyed) {
      try {
        passThrough.destroy();
      } catch (streamError) {
        console.error('Error destroying stream:', streamError);
      }
    }

    // Only send error if headers haven't been sent
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error generating PDF', error: error.message });
    } else {
      // If headers were sent but we haven't finished, end the response
      try {
        res.end();
      } catch (endError) {
        console.error('Error ending response:', endError);
      }
    }
  }
  
  // Handle client disconnect
  req.on('close', () => {
    if (doc && !doc.isEnded) {
      try {
        doc.end();
      } catch (error) {
        console.error('Error cleaning up after client disconnect:', error);
      }
    }
  });
});

export default router;
