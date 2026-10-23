import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User.js';
import { isAuthenticated, isSuperAdmin } from '../middleware/auth.js';
import { sendPasswordResetEmail } from '../utils/mailer.js';

const router = express.Router();

/**
 * GET /api/users
 * Retrieve all users (SUPER_ADMIN only)
 * Filters: search, role, status ('active', 'deactivated', 'all')
 */
router.get('/', isAuthenticated, isSuperAdmin, async (req, res) => {
  try {
    const { search, role, status } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (role) {
      query.role = role;
    }

    if (status === 'active') {
      query.isActive = { $ne: false };
    } else if (status === 'deactivated') {
      query.isActive = false;
    }

    const users = await User.find(query).select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/users/:id
 * Retrieve a specific user by ID
 * - SUPER_ADMIN can view any user
 * - Regular users can only view their own profile
 */
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Authorization check: SUPER_ADMIN can view all, users can only view themselves
    if (req.user.role !== 'SUPER_ADMIN' && String(req.user._id) !== String(req.params.id)) {
      return res.status(403).json({ message: 'Forbidden: Cannot view other users' });
    }

    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/users
 * Create a new user (SUPER_ADMIN only)
 * Body: { email, password, name, role }
 */
router.post('/', isAuthenticated, isSuperAdmin, async (req, res) => {
  try {
    const { email, password, name, role, permissions } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    // Validate role
    const validRoles = ['USER', 'ADMIN', 'SUPER_ADMIN'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ message: `Role must be one of: ${validRoles.join(', ')}` });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Create user (marked active and verified when created by admin)
    const user = await User.create({
      email: normalizedEmail,
      password: hashed,
      name: name ? name.trim() : '',
      role: role || 'USER',
      isActive: true,
      isEmailVerified: true,
      permissions: Array.isArray(permissions) ? permissions : []
    });

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        permissions: user.permissions,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/**
 * PUT /api/users/:id
 * Update a user (SUPER_ADMIN can update any user, users can update their own profile)
 * Body: { email, name, role, permissions, isActive, password }
 */
router.put('/:id', isAuthenticated, async (req, res) => {
  try {
    const { email, name, role, permissions, isActive, password } = req.body;

    // Authorization check
    if (req.user.role !== 'SUPER_ADMIN' && String(req.user._id) !== String(req.params.id)) {
      return res.status(403).json({ message: 'Forbidden: Cannot update other users' });
    }

    // Get existing user
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check email uniqueness if email is being updated
    if (email && email.toLowerCase().trim() !== user.email) {
      const normalizedEmail = email.toLowerCase().trim();
      const existing = await User.findOne({ email: normalizedEmail });
      if (existing) {
        return res.status(409).json({ message: 'Email already in use' });
      }
      user.email = normalizedEmail;
    }

    // Update name if provided
    if (name !== undefined) {
      user.name = name.trim();
    }

    // Update role (only SUPER_ADMIN can change roles)
    if (role !== undefined) {
      if (req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ message: 'Forbidden: Only SUPER_ADMIN can change roles' });
      }
      const validRoles = ['USER', 'ADMIN', 'SUPER_ADMIN'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ message: `Role must be one of: ${validRoles.join(', ')}` });
      }
      user.role = role;
    }

    // Update permissions (only SUPER_ADMIN can change permissions)
    if (permissions !== undefined) {
      if (req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ message: 'Forbidden: Only SUPER_ADMIN can change permissions' });
      }
      if (Array.isArray(permissions)) {
        user.permissions = permissions;
      }
    }

    // Update isActive (only SUPER_ADMIN can change status, and cannot deactivate themselves)
    if (isActive !== undefined) {
      if (req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ message: 'Forbidden: Only SUPER_ADMIN can change account status' });
      }
      if (String(req.user._id) === String(req.params.id) && !isActive) {
        return res.status(400).json({ message: 'Cannot deactivate your own account.' });
      }
      user.isActive = Boolean(isActive);
    }

    // Update password if provided
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' });
      }
      user.password = await bcrypt.hash(password, 10);
    }

    await user.save();

    res.json({
      message: 'User updated successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive !== false,
        permissions: user.permissions || [],
        isEmailVerified: user.isEmailVerified
      }
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/**
 * PATCH /api/users/:id/status
 * Toggle user active status (SUPER_ADMIN only)
 * Body: { isActive: boolean }
 */
router.patch('/:id/status', isAuthenticated, isSuperAdmin, async (req, res) => {
  try {
    const { isActive } = req.body;
    if (isActive === undefined) {
      return res.status(400).json({ message: 'isActive boolean is required' });
    }

    if (String(req.user._id) === String(req.params.id) && !isActive) {
      return res.status(400).json({ message: 'Cannot deactivate your own account.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isActive = Boolean(isActive);
    await user.save();

    res.json({
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        permissions: user.permissions || [],
        isEmailVerified: user.isEmailVerified
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/users/:id/reset-password
 * Admin-initiated password reset (SUPER_ADMIN only)
 * Body: { mode: 'email' } OR { mode: 'manual', newPassword: '...' }
 */
router.post('/:id/reset-password', isAuthenticated, isSuperAdmin, async (req, res) => {
  try {
    const { mode, newPassword } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Option 1: Direct manual password override
    if (mode === 'manual') {
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters long' });
      }

      user.password = await bcrypt.hash(newPassword, 10);
      user.resetPasswordToken = null;
      user.resetPasswordCode = null;
      user.resetPasswordExpires = null;
      await user.save();

      return res.json({
        message: `Password for ${user.email} has been updated successfully.`
      });
    }

    // Option 2: Email reset link (default)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    user.resetPasswordToken = resetToken;
    user.resetPasswordCode = resetCode;
    user.resetPasswordExpires = resetExpires;
    await user.save();

    const webBaseUrl = process.env.WEB_URL || process.env.CORS_ORIGIN || 'http://localhost:3000';
    const resetUrl = `${webBaseUrl.replace(/\/$/, '')}/reset-password?token=${resetToken}`;

    await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetToken,
      resetCode,
      resetUrl,
    });

    res.json({
      message: `Password reset instructions sent to ${user.email}`,
      email: user.email,
      ...(process.env.NODE_ENV !== 'production' && { devResetCode: resetCode, devResetUrl: resetUrl })
    });
  } catch (err) {
    res.status(500).json({ message: 'Error initiating password reset', error: err.message });
  }
});

/**
 * DELETE /api/users/:id
 * Delete a user (SUPER_ADMIN only)
 */
router.delete('/:id', isAuthenticated, isSuperAdmin, async (req, res) => {
  try {
    if (String(req.user._id) === String(req.params.id)) {
      return res.status(400).json({ message: 'Cannot delete your own account.' });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * PATCH /api/users/:id/role
 * Update user role (SUPER_ADMIN only)
 * Body: { role }
 */
router.patch('/:id/role', isAuthenticated, isSuperAdmin, async (req, res) => {
  try {
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ message: 'Role is required' });
    }

    const validRoles = ['USER', 'ADMIN', 'SUPER_ADMIN'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: `Role must be one of: ${validRoles.join(', ')}` });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User role updated successfully',
      user
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
