import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  name: String,
  role: { type: String, enum: ['USER', 'ADMIN', 'SUPER_ADMIN'], default: 'USER' },
  isActive: { type: Boolean, default: true },
  permissions: { type: [String], default: [] },
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationCode: { type: String, default: null },
  emailVerificationExpires: { type: Date, default: null },
  resetPasswordToken: { type: String, default: null },
  resetPasswordCode: { type: String, default: null },
  resetPasswordExpires: { type: Date, default: null },
  // FR02-04: Account lockout after failed login attempts
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date, default: null },
  // FR02-05: Login time & IP address tracking
  lastLoginAt: { type: Date, default: null },
  lastLoginIp: { type: String, default: null },
  // FR02-06: Two-Factor Authentication (2FA)
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorCode: { type: String, default: null },
  twoFactorExpires: { type: Date, default: null },
}, { timestamps: true });

export default mongoose.model('User', userSchema);
