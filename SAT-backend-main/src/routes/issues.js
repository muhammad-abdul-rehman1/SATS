import express from 'express';
import mongoose from 'mongoose';
import Issue from '../models/Issue.js';
import Asset from '../models/Asset.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';
import { isAuthenticated } from '../middleware/auth.js';
import { sendAssetIssueReportedEmail } from '../utils/mailer.js';

const router = express.Router();

/**
 * Audit log helper for issue actions
 */
const logIssueAction = async (req, { action, issueId, assetId, assetTag, details = '', metadata = {}, status = 'SUCCESS' }) => {
  try {
    const rawIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'Unknown';
    const ipAddress = (typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : 'Unknown').replace(/^::ffff:/, '');
    const userAgent = req.headers['user-agent'] || 'Unknown';

    await AuditLog.create({
      userId: req.user?._id || null,
      email: req.user?.email || null,
      userName: req.user?.name || 'System User',
      role: req.user?.role || 'STAFF',
      targetType: 'ASSET',
      targetId: assetId || issueId || null,
      action,
      ipAddress,
      userAgent,
      status,
      details,
      metadata: {
        issueId,
        assetId,
        assetTag,
        ...metadata,
      },
    });
  } catch (err) {
    console.error('[IssueAudit] Error logging audit action:', err.message);
  }
};

/**
 * POST /api/issues (FR25-01, FR25-02, FR25-03, FR25-04, TC-25 Steps 2-6)
 * Report a new issue with an asset
 */
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const { assetId, assetTag, title, description, priority = 'MEDIUM', imageUrl } = req.body;

    // Validation: Description is required
    if (!description || !description.trim()) {
      return res.status(400).json({ message: 'Issue description is required' });
    }

    // Resolve Asset
    let asset = null;
    if (assetId && mongoose.Types.ObjectId.isValid(assetId)) {
      asset = await Asset.findById(assetId);
    }
    if (!asset && assetTag) {
      asset = await Asset.findOne({ assetTag: assetTag.trim() });
    }
    if (!asset && assetId) {
      asset = await Asset.findOne({ assetTag: assetId.trim() });
    }

    if (!asset) {
      return res.status(404).json({ message: 'Asset not found for issue report' });
    }

    const resolvedTitle = (title && title.trim())
      ? title.trim()
      : description.trim().slice(0, 60);

    // Create the Issue (FR25-02)
    const issue = await Issue.create({
      assetId: asset._id,
      assetTag: asset.assetTag,
      assetName: asset.name,
      title: resolvedTitle,
      description: description.trim(),
      priority: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(priority) ? priority : 'MEDIUM',
      status: 'OPEN',
      imageUrl: imageUrl || null,
      reportedBy: req.user._id,
      reportedByName: req.user.name,
      reportedByEmail: req.user.email,
    });

    // Notify Admins in-app (FR25-03, TC-25 Step 6)
    try {
      const admins = await User.find({ role: 'SUPER_ADMIN' }).select('_id email name');
      const notifPriority = issue.priority === 'CRITICAL' ? 'CRITICAL' : 'HIGH';

      for (const admin of admins) {
        await Notification.create({
          userId: admin._id,
          title: `Asset Issue Reported: ${asset.assetTag}`,
          message: `Issue "${issue.title}" reported by ${req.user.name} on ${asset.name} (${asset.assetTag}): ${issue.description.slice(0, 120)}`,
          type: 'ASSET_ISSUE',
          category: 'ASSET',
          priority: notifPriority,
          link: `/my-issues?assetTag=${asset.assetTag}`,
          assetId: asset._id,
          assetTag: asset.assetTag,
        });
      }

      // Email notification to admin@sats.com and configured admins (FR25-03, TC-25 Step 6)
      const recipientEmails = new Set(['admin@sats.com']);
      admins.forEach(a => { if (a.email) recipientEmails.add(a.email); });

      for (const email of recipientEmails) {
        await sendAssetIssueReportedEmail({
          to: email,
          adminName: 'Administrator',
          reporterName: req.user.name,
          reporterEmail: req.user.email,
          assetTag: asset.assetTag,
          assetName: asset.name,
          title: issue.title,
          description: issue.description,
          priority: issue.priority,
          imageUrl: issue.imageUrl,
        });
      }
    } catch (notifErr) {
      console.error('[Issue] Failed to dispatch admin notifications:', notifErr.message);
    }

    // Record Audit Log
    await logIssueAction(req, {
      action: 'ASSET_ISSUE_REPORTED',
      issueId: issue._id,
      assetId: asset._id,
      assetTag: asset.assetTag,
      details: `Reported issue "${issue.title}" (${issue.priority}) on asset ${asset.assetTag}`,
      metadata: { priority: issue.priority, status: issue.status, hasImage: !!imageUrl },
    });

    res.status(201).json({
      success: true,
      message: 'Asset issue reported successfully and administrators notified.',
      issue,
    });
  } catch (error) {
    console.error('[Issue] Error reporting issue:', error);
    res.status(500).json({ message: 'Failed to report asset issue', error: error.message });
  }
});

/**
 * GET /api/issues/my-issues (FR25-05, TC-25 Step 7)
 * List issues reported by the logged-in user
 */
router.get('/my-issues', isAuthenticated, async (req, res) => {
  try {
    const { status, search } = req.query;
    const query = { reportedBy: req.user._id };

    if (status && status !== 'ALL') {
      query.status = status;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { title: regex },
        { description: regex },
        { assetTag: regex },
        { assetName: regex },
      ];
    }

    const issues = await Issue.find(query)
      .populate('assetId', 'name assetTag assetType status imageUrl roomId')
      .populate('assignedTo', 'name email role')
      .populate('resolvedBy', 'name email')
      .sort({ createdAt: -1 });

    const total = issues.length;
    const openCount = issues.filter(i => i.status === 'OPEN').length;
    const inProgressCount = issues.filter(i => ['UNDER_REVIEW', 'IN_PROGRESS'].includes(i.status)).length;
    const resolvedCount = issues.filter(i => ['RESOLVED', 'CLOSED'].includes(i.status)).length;

    res.json({
      issues,
      total,
      stats: {
        total,
        open: openCount,
        inProgress: inProgressCount,
        resolved: resolvedCount,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch your reported issues', error: error.message });
  }
});

/**
 * GET /api/issues
 * List all issues with search, filters, and pagination (Admin & Staff)
 */
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const { status, priority, assetId, assetTag, search, page = 1, limit = 50 } = req.query;
    const query = {};

    // Non-admins see either their own or assigned
    if (req.user.role !== 'SUPER_ADMIN') {
      query.$or = [
        { reportedBy: req.user._id },
        { assignedTo: req.user._id },
      ];
    }

    if (status && status !== 'ALL') query.status = status;
    if (priority && priority !== 'ALL') query.priority = priority;
    if (assetId && mongoose.Types.ObjectId.isValid(assetId)) query.assetId = assetId;
    if (assetTag) query.assetTag = assetTag.trim();

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      const searchConditions = [
        { title: regex },
        { description: regex },
        { assetTag: regex },
        { assetName: regex },
        { reportedByName: regex },
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchConditions }];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [issues, total, open, inProgress, resolved] = await Promise.all([
      Issue.find(query)
        .populate('assetId', 'name assetTag assetType status imageUrl roomId')
        .populate('reportedBy', 'name email role')
        .populate('assignedTo', 'name email role')
        .populate('resolvedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Issue.countDocuments(query),
      Issue.countDocuments({ ...query, status: 'OPEN' }),
      Issue.countDocuments({ ...query, status: { $in: ['UNDER_REVIEW', 'IN_PROGRESS'] } }),
      Issue.countDocuments({ ...query, status: { $in: ['RESOLVED', 'CLOSED'] } }),
    ]);

    res.json({
      issues,
      total,
      stats: {
        total,
        open,
        inProgress,
        resolved,
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch issues', error: error.message });
  }
});

/**
 * GET /api/issues/asset/:assetId
 * Get issues for a specific asset
 */
router.get('/asset/:assetId', isAuthenticated, async (req, res) => {
  try {
    let assetQuery = {};
    if (mongoose.Types.ObjectId.isValid(req.params.assetId)) {
      assetQuery = { assetId: req.params.assetId };
    } else {
      assetQuery = { assetTag: req.params.assetId };
    }

    const issues = await Issue.find(assetQuery)
      .populate('reportedBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('resolvedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(issues);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch asset issues', error: error.message });
  }
});

/**
 * GET /api/issues/:id
 * Get single issue details
 */
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id)
      .populate('assetId', 'name assetTag assetType status imageUrl roomId')
      .populate('reportedBy', 'name email role')
      .populate('assignedTo', 'name email role')
      .populate('resolvedBy', 'name email role');

    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    res.json(issue);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch issue details', error: error.message });
  }
});

/**
 * PATCH /api/issues/:id/status (FR25-05)
 * Update status, resolution notes, or assigned staff
 */
router.patch('/:id/status', isAuthenticated, async (req, res) => {
  try {
    const { status, resolutionNotes, assignedTo } = req.body;
    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    const oldStatus = issue.status;
    if (status) issue.status = status;
    if (resolutionNotes !== undefined) issue.resolutionNotes = resolutionNotes;
    if (assignedTo !== undefined) issue.assignedTo = assignedTo || null;

    if (['RESOLVED', 'CLOSED'].includes(status)) {
      issue.resolvedBy = req.user._id;
      issue.resolvedAt = new Date();
    } else if (status === 'OPEN' || status === 'IN_PROGRESS') {
      issue.resolvedBy = null;
      issue.resolvedAt = null;
    }

    await issue.save();

    // Notify the original reporter in-app about status resolution/progress
    try {
      if (String(issue.reportedBy) !== String(req.user._id)) {
        await Notification.create({
          userId: issue.reportedBy,
          title: `Issue Status Updated: ${issue.assetTag}`,
          message: `Your reported issue "${issue.title}" is now marked as ${issue.status}.${resolutionNotes ? ` Resolution: ${resolutionNotes}` : ''}`,
          type: 'ASSET_ISSUE',
          category: 'ASSET',
          priority: 'MEDIUM',
          link: `/my-issues?issueId=${issue._id}`,
          assetId: issue.assetId,
          assetTag: issue.assetTag,
        });
      }
    } catch (notifErr) {
      console.warn('[Issue] Failed to notify reporter:', notifErr.message);
    }

    // Audit log
    await logIssueAction(req, {
      action: 'ASSET_ISSUE_STATUS_UPDATED',
      issueId: issue._id,
      assetId: issue.assetId,
      assetTag: issue.assetTag,
      details: `Status changed from ${oldStatus} to ${issue.status}`,
      metadata: { oldStatus, newStatus: issue.status, resolutionNotes },
    });

    res.json({
      success: true,
      message: `Issue status updated to ${issue.status}`,
      issue,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update issue status', error: error.message });
  }
});

/**
 * DELETE /api/issues/:id
 * Delete an issue (Super Admin or reporter if still OPEN)
 */
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: 'Issue not found' });

    const isReporter = String(issue.reportedBy) === String(req.user._id);
    const isSuperAdmin = req.user.role === 'SUPER_ADMIN';

    if (!isSuperAdmin && (!isReporter || issue.status !== 'OPEN')) {
      return res.status(403).json({ message: 'Not authorized to delete this issue' });
    }

    await Issue.findByIdAndDelete(req.params.id);

    await logIssueAction(req, {
      action: 'ASSET_ISSUE_DELETED',
      issueId: issue._id,
      assetId: issue.assetId,
      assetTag: issue.assetTag,
      details: `Issue "${issue.title}" deleted`,
    });

    res.json({ success: true, message: 'Issue deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete issue', error: error.message });
  }
});

export default router;
