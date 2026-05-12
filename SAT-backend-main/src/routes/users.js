import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { isAuthenticated, isSuperAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/users
 * Retrieve all users (SUPER_ADMIN only)
 */
router.get('/', isAuthenticated, isSuperAdmin, async (req, res) => {
  try {
    const { search, role } = req.query;
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
    const { email, password, name, role } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Check if user already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    // Validate role
    const validRoles = ['USER', 'SUPER_ADMIN'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ message: `Role must be one of: ${validRoles.join(', ')}` });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      email,
      password: hashed,
      name: name || '',
      role: role || 'USER'
    });

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/**
 * PUT /api/users/:id
 * Update a user (SUPER_ADMIN can update any user, users can update their own profile)
 * Body: { email, name, role, password }
 */
router.put('/:id', isAuthenticated, async (req, res) => {
  try {
    const { email, name, role, password } = req.body;

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
    if (email && email !== user.email) {
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(409).json({ message: 'Email already in use' });
      }
      user.email = email;
    }

    // Update name if provided
    if (name !== undefined) {
      user.name = name;
    }

    // Update role (only SUPER_ADMIN can change roles)
    if (role !== undefined) {
      if (req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ message: 'Forbidden: Only SUPER_ADMIN can change roles' });
      }
      const validRoles = ['USER', 'SUPER_ADMIN'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ message: `Role must be one of: ${validRoles.join(', ')}` });
      }
      user.role = role;
    }

    // Update password if provided
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    await user.save();

    res.json({
      message: 'User updated successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/**
 * DELETE /api/users/:id
 * Delete a user (SUPER_ADMIN only)
 */
router.delete('/:id', isAuthenticated, isSuperAdmin, async (req, res) => {
  try {
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

    const validRoles = ['USER', 'SUPER_ADMIN'];
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
