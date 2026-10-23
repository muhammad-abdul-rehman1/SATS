import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import { isAuthenticated } from '../middleware/auth.js';
import { sendPasswordResetEmail, sendVerificationEmail, sendTwoFactorCodeEmail } from '../utils/mailer.js';

const router = express.Router();

/**
 * Extract client IP address for security monitoring (FR02-05)
 */
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'Unknown';
}

// Simple health check (unauthenticated)
router.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      if (!existing.isEmailVerified) {
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const hashed = await bcrypt.hash(password, 10);
        existing.password = hashed;
        if (name) existing.name = name;
        existing.emailVerificationCode = verificationCode;
        existing.emailVerificationExpires = verificationExpires;
        await existing.save();

        const webBaseUrl = process.env.WEB_URL || process.env.CORS_ORIGIN || 'http://localhost:3000';
        const verificationUrl = `${webBaseUrl.replace(/\/$/, '')}/verify-email?email=${encodeURIComponent(existing.email)}&code=${verificationCode}`;

        await sendVerificationEmail({
          to: existing.email,
          name: existing.name,
          verificationCode,
          verificationUrl,
        });

        return res.status(200).json({
          message: 'An unverified account already exists for this email. A new verification code has been sent!',
          email: existing.email,
          requireVerification: true,
          ...(process.env.NODE_ENV !== 'production' && { devVerificationCode: verificationCode })
        });
      }
      return res.status(409).json({ message: 'Email is already registered and verified. Please log in.' });
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: normalizedEmail,
      password: hashed,
      name,
      role: role || 'USER',
      isEmailVerified: false,
      emailVerificationCode: verificationCode,
      emailVerificationExpires: verificationExpires,
    });

    const webBaseUrl = process.env.WEB_URL || process.env.CORS_ORIGIN || 'http://localhost:3000';
    const verificationUrl = `${webBaseUrl.replace(/\/$/, '')}/verify-email?email=${encodeURIComponent(user.email)}&code=${verificationCode}`;

    await sendVerificationEmail({
      to: user.email,
      name: user.name,
      verificationCode,
      verificationUrl,
    });

    res.status(201).json({
      message: 'Registration successful! A 6-digit verification code has been sent to your email address.',
      email: user.email,
      requireVerification: true,
      ...(process.env.NODE_ENV !== 'production' && { devVerificationCode: verificationCode })
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post('/verify-email', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ message: 'Email and verification code are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isEmailVerified) {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '336h' });
      return res.json({
        message: 'Account is already verified.',
        token,
        user: { id: user._id, email: user.email, role: user.role, name: user.name }
      });
    }

    if (user.emailVerificationCode !== code.trim()) {
      return res.status(400).json({ message: 'Invalid verification code. Please check your email.' });
    }

    if (user.emailVerificationExpires && new Date() > user.emailVerificationExpires) {
      return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
    }

    // Mark verified
    user.isEmailVerified = true;
    user.emailVerificationCode = null;
    user.emailVerificationExpires = null;
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '336h' });
    res.json({
      message: 'Email verified successfully! You are now logged in.',
      token,
      user: { id: user._id, email: user.email, role: user.role, name: user.name }
    });
  } catch (err) {
    res.status(500).json({ message: 'Error verifying email', error: err.message });
  }
});

router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'Account is already verified.' });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.emailVerificationCode = verificationCode;
    user.emailVerificationExpires = verificationExpires;
    await user.save();

    const webBaseUrl = process.env.WEB_URL || process.env.CORS_ORIGIN || 'http://localhost:3000';
    const verificationUrl = `${webBaseUrl.replace(/\/$/, '')}/verify-email?email=${encodeURIComponent(user.email)}&code=${verificationCode}`;

    await sendVerificationEmail({
      to: user.email,
      name: user.name,
      verificationCode,
      verificationUrl,
    });

    res.json({
      message: 'A new verification code has been sent to your email.',
      email: user.email,
      ...(process.env.NODE_ENV !== 'production' && { devVerificationCode: verificationCode })
    });
  } catch (err) {
    res.status(500).json({ message: 'Error resending verification code', error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const clientIp = getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      await AuditLog.create({
        email: normalizedEmail,
        action: 'LOGIN_FAILED',
        status: 'FAILURE',
        ipAddress: clientIp,
        userAgent,
        details: 'Failed login: user account does not exist.'
      });
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // FR02-04: Account Lockout Check
    if (user.lockUntil && user.lockUntil > new Date()) {
      const remainingMinutes = Math.max(1, Math.ceil((user.lockUntil.getTime() - Date.now()) / (60 * 1000)));
      await AuditLog.create({
        userId: user._id,
        email: user.email,
        userName: user.name,
        role: user.role,
        action: 'LOGIN_FAILED',
        status: 'FAILURE',
        ipAddress: clientIp,
        userAgent,
        details: `Login rejected: account is locked. Remaining time: ${remainingMinutes} minute(s).`
      });
      return res.status(423).json({
        message: `Account has been temporarily locked due to multiple failed login attempts. Please try again in ${remainingMinutes} minute(s) or reset your password.`,
        isLocked: true,
        remainingMinutes
      });
    }

    // Authenticate password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      // FR02-04: Failed attempts counter
      const attempts = (user.failedLoginAttempts || 0) + 1;
      user.failedLoginAttempts = attempts;

      if (attempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15-minute lockout
        await user.save();

        await AuditLog.create({
          userId: user._id,
          email: user.email,
          userName: user.name,
          role: user.role,
          action: 'ACCOUNT_LOCKED',
          status: 'WARNING',
          ipAddress: clientIp,
          userAgent,
          details: 'Account locked for 15 minutes after 5 consecutive failed login attempts.'
        });

        return res.status(423).json({
          message: 'Account has been temporarily locked due to 5 consecutive failed login attempts. Please try again after 15 minutes or reset your password.',
          isLocked: true,
          remainingMinutes: 15
        });
      } else {
        await user.save();
        const remainingAttempts = 5 - attempts;

        await AuditLog.create({
          userId: user._id,
          email: user.email,
          userName: user.name,
          role: user.role,
          action: 'LOGIN_FAILED',
          status: 'FAILURE',
          ipAddress: clientIp,
          userAgent,
          details: `Password mismatch. Failed attempt ${attempts}/5.`
        });

        return res.status(400).json({
          message: `Invalid email or password. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining before account lockout.`,
          remainingAttempts
        });
      }
    }

    // Check account active status
    if (user.isActive === false) {
      await AuditLog.create({
        userId: user._id,
        email: user.email,
        userName: user.name,
        role: user.role,
        action: 'LOGIN_FAILED',
        status: 'FAILURE',
        ipAddress: clientIp,
        userAgent,
        details: 'Login rejected: account is deactivated.'
      });
      return res.status(403).json({
        message: 'Your account has been deactivated. Please contact an administrator.'
      });
    }

    // Check email verification status
    if (user.isEmailVerified === false) {
      return res.status(403).json({
        message: 'Please verify your email address to log in.',
        requireVerification: true,
        email: user.email,
      });
    }

    // Successful password match: reset failed login attempts
    user.failedLoginAttempts = 0;
    user.lockUntil = null;

    // FR02-06: Two-Factor Authentication Check
    if (user.twoFactorEnabled) {
      const twoFactorCode = Math.floor(100000 + Math.random() * 900000).toString();
      user.twoFactorCode = twoFactorCode;
      user.twoFactorExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      await user.save();

      await AuditLog.create({
        userId: user._id,
        email: user.email,
        userName: user.name,
        role: user.role,
        action: '2FA_CHALLENGE',
        status: 'SUCCESS',
        ipAddress: clientIp,
        userAgent,
        details: '2FA code generated and dispatched to email.'
      });

      await sendTwoFactorCodeEmail({
        to: user.email,
        name: user.name,
        code: twoFactorCode,
      });

      const tempToken = jwt.sign(
        { id: user._id, type: '2fa_pending' },
        process.env.JWT_SECRET,
        { expiresIn: '10m' }
      );

      return res.json({
        require2FA: true,
        tempToken,
        email: user.email,
        message: 'A 6-digit two-factor authentication code has been sent to your email.',
        ...(process.env.NODE_ENV !== 'production' && { devCode: twoFactorCode }),
      });
    }

    // FR02-05: Record login time and IP address
    user.lastLoginAt = new Date();
    user.lastLoginIp = clientIp;
    await user.save();

    await AuditLog.create({
      userId: user._id,
      email: user.email,
      userName: user.name,
      role: user.role,
      action: 'LOGIN_SUCCESS',
      status: 'SUCCESS',
      ipAddress: clientIp,
      userAgent,
      details: 'User logged in successfully.'
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '336h' });
    res.json({ 
      token, 
      user: { 
        id: user._id, 
        email: user.email, 
        role: user.role, 
        name: user.name,
        isActive: user.isActive !== false,
        permissions: user.permissions || [],
        twoFactorEnabled: Boolean(user.twoFactorEnabled),
        lastLoginAt: user.lastLoginAt,
        lastLoginIp: user.lastLoginIp
      } 
    });
  } catch (err) {
    res.status(500).json({ message: 'Error during login', error: err.message });
  }
});

/**
 * POST /api/auth/verify-2fa
 * Verifies 6-digit 2FA code and issues full JWT authentication token (FR02-06)
 */
router.post('/verify-2fa', async (req, res) => {
  try {
    const { tempToken, code } = req.body;
    if (!tempToken || !code) {
      return res.status(400).json({ message: 'Verification token and 6-digit code are required.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ message: '2FA session has expired. Please log in again.' });
    }

    if (decoded.type !== '2fa_pending') {
      return res.status(400).json({ message: 'Invalid token for 2FA verification.' });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const clientIp = getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'Unknown';

    if (!user.twoFactorCode || user.twoFactorCode !== code.trim()) {
      await AuditLog.create({
        userId: user._id,
        email: user.email,
        userName: user.name,
        role: user.role,
        action: '2FA_FAILED',
        status: 'FAILURE',
        ipAddress: clientIp,
        userAgent,
        details: 'Invalid 2FA code entered.'
      });
      return res.status(400).json({ message: 'Invalid 2FA code. Please verify the code sent to your email.' });
    }

    if (!user.twoFactorExpires || user.twoFactorExpires < new Date()) {
      return res.status(400).json({ message: '2FA code has expired. Please request a new code.' });
    }

    // 2FA successful! Clear code and record login
    user.twoFactorCode = null;
    user.twoFactorExpires = null;
    user.lastLoginAt = new Date();
    user.lastLoginIp = clientIp;
    await user.save();

    await AuditLog.create({
      userId: user._id,
      email: user.email,
      userName: user.name,
      role: user.role,
      action: '2FA_SUCCESS',
      status: 'SUCCESS',
      ipAddress: clientIp,
      userAgent,
      details: '2FA verified successfully. User logged in.'
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '336h' });
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name,
        isActive: user.isActive !== false,
        permissions: user.permissions || [],
        twoFactorEnabled: Boolean(user.twoFactorEnabled),
        lastLoginAt: user.lastLoginAt,
        lastLoginIp: user.lastLoginIp
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Error verifying 2FA', error: err.message });
  }
});

/**
 * POST /api/auth/resend-2fa
 * Resends a fresh 2FA code to user email
 */
router.post('/resend-2fa', async (req, res) => {
  try {
    const { tempToken } = req.body;
    if (!tempToken) {
      return res.status(400).json({ message: 'Verification token is required.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ message: '2FA session has expired. Please log in again.' });
    }

    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const twoFactorCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.twoFactorCode = twoFactorCode;
    user.twoFactorExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendTwoFactorCodeEmail({
      to: user.email,
      name: user.name,
      code: twoFactorCode,
    });

    res.json({
      message: 'A new 2FA code has been sent to your email.',
      ...(process.env.NODE_ENV !== 'production' && { devCode: twoFactorCode }),
    });
  } catch (err) {
    res.status(500).json({ message: 'Error resending 2FA code', error: err.message });
  }
});

/**
 * POST /api/auth/2fa/toggle
 * Toggle Two-Factor Authentication on/off for current user
 */
router.post('/2fa/toggle', isAuthenticated, async (req, res) => {
  try {
    const { enable } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    user.twoFactorEnabled = Boolean(enable);
    if (!enable) {
      user.twoFactorCode = null;
      user.twoFactorExpires = null;
    }
    await user.save();

    await AuditLog.create({
      userId: user._id,
      email: user.email,
      userName: user.name,
      role: user.role,
      action: 'LOGIN_SUCCESS',
      status: 'SUCCESS',
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] || 'Unknown',
      details: `Two-Factor Authentication was ${enable ? 'enabled' : 'disabled'}.`
    });

    res.json({
      message: `Two-Factor Authentication ${enable ? 'enabled' : 'disabled'} successfully.`,
      twoFactorEnabled: user.twoFactorEnabled,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error updating 2FA settings', error: err.message });
  }
});

/**
 * GET /api/auth/my-login-history
 * Returns the 10 most recent login and security audit entries for the current user (FR02-05)
 */
router.get('/my-login-history', isAuthenticated, async (req, res) => {
  try {
    const logs = await AuditLog.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('action ipAddress userAgent status details createdAt');
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving login history', error: err.message });
  }
});

/**
 * GET /api/auth/audit-logs
 * Admin endpoint to query system-wide security and login audit logs (FR02-05)
 */
router.get('/audit-logs', isAuthenticated, async (req, res) => {
  try {
    const { limit = 50, page = 1, action, email } = req.query;
    const query = {};
    if (action) query.action = action;
    if (email) query.email = { $regex: email, $options: 'i' };

    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({ total, logs, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving audit logs', error: err.message });
  }
});

// Return current authenticated user's profile
router.get('/profile', isAuthenticated, async (req, res) => {
  if (!req.user) return res.status(404).json({ message: 'User not found' });
  const { _id, email, role, name, isActive, permissions, twoFactorEnabled, lastLoginAt, lastLoginIp } = req.user;
  res.json({ 
    user: { 
      id: _id, 
      email, 
      role, 
      name,
      isActive: isActive !== false,
      permissions: permissions || [],
      twoFactorEnabled: Boolean(twoFactorEnabled),
      lastLoginAt: lastLoginAt || null,
      lastLoginIp: lastLoginIp || null
    } 
  });
});

/**
 * POST /api/auth/logout
 * Terminates admin/user session and records audit log (FR06-02)
 */
router.post('/logout', isAuthenticated, async (req, res) => {
  try {
    const { reason } = req.body || {};
    const isTimeout = reason === 'INACTIVITY';

    await AuditLog.create({
      userId: req.user._id,
      email: req.user.email,
      userName: req.user.name,
      role: req.user.role,
      action: 'LOGOUT',
      status: 'SUCCESS',
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] || 'Unknown',
      details: isTimeout 
        ? 'Session terminated due to 15 minutes of inactivity' 
        : 'Admin logged out securely'
    });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (err) {
    res.status(500).json({ message: 'Error during logout', error: err.message });
  }
});


/**
 * POST /api/auth/forgot-password
 * Initiates password recovery. Generates a crypto token (Web) and 6-digit OTP code (Mobile).
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email address is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email address' });
    }

    // Generate random crypto token for Web link
    const resetToken = crypto.randomBytes(32).toString('hex');
    // Generate 6-digit numeric code for Mobile App
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    // Expires in 1 hour
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

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
      message: 'Password reset instructions have been sent to your email address.',
      email: user.email,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error processing password reset request', error: err.message });
  }
});

/**
 * GET /api/auth/verify-reset-token/:token
 * Validates a web password reset token.
 */
router.get('/verify-reset-token/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Password reset link is invalid or has expired' });
    }

    res.json({ valid: true, email: user.email });
  } catch (err) {
    res.status(500).json({ message: 'Error verifying reset token', error: err.message });
  }
});

/**
 * POST /api/auth/reset-password
 * Updates password using either a web token or email + 6-digit mobile code.
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, code, email, password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    let user = null;

    if (token) {
      // Web reset via token
      user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: new Date() }
      });
    } else if (code && email) {
      // Mobile reset via 6-digit code and email
      user = await User.findOne({
        email: email.toLowerCase().trim(),
        resetPasswordCode: code.trim(),
        resetPasswordExpires: { $gt: new Date() }
      });
    } else {
      return res.status(400).json({ message: 'Reset token or verification code with email is required' });
    }

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired password reset credentials' });
    }

    // Hash new password and clear reset tokens
    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = null;
    user.resetPasswordCode = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (err) {
    res.status(500).json({ message: 'Error resetting password', error: err.message });
  }
});

export default router;
