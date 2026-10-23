import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import User from '../src/models/User.js';

async function runTests() {
  console.log('--- Starting SATS Auth & Verification Automated Test Suite ---');
  
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart-asset-tracker');
  console.log('✓ Connected to MongoDB');

  const testEmail = 'test_verify_user@sats.com';
  const initialPassword = 'SecurePassword123!';

  // Clean up existing test user
  await User.deleteOne({ email: testEmail });

  const authRoutes = (await import('../src/routes/auth.js')).default;
  const express = (await import('express')).default;
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);

  const server = app.listen(4098);
  const BASE = 'http://localhost:4098/api/auth';

  try {
    // TEST 1: Registration with Email Confirmation (FR01-04 & FR16-04)
    console.log('\n[Test 1] Testing POST /api/auth/register (Expect verification required)');
    const regReq = await fetch(`${BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Verify Test User',
        email: testEmail,
        password: initialPassword,
      }),
    });
    const regRes = await regReq.json();
    console.log('Register Response:', regRes);

    if (regReq.status !== 201 || !regRes.requireVerification) {
      throw new Error(`Test 1 Failed: Expected 201 with requireVerification, got ${regReq.status}`);
    }
    console.log('✓ Test 1 Passed: User registered with requireVerification = true');

    // Verify DB user is NOT verified
    let dbUser = await User.findOne({ email: testEmail });
    if (dbUser.isEmailVerified !== false || !dbUser.emailVerificationCode) {
      throw new Error('Test 1 DB Failed: User isEmailVerified should be false and have verification code');
    }
    const code = dbUser.emailVerificationCode;
    console.log(`✓ User created with isEmailVerified: false, verification code: ${code}`);

    // TEST 2: Attempt Login BEFORE verification (Expect 403 Forbidden)
    console.log('\n[Test 2] Attempt Login before email is confirmed (Expect 403)');
    const preLoginReq = await fetch(`${BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: initialPassword }),
    });
    const preLoginRes = await preLoginReq.json();
    console.log('Login Response:', preLoginRes);
    if (preLoginReq.status !== 403 || !preLoginRes.requireVerification) {
      throw new Error('Test 2 Failed: Unverified user should be blocked with 403');
    }
    console.log('✓ Test 2 Passed: Unverified account blocked from logging in');

    // TEST 3: Attempt Verify with WRONG code (Expect 400)
    console.log('\n[Test 3] Attempt Email Verification with wrong code');
    const wrongVerifyReq = await fetch(`${BASE}/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, code: '000000' }),
    });
    if (wrongVerifyReq.status !== 400) {
      throw new Error('Test 3 Failed: Wrong code should return 400');
    }
    console.log('✓ Test 3 Passed: Invalid code rejected');

    // TEST 4: Verify with CORRECT code
    console.log('\n[Test 4] Verify Email with correct code');
    const verifyReq = await fetch(`${BASE}/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, code }),
    });
    const verifyRes = await verifyReq.json();
    console.log('Verify Response:', verifyRes);
    if (verifyReq.status !== 200 || !verifyRes.token) {
      throw new Error('Test 4 Failed: Expected 200 and auth token upon verification');
    }
    console.log('✓ Test 4 Passed: Email verified, token issued');

    // Verify DB user is now verified
    dbUser = await User.findOne({ email: testEmail });
    if (dbUser.isEmailVerified !== true || dbUser.emailVerificationCode !== null) {
      throw new Error('Test 4 DB Failed: User should be isEmailVerified = true');
    }
    console.log('✓ User in DB updated to isEmailVerified = true');

    // TEST 5: Password Reset Request (FR07 & FR22)
    console.log('\n[Test 5] Request Password Reset (Check no bypass links in response)');
    const forgotReq = await fetch(`${BASE}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail }),
    });
    const forgotRes = await forgotReq.json();
    console.log('Forgot Response:', forgotRes);
    if (forgotReq.status !== 200) {
      throw new Error('Test 5 Failed: Forgot password request failed');
    }
    if (forgotRes.resetUrl || forgotRes.resetToken) {
      throw new Error('Test 5 Security Failed: resetUrl or resetToken should NOT be exposed to client!');
    }
    console.log('✓ Test 5 Passed: Password reset requested, no secret tokens leaked to client response');

    // Get reset code from DB (simulating checking email)
    dbUser = await User.findOne({ email: testEmail });
    const resetCode = dbUser.resetPasswordCode;
    const resetToken = dbUser.resetPasswordToken;
    console.log(`✓ Email received by user with Code: ${resetCode} and Token: ${resetToken}`);

    // TEST 6: Reset Password using 6-Digit Code
    console.log('\n[Test 6] Reset Password via Email + 6-Digit Code');
    const newPassword = 'NewSecretPassword999!';
    const resetReq = await fetch(`${BASE}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        code: resetCode,
        password: newPassword,
      }),
    });
    const resetRes = await resetReq.json();
    console.log('Reset Response:', resetRes);
    if (resetReq.status !== 200) {
      throw new Error('Test 6 Failed: Password reset via code failed');
    }
    console.log('✓ Test 6 Passed: Password reset successfully');

    // TEST 7: Login with New Password
    console.log('\n[Test 7] Login with newly reset password');
    const loginReq = await fetch(`${BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: newPassword }),
    });
    const loginRes = await loginReq.json();
    if (loginReq.status !== 200 || !loginRes.token) {
      throw new Error('Test 7 Failed: Login with new password failed');
    }
    console.log('✓ Test 7 Passed: Successfully authenticated with new password');

    console.log('\n=====================================================================');
    console.log('🎉 ALL EMAIL CONFIRMATION & SECURE RESET TESTS PASSED SUCCESSFULLY!');
    console.log('=====================================================================\n');
  } finally {
    await User.deleteOne({ email: testEmail });
    server.close();
    await mongoose.disconnect();
  }
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
