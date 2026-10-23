import express from 'express';
import MaintenanceSchedule from '../models/MaintenanceSchedule.js';
import Asset from '../models/Asset.js';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import { isAuthenticated } from '../middleware/auth.js';
import {
  sendMaintenanceScheduledEmail,
  sendMaintenanceReminderEmail,
  sendMaintenanceRescheduledEmail
} from '../utils/mailer.js';

const router = express.Router();

/**
 * Helper to log maintenance audit events
 */
const logMaintenanceAction = async (req, { action, scheduleId, assetId, assetTag, assetName, details = '', metadata = {}, status = 'SUCCESS' }) => {
  try {
    const rawIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'Unknown';
    const ipAddress = (typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : 'Unknown').replace(/^::ffff:/, '');
    const userAgent = req.headers['user-agent'] || 'Unknown';

    await AuditLog.create({
      userId: req.user?._id || null,
      email: req.user?.email || null,
      userName: req.user?.name || 'System Admin',
      role: req.user?.role || 'SUPER_ADMIN',
      targetType: 'MAINTENANCE',
      targetId: scheduleId || assetId || null,
      action,
      ipAddress,
      userAgent,
      status,
      details,
      metadata: {
        assetId,
        assetTag,
        assetName,
        ...metadata,
      }
    });
  } catch (err) {
    console.error('[MaintenanceAudit] Failed to record log:', err.message);
  }
};

/**
 * GET /api/maintenance/stats
 * Overview counts of maintenance statuses
 */
router.get('/stats', isAuthenticated, async (req, res) => {
  try {
    const now = new Date();
    const [total, scheduled, inProgress, completed, overdue] = await Promise.all([
      MaintenanceSchedule.countDocuments(),
      MaintenanceSchedule.countDocuments({ status: 'SCHEDULED' }),
      MaintenanceSchedule.countDocuments({ status: 'IN_PROGRESS' }),
      MaintenanceSchedule.countDocuments({ status: 'COMPLETED' }),
      MaintenanceSchedule.countDocuments({
        status: { $in: ['SCHEDULED', 'IN_PROGRESS'] },
        scheduledDate: { $lt: now }
      })
    ]);

    res.json({
      total,
      scheduled,
      inProgress,
      completed,
      overdue
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch maintenance stats', error: err.message });
  }
});

/**
 * GET /api/maintenance/asset/:assetId (FR11-03)
 * Maintenance history for a specific asset
 */
router.get('/asset/:assetId', isAuthenticated, async (req, res) => {
  try {
    const schedules = await MaintenanceSchedule.find({ assetId: req.params.assetId })
      .populate('assetId', 'name assetTag assetType status imageUrl')
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email')
      .populate('completedBy', 'name email')
      .sort({ scheduledDate: -1 });

    res.json(schedules);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch asset maintenance history', error: err.message });
  }
});

/**
 * GET /api/maintenance
 * List maintenance schedules with search & filters
 */
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const { status, priority, assetId, search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (status && status !== 'all') {
      if (status === 'OVERDUE') {
        query.status = { $in: ['SCHEDULED', 'IN_PROGRESS'] };
        query.scheduledDate = { $lt: new Date() };
      } else {
        query.status = status;
      }
    }

    if (priority && priority !== 'all') {
      query.priority = priority;
    }

    if (assetId) {
      query.assetId = assetId;
    }

    if (search && search.trim()) {
      const matchedAssets = await Asset.find({
        $or: [
          { name: { $regex: search.trim(), $options: 'i' } },
          { assetTag: { $regex: search.trim(), $options: 'i' } }
        ]
      }).select('_id');

      const assetIds = matchedAssets.map(a => a._id);
      query.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
        { assetId: { $in: assetIds } }
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [schedules, total] = await Promise.all([
      MaintenanceSchedule.find(query)
        .populate('assetId', 'name assetTag assetType status imageUrl department')
        .populate('assignedTo', 'name email role')
        .populate('createdBy', 'name email')
        .populate('completedBy', 'name email')
        .sort({ scheduledDate: 1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      MaintenanceSchedule.countDocuments(query),
    ]);

    res.json({
      data: schedules,
      total,
      page: parseInt(page, 10),
      pages: Math.ceil(total / parseInt(limit, 10))
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch maintenance tasks', error: err.message });
  }
});

/**
 * GET /api/maintenance/:id
 * Get single maintenance task
 */
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const schedule = await MaintenanceSchedule.findById(req.params.id)
      .populate('assetId', 'name assetTag assetType status imageUrl roomId department')
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email')
      .populate('completedBy', 'name email');

    if (!schedule) {
      return res.status(404).json({ message: 'Maintenance task not found' });
    }

    res.json(schedule);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch maintenance task', error: err.message });
  }
});

/**
 * POST /api/maintenance (FR11-01, FR11-02, FR11-03)
 * Schedule new maintenance for an asset
 */
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const { assetId, title, description, scheduledDate, priority = 'MEDIUM', assignedTo, notes, setAssetMaintenance = true } = req.body;

    if (!assetId || !title || !scheduledDate) {
      return res.status(400).json({ message: 'assetId, title, and scheduledDate are required' });
    }

    const asset = await Asset.findById(assetId).populate('ownerId', 'name email');
    if (!asset) {
      return res.status(404).json({ message: 'Target asset not found' });
    }

    const schedule = await MaintenanceSchedule.create({
      assetId,
      title: title.trim(),
      description: description ? description.trim() : '',
      scheduledDate: new Date(scheduledDate),
      priority,
      status: 'SCHEDULED',
      assignedTo: assignedTo || null,
      createdBy: req.user._id,
      notes: notes || '',
    });

    // Optionally update asset status to MAINTENANCE
    if (setAssetMaintenance && asset.status !== 'MAINTENANCE') {
      asset.status = 'MAINTENANCE';
      await asset.save();
    }

    // Record audit log
    await logMaintenanceAction(req, {
      action: 'MAINTENANCE_SCHEDULED',
      scheduleId: schedule._id,
      assetId: asset._id,
      assetTag: asset.assetTag,
      assetName: asset.name,
      details: `Scheduled maintenance '${title}' on ${new Date(scheduledDate).toLocaleDateString()}`,
      metadata: { priority, scheduledDate }
    });

    // FR11-02: Notify staff about upcoming maintenance
    let notifyEmail = null;
    let notifyName = null;

    if (assignedTo) {
      const assignee = await User.findById(assignedTo);
      if (assignee && assignee.email) {
        notifyEmail = assignee.email;
        notifyName = assignee.name;
      }
    }

    if (!notifyEmail && asset.ownerId && asset.ownerId.email) {
      notifyEmail = asset.ownerId.email;
      notifyName = asset.ownerId.name;
    }

    if (notifyEmail) {
      sendMaintenanceScheduledEmail({
        to: notifyEmail,
        staffName: notifyName,
        assetName: asset.name,
        assetTag: asset.assetTag,
        scheduledDate,
        title,
        description,
        priority
      }).catch(e => console.error('[Maintenance] Email send failed:', e.message));
    }

    const populated = await MaintenanceSchedule.findById(schedule._id)
      .populate('assetId', 'name assetTag assetType status')
      .populate('assignedTo', 'name email');

    res.status(201).json({
      message: 'Maintenance task successfully scheduled',
      data: populated,
    });
  } catch (err) {
    console.error('Error creating maintenance schedule:', err);
    res.status(500).json({ message: 'Failed to schedule maintenance', error: err.message });
  }
});

/**
 * PUT /api/maintenance/:id/reschedule (FR11-05)
 * Reschedule maintenance task
 */
router.put('/:id/reschedule', isAuthenticated, async (req, res) => {
  try {
    const { newDate, reason } = req.body;
    if (!newDate) {
      return res.status(400).json({ message: 'newDate is required' });
    }

    const schedule = await MaintenanceSchedule.findById(req.params.id)
      .populate('assetId', 'name assetTag')
      .populate('assignedTo', 'name email');

    if (!schedule) {
      return res.status(404).json({ message: 'Maintenance task not found' });
    }

    if (schedule.status === 'COMPLETED' || schedule.status === 'CANCELLED') {
      return res.status(400).json({ message: `Cannot reschedule a ${schedule.status.toLowerCase()} task` });
    }

    const oldDate = schedule.scheduledDate;
    schedule.previousDates.push({
      date: oldDate,
      rescheduledAt: new Date(),
      reason: reason || '',
      rescheduledBy: req.user._id,
    });

    schedule.scheduledDate = new Date(newDate);
    schedule.rescheduledCount = (schedule.rescheduledCount || 0) + 1;
    schedule.reminderSent = false;
    await schedule.save();

    // Audit log
    await logMaintenanceAction(req, {
      action: 'MAINTENANCE_RESCHEDULED',
      scheduleId: schedule._id,
      assetId: schedule.assetId?._id,
      assetTag: schedule.assetId?.assetTag,
      assetName: schedule.assetId?.name,
      details: `Rescheduled from ${new Date(oldDate).toLocaleDateString()} to ${new Date(newDate).toLocaleDateString()}. Reason: ${reason || 'Not specified'}`,
      metadata: { oldDate, newDate, reason }
    });

    // Notify staff
    const recipientEmail = schedule.assignedTo?.email;
    if (recipientEmail) {
      sendMaintenanceRescheduledEmail({
        to: recipientEmail,
        staffName: schedule.assignedTo?.name,
        assetName: schedule.assetId?.name,
        assetTag: schedule.assetId?.assetTag,
        oldDate,
        newDate,
        reason
      }).catch(e => console.error('[Maintenance] Reschedule email failed:', e.message));
    }

    res.json({
      message: 'Maintenance task rescheduled successfully',
      data: schedule,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to reschedule maintenance', error: err.message });
  }
});

/**
 * PATCH /api/maintenance/:id/status
 * Mark maintenance as COMPLETED, IN_PROGRESS, or CANCELLED
 */
router.patch('/:id/status', isAuthenticated, async (req, res) => {
  try {
    const { status, notes, restoreAssetStatus = true } = req.body;
    if (!status || !['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ message: 'Valid status is required' });
    }

    const schedule = await MaintenanceSchedule.findById(req.params.id)
      .populate('assetId');

    if (!schedule) {
      return res.status(404).json({ message: 'Maintenance task not found' });
    }

    schedule.status = status;
    if (notes) schedule.notes = notes;

    if (status === 'COMPLETED') {
      schedule.completedAt = new Date();
      schedule.completedBy = req.user._id;

      // Check if asset can be restored to ACTIVE
      if (restoreAssetStatus && schedule.assetId) {
        const remainingOpen = await MaintenanceSchedule.countDocuments({
          assetId: schedule.assetId._id,
          _id: { $ne: schedule._id },
          status: { $in: ['SCHEDULED', 'IN_PROGRESS'] }
        });

        if (remainingOpen === 0 && schedule.assetId.status === 'MAINTENANCE') {
          schedule.assetId.status = 'ACTIVE';
          await schedule.assetId.save();
        }
      }
    }

    await schedule.save();

    // Audit log
    await logMaintenanceAction(req, {
      action: status === 'COMPLETED' ? 'MAINTENANCE_COMPLETED' : 'MAINTENANCE_CANCELLED',
      scheduleId: schedule._id,
      assetId: schedule.assetId?._id,
      assetTag: schedule.assetId?.assetTag,
      assetName: schedule.assetId?.name,
      details: `Maintenance task marked as ${status}. ${notes ? `Notes: ${notes}` : ''}`,
      metadata: { status, notes }
    });

    res.json({
      message: `Maintenance status updated to ${status}`,
      data: schedule,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update maintenance status', error: err.message });
  }
});

/**
 * PUT /api/maintenance/:id
 * Update general task details
 */
router.put('/:id', isAuthenticated, async (req, res) => {
  try {
    const { title, description, priority, assignedTo, notes } = req.body;
    const schedule = await MaintenanceSchedule.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({ message: 'Maintenance task not found' });
    }

    if (title) schedule.title = title.trim();
    if (description !== undefined) schedule.description = description.trim();
    if (priority) schedule.priority = priority;
    if (assignedTo !== undefined) schedule.assignedTo = assignedTo || null;
    if (notes !== undefined) schedule.notes = notes;

    await schedule.save();
    res.json({ message: 'Maintenance task updated', data: schedule });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update maintenance task', error: err.message });
  }
});

/**
 * DELETE /api/maintenance/:id
 * Remove a maintenance schedule
 */
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Only super admins can delete maintenance schedules' });
    }

    const schedule = await MaintenanceSchedule.findByIdAndDelete(req.params.id);
    if (!schedule) {
      return res.status(404).json({ message: 'Maintenance task not found' });
    }

    res.json({ message: 'Maintenance task removed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete maintenance task', error: err.message });
  }
});

/**
 * Helper to check and dispatch reminders for tasks due within the next 48 hours (FR11-04)
 */
export async function checkDueMaintenanceReminders() {
  const now = new Date();
  const lookahead = new Date(now.getTime() + 48 * 60 * 60 * 1000); // next 48 hours

  const dueTasks = await MaintenanceSchedule.find({
    status: 'SCHEDULED',
    reminderSent: false,
    scheduledDate: { $gte: now, $lte: lookahead }
  })
    .populate('assetId', 'name assetTag ownerId')
    .populate('assignedTo', 'name email');

  let sentCount = 0;
  for (const task of dueTasks) {
    let recipientEmail = task.assignedTo?.email;
    let recipientName = task.assignedTo?.name;

    if (!recipientEmail && task.assetId?.ownerId) {
      const owner = await User.findById(task.assetId.ownerId);
      if (owner && owner.email) {
        recipientEmail = owner.email;
        recipientName = owner.name;
      }
    }

    if (recipientEmail) {
      const result = await sendMaintenanceReminderEmail({
        to: recipientEmail,
        staffName: recipientName,
        assetName: task.assetId?.name || 'Asset',
        assetTag: task.assetId?.assetTag || 'TAG',
        scheduledDate: task.scheduledDate,
        title: task.title,
        description: task.description
      });

      if (result.sent || result.simulated) {
        task.reminderSent = true;
        await task.save();
        sentCount++;
      }
    }
  }

  return { dispatched: sentCount, tasksChecked: dueTasks.length };
}

/**
 * POST /api/maintenance/reminders/check (FR11-04)
 * Scan and dispatch reminders for tasks due within the next 48 hours
 */
router.post('/reminders/check', isAuthenticated, async (req, res) => {
  try {
    const result = await checkDueMaintenanceReminders();
    res.json({
      message: `Processed reminders check. Dispatched ${result.dispatched} reminders.`,
      dispatched: result.dispatched,
      tasksChecked: result.tasksChecked
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to process reminders check', error: err.message });
  }
});

export default router;
