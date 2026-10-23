import express from 'express';
import Notification from '../models/Notification.js';
import NotificationSetting from '../models/NotificationSetting.js';
import AuditLog from '../models/AuditLog.js';
import { isAuthenticated, isSuperAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * Helper to log notification audit events
 */
const logNotificationAction = async (req, { action, notificationId, details = '', metadata = {}, status = 'SUCCESS' }) => {
  try {
    const rawIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'Unknown';
    const ipAddress = (typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : 'Unknown').replace(/^::ffff:/, '');
    const userAgent = req.headers['user-agent'] || 'Unknown';

    await AuditLog.create({
      userId: req.user?._id || null,
      email: req.user?.email || null,
      userName: req.user?.name || 'System Admin',
      role: req.user?.role || 'SUPER_ADMIN',
      targetType: 'NOTIFICATION',
      targetId: notificationId || null,
      action,
      ipAddress,
      userAgent,
      status,
      details,
      metadata,
    });
  } catch (err) {
    console.error('[NotificationAudit] Failed to record log:', err.message);
  }
};

/**
 * Helper to create system notification programmatically
 */
export const createSystemNotification = async ({
  title,
  message,
  type = 'INFO',
  category = 'SYSTEM',
  priority = 'MEDIUM',
  recipient = null,
  targetType = 'SYSTEM',
  targetId = null,
  metadata = {},
}) => {
  try {
    return await Notification.create({
      title,
      message,
      type,
      category,
      priority,
      recipient,
      targetType,
      targetId,
      metadata,
    });
  } catch (err) {
    console.error('[CreateNotification] Error:', err.message);
    return null;
  }
};

/**
 * GET /api/notifications/stats
 * Overview counts of system notifications and alerts
 */
router.get('/stats', isAuthenticated, async (req, res) => {
  try {
    const [total, active, resolved, dismissed, critical, unread] = await Promise.all([
      Notification.countDocuments(),
      Notification.countDocuments({ status: 'ACTIVE' }),
      Notification.countDocuments({ status: 'RESOLVED' }),
      Notification.countDocuments({ status: 'DISMISSED' }),
      Notification.countDocuments({ status: 'ACTIVE', priority: 'CRITICAL' }),
      Notification.countDocuments({ isRead: false }),
    ]);

    res.json({
      total,
      active,
      resolved,
      dismissed,
      critical,
      unread,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch notification stats', error: err.message });
  }
});

/**
 * GET /api/notifications/active
 * Quick fetch for the top AppBar notification bell
 */
router.get('/active', isAuthenticated, async (req, res) => {
  try {
    const alerts = await Notification.find({ status: 'ACTIVE' })
      .sort({ createdAt: -1 })
      .limit(10);

    const unreadCount = await Notification.countDocuments({ isRead: false });

    res.json({
      data: alerts,
      unreadCount,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch active alerts', error: err.message });
  }
});

/**
 * GET /api/notifications/settings
 * Get current system notification settings (FR12-01, FR12-04)
 */
router.get('/settings', isAuthenticated, async (req, res) => {
  try {
    let settings = await NotificationSetting.findOne({ scope: 'GLOBAL' });
    if (!settings) {
      settings = await NotificationSetting.create({
        scope: 'GLOBAL',
        emailNotifications: true,
        inAppAlerts: true,
        maintenanceReminders: true,
        securityAlerts: true,
        assetStatusAlerts: true,
        assetMovementAlerts: true,
        notificationFrequency: 'REALTIME',
        digestTime: '09:00',
        minSeverity: 'LOW',
        quietHoursEnabled: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
      });
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch notification settings', error: err.message });
  }
});

/**
 * PUT /api/notifications/settings
 * Update notification settings and frequency configuration (FR12-01, FR12-04)
 */
router.put('/settings', isAuthenticated, isSuperAdmin, async (req, res) => {
  try {
    const {
      emailNotifications,
      inAppAlerts,
      maintenanceReminders,
      securityAlerts,
      assetStatusAlerts,
      assetMovementAlerts,
      notificationFrequency,
      digestTime,
      minSeverity,
      quietHoursEnabled,
      quietHoursStart,
      quietHoursEnd,
    } = req.body;

    let settings = await NotificationSetting.findOne({ scope: 'GLOBAL' });
    if (!settings) {
      settings = new NotificationSetting({ scope: 'GLOBAL' });
    }

    if (emailNotifications !== undefined) settings.emailNotifications = emailNotifications;
    if (inAppAlerts !== undefined) settings.inAppAlerts = inAppAlerts;
    if (maintenanceReminders !== undefined) settings.maintenanceReminders = maintenanceReminders;
    if (securityAlerts !== undefined) settings.securityAlerts = securityAlerts;
    if (assetStatusAlerts !== undefined) settings.assetStatusAlerts = assetStatusAlerts;
    if (assetMovementAlerts !== undefined) settings.assetMovementAlerts = assetMovementAlerts;
    if (notificationFrequency !== undefined) settings.notificationFrequency = notificationFrequency;
    if (digestTime !== undefined) settings.digestTime = digestTime;
    if (minSeverity !== undefined) settings.minSeverity = minSeverity;
    if (quietHoursEnabled !== undefined) settings.quietHoursEnabled = quietHoursEnabled;
    if (quietHoursStart !== undefined) settings.quietHoursStart = quietHoursStart;
    if (quietHoursEnd !== undefined) settings.quietHoursEnd = quietHoursEnd;

    settings.updatedBy = req.user?._id || null;
    await settings.save();

    await logNotificationAction(req, {
      action: 'NOTIFICATION_SETTINGS_UPDATED',
      details: `Notification settings updated: Frequency=${settings.notificationFrequency}, MinSeverity=${settings.minSeverity}`,
      metadata: { settings: settings.toObject() },
    });

    res.json({ message: 'Notification settings updated successfully', data: settings });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update notification settings', error: err.message });
  }
});

/**
 * GET /api/notifications
 * List alerts with search, category, priority, and status filters (FR12-02, FR12-05)
 */
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const { status, priority, category, search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (priority && priority !== 'all') {
      query.priority = priority;
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    if (search && search.trim()) {
      query.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { message: { $regex: search.trim(), $options: 'i' } },
        { resolutionNotes: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .populate('resolvedBy', 'name email role')
        .populate('recipient', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      Notification.countDocuments(query),
    ]);

    res.json({
      data: notifications,
      total,
      page: parseInt(page, 10),
      pages: Math.ceil(total / parseInt(limit, 10)),
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch alerts', error: err.message });
  }
});

/**
 * PATCH /api/notifications/:id/resolve
 * Resolve an alert with resolution notes (FR12-03)
 */
router.patch('/:id/resolve', isAuthenticated, async (req, res) => {
  try {
    const { resolutionNotes } = req.body;
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.status = 'RESOLVED';
    notification.resolvedBy = req.user?._id || null;
    notification.resolvedAt = new Date();
    notification.resolutionNotes = resolutionNotes ? resolutionNotes.trim() : 'Resolved by administrator';
    notification.isRead = true;
    notification.readAt = notification.readAt || new Date();

    await notification.save();

    await logNotificationAction(req, {
      action: 'ALERT_RESOLVED',
      notificationId: notification._id,
      details: `Alert "${notification.title}" resolved: ${notification.resolutionNotes}`,
      metadata: { title: notification.title, resolutionNotes: notification.resolutionNotes },
    });

    const populated = await Notification.findById(notification._id)
      .populate('resolvedBy', 'name email role');

    res.json({ message: 'Alert marked as resolved', data: populated });
  } catch (err) {
    res.status(500).json({ message: 'Failed to resolve alert', error: err.message });
  }
});

/**
 * PATCH /api/notifications/:id/acknowledge
 * Acknowledge an unauthorized movement or security alert (FR20-04, TC-20 Step 5)
 */
router.patch('/:id/acknowledge', isAuthenticated, async (req, res) => {
  try {
    const { notes } = req.body;
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.isAcknowledged = true;
    notification.acknowledgedBy = req.user?._id || null;
    notification.acknowledgedAt = new Date();
    notification.status = 'RESOLVED';
    notification.resolvedBy = req.user?._id || null;
    notification.resolvedAt = new Date();
    notification.resolutionNotes = notes ? notes.trim() : 'Acknowledged and confirmed by user';
    notification.isRead = true;
    notification.readAt = notification.readAt || new Date();

    await notification.save();

    await logNotificationAction(req, {
      action: 'ALERT_ACKNOWLEDGED',
      notificationId: notification._id,
      details: `Alert "${notification.title}" acknowledged by user`,
      metadata: { title: notification.title, acknowledgedBy: req.user?.email, notes: notification.resolutionNotes },
    });

    const populated = await Notification.findById(notification._id)
      .populate('acknowledgedBy', 'name email role')
      .populate('resolvedBy', 'name email role');

    res.json({ message: 'Alert acknowledged successfully', data: populated });
  } catch (err) {
    res.status(500).json({ message: 'Failed to acknowledge alert', error: err.message });
  }
});

/**
 * POST /api/notifications/simulate-movement-alert
 * Trigger an unauthorized movement / geofence breach alert for testing (FR20-01, FR20-02, TC-20 Steps 2 & 3)
 */
router.post('/simulate-movement-alert', isAuthenticated, async (req, res) => {
  try {
    const { assetTag = 'AST-001', assetName = 'Dell UltraSharp Monitor', locationName = 'Unknown Area (Outside Campus Geofence)', severity = 'HIGH' } = req.body;

    const notification = await Notification.create({
      title: `Unauthorized Movement Alert: ${assetName}`,
      message: `Asset ${assetTag} (${assetName}) was moved to ${locationName}. Boundary violation detected outside defined geofence perimeter.`,
      type: severity === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
      category: 'SECURITY',
      priority: severity,
      status: 'ACTIVE',
      recipient: req.user?._id || null,
      targetType: 'ASSET',
      metadata: {
        assetTag,
        assetName,
        breachType: 'UNAUTHORIZED_MOVEMENT',
        detectedLocation: locationName,
        alertTimestamp: new Date(),
        requiresAcknowledgement: true,
      }
    });

    await logNotificationAction(req, {
      action: 'UNAUTHORIZED_MOVEMENT_ALERT',
      notificationId: notification._id,
      details: `Generated unauthorized movement alert for ${assetTag}`,
      metadata: { assetTag, severity },
      status: 'WARNING'
    });

    res.status(201).json({ message: 'Unauthorized movement alert generated successfully', data: notification });
  } catch (err) {
    res.status(500).json({ message: 'Failed to simulate movement alert', error: err.message });
  }
});

/**
 * PATCH /api/notifications/:id/dismiss
 * Dismiss / clear an alert (FR12-03)
 */
router.patch('/:id/dismiss', isAuthenticated, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.status = 'DISMISSED';
    notification.isRead = true;
    notification.readAt = notification.readAt || new Date();
    await notification.save();

    await logNotificationAction(req, {
      action: 'ALERT_DISMISSED',
      notificationId: notification._id,
      details: `Alert "${notification.title}" dismissed`,
      metadata: { title: notification.title },
    });

    res.json({ message: 'Alert dismissed', data: notification });
  } catch (err) {
    res.status(500).json({ message: 'Failed to dismiss alert', error: err.message });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark single notification as read
 */
router.patch('/:id/read', isAuthenticated, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.json({ message: 'Notification marked as read', data: notification });
  } catch (err) {
    res.status(500).json({ message: 'Failed to mark notification as read', error: err.message });
  }
});

/**
 * POST /api/notifications/mark-all-read
 * Mark all notifications as read
 */
router.post('/mark-all-read', isAuthenticated, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    res.json({ message: 'All notifications marked as read', modifiedCount: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ message: 'Failed to mark all as read', error: err.message });
  }
});

/**
 * DELETE /api/notifications/clear-resolved
 * Clear or dismiss all resolved alerts (FR12-03)
 */
router.delete('/clear-resolved', isAuthenticated, isSuperAdmin, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { status: 'RESOLVED' },
      { $set: { status: 'DISMISSED' } }
    );

    await logNotificationAction(req, {
      action: 'ALERT_DISMISSED',
      details: `Cleared ${result.modifiedCount} resolved alerts`,
      metadata: { count: result.modifiedCount },
    });

    res.json({ message: `Cleared ${result.modifiedCount} resolved alerts`, modifiedCount: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ message: 'Failed to clear resolved alerts', error: err.message });
  }
});

/**
 * POST /api/notifications/broadcast
 * Create and broadcast a system-wide announcement/alert
 */
router.post('/broadcast', isAuthenticated, isSuperAdmin, async (req, res) => {
  try {
    const { title, message, type = 'INFO', priority = 'MEDIUM', category = 'SYSTEM' } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const notification = await Notification.create({
      title: title.trim(),
      message: message.trim(),
      type,
      priority,
      category,
      status: 'ACTIVE',
      metadata: {
        broadcastBy: req.user?._id,
        broadcastByName: req.user?.name,
      },
    });

    await logNotificationAction(req, {
      action: 'NOTIFICATION_BROADCAST',
      notificationId: notification._id,
      details: `System broadcast created: "${notification.title}"`,
      metadata: { title: notification.title, priority, category },
    });

    res.status(201).json({ message: 'System alert broadcast successfully', data: notification });
  } catch (err) {
    res.status(500).json({ message: 'Failed to broadcast notification', error: err.message });
  }
});

export default router;
