import nodemailer from 'nodemailer';

let testAccount = null;

async function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  // Real SMTP (Gmail, SendGrid, Mailgun, custom SMTP)
  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    const isGmail = SMTP_HOST.toLowerCase().includes('gmail');
    const cleanPass = SMTP_PASS.replace(/\s+/g, '');
    const transportOpts = isGmail
      ? {
          service: 'gmail',
          auth: {
            user: SMTP_USER,
            pass: cleanPass,
          },
        }
      : {
          host: SMTP_HOST,
          port: parseInt(SMTP_PORT || '465', 10),
          secure: (SMTP_PORT === '465' || !SMTP_PORT),
          auth: {
            user: SMTP_USER,
            pass: cleanPass,
          },
        };

    return {
      transporter: nodemailer.createTransport(transportOpts),
      from: process.env.SMTP_FROM || `"Smart Asset Tracker" <${SMTP_USER}>`,
      isTest: false,
    };
  }

  // Fallback to Ethereal test SMTP if credentials not yet configured
  try {
    if (!testAccount) {
      testAccount = await nodemailer.createTestAccount();
    }
    return {
      transporter: nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      }),
      from: '"Smart Asset Tracker" <no-reply@sats.local>',
      isTest: true,
    };
  } catch (err) {
    console.warn('[Mailer] Could not initialize Ethereal test account:', err.message);
    return null;
  }
}

/**
 * Send password reset email with 6-digit code and web link.
 */
export async function sendPasswordResetEmail({ to, name, resetToken, resetCode, resetUrl }) {
  console.log('\n=================== [PASSWORD RESET EMAIL] ===================');
  console.log(`To:           ${name || 'User'} <${to}>`);
  console.log(`Reset Code:   ${resetCode}`);
  console.log(`Reset Link:   ${resetUrl}`);
  console.log(`Expires in:   1 hour`);
  console.log('==============================================================\n');

  try {
    const config = await getTransporter();
    if (!config) return { sent: false, simulated: true };

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #0066FF; margin-bottom: 8px;">Smart Asset Tracker</h2>
          <p style="color: #64748b; margin: 0;">Password Reset Request</p>
        </div>
        
        <p style="color: #1e293b; font-size: 16px;">Hello <strong>${name || 'User'}</strong>,</p>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
          We received a request to reset your password. Use the verification code below or click the reset button.
        </p>
        
        <div style="background-color: #f0f9ff; border: 1px dashed #0284c7; padding: 18px; border-radius: 8px; text-align: center; margin: 24px 0;">
          <p style="margin: 0 0 6px 0; font-size: 13px; color: #0284c7; text-transform: uppercase; font-weight: 600;">Your Verification Code</p>
          <div style="font-size: 36px; font-weight: 800; letter-spacing: 6px; color: #001A4D;">${resetCode}</div>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #0066FF; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block;">
            Reset Password
          </a>
        </div>

        <p style="color: #94a3b8; font-size: 12px; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 30px;">
          This code and link expire in 1 hour. If you did not request this, please ignore this email.
        </p>
      </div>
    `;

    const info = await config.transporter.sendMail({
      from: config.from,
      to,
      subject: 'SATS — Password Reset Verification',
      html,
    });

    if (config.isTest) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log(`[Mailer] 📧 Email Preview URL (Ethereal): ${previewUrl}`);
      return { sent: true, previewUrl };
    }

    console.log(`[Mailer] 📧 Real email delivered to ${to} (MessageId: ${info.messageId})`);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error('[Mailer] Error sending password reset email:', err.message);
    return { sent: false, error: err.message };
  }
}

/**
 * Send account verification email with 6-digit code and activation link.
 */
export async function sendVerificationEmail({ to, name, verificationCode, verificationUrl }) {
  console.log('\n=================== [ACCOUNT VERIFICATION EMAIL] ===================');
  console.log(`To:                  ${name || 'User'} <${to}>`);
  console.log(`Verification Code:   ${verificationCode}`);
  console.log(`Verification Link:   ${verificationUrl}`);
  console.log(`Expires in:          24 hours`);
  console.log('====================================================================\n');

  try {
    const config = await getTransporter();
    if (!config) return { sent: false, simulated: true };

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #0066FF; margin-bottom: 8px;">Smart Asset Tracker</h2>
          <p style="color: #64748b; margin: 0;">Account Email Verification</p>
        </div>
        
        <p style="color: #1e293b; font-size: 16px;">Hello <strong>${name || 'User'}</strong>,</p>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
          Thank you for signing up for the Smart Asset Tracking System (SATS). To activate your account, please enter the 6-digit verification code below:
        </p>
        
        <div style="background-color: #f0fdf4; border: 1px dashed #16a34a; padding: 18px; border-radius: 8px; text-align: center; margin: 24px 0;">
          <p style="margin: 0 0 6px 0; font-size: 13px; color: #16a34a; text-transform: uppercase; font-weight: 600;">Your Activation Code</p>
          <div style="font-size: 36px; font-weight: 800; letter-spacing: 6px; color: #14532d;">${verificationCode}</div>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #16a34a; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block;">
            Verify Email Address
          </a>
        </div>

        <p style="color: #94a3b8; font-size: 12px; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 30px;">
          If you did not register for SATS, you can safely ignore this email.
        </p>
      </div>
    `;

    const info = await config.transporter.sendMail({
      from: config.from,
      to,
      subject: 'SATS — Verify Your Email Address',
      html,
    });

    if (config.isTest) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log(`[Mailer] 📧 Verification Email Preview URL: ${previewUrl}`);
      return { sent: true, previewUrl };
    }

    console.log(`[Mailer] 📧 Verification email delivered to ${to} (MessageId: ${info.messageId})`);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error('[Mailer] Error sending verification email:', err.message);
    return { sent: false, error: err.message };
  }
}

/**
 * Send two-factor authentication (2FA) OTP code to user's email.
 */
export async function sendTwoFactorCodeEmail({ to, name, code }) {
  console.log('\n=================== [2FA LOGIN CODE EMAIL] ===================');
  console.log(`To:        ${name || 'User'} <${to}>`);
  console.log(`2FA Code:  ${code}`);
  console.log(`Expires:   10 minutes`);
  console.log('==============================================================\n');

  try {
    const config = await getTransporter();
    if (!config) return { sent: false, simulated: true };

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #0066FF; margin-bottom: 8px;">Smart Asset Tracker</h2>
          <p style="color: #64748b; margin: 0;">Two-Factor Authentication (2FA)</p>
        </div>
        
        <p style="color: #1e293b; font-size: 16px;">Hello <strong>${name || 'Admin'}</strong>,</p>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
          A login attempt to your Smart Asset Tracker account was initiated. Use the 6-digit verification code below to complete sign-in:
        </p>
        
        <div style="background-color: #eff6ff; border: 1px dashed #0066FF; padding: 20px; border-radius: 8px; text-align: center; margin: 24px 0;">
          <p style="margin: 0 0 6px 0; font-size: 13px; color: #0066FF; text-transform: uppercase; font-weight: 600;">Your 2FA Login Code</p>
          <div style="font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #001A4D;">${code}</div>
        </div>

        <p style="color: #dc2626; font-size: 13px; font-weight: 600; text-align: center;">
          ⏱ This code expires in 10 minutes.
        </p>

        <p style="color: #94a3b8; font-size: 12px; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 30px;">
          If you did not attempt to log in, your password may be compromised. Please reset your password immediately.
        </p>
      </div>
    `;

    const info = await config.transporter.sendMail({
      from: config.from,
      to,
      subject: `SATS — Your 2FA Login Code: ${code}`,
      html,
    });

    if (config.isTest) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log(`[Mailer] 📧 2FA Email Preview URL: ${previewUrl}`);
      return { sent: true, previewUrl };
    }

    console.log(`[Mailer] 📧 2FA email delivered to ${to} (MessageId: ${info.messageId})`);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error('[Mailer] Error sending 2FA email:', err.message);
    return { sent: false, error: err.message };
  }
}

/**
 * Send alert email to admin when asset status changes unexpectedly (FR09-04)
 */
export async function sendAssetStatusAlertEmail({ to, asset, oldStatus, newStatus, changedBy }) {
  console.log('\n=================== [ASSET STATUS ALERT EMAIL] ===================');
  console.log(`To:          ${to}`);
  console.log(`Asset:       ${asset.assetTag} - ${asset.name}`);
  console.log(`Status:      ${oldStatus} -> ${newStatus}`);
  console.log(`Changed By:  ${changedBy}`);
  console.log('==================================================================\n');

  try {
    const config = await getTransporter();
    if (!config) return { sent: false, simulated: true };

    const statusBadgeColor = newStatus === 'MAINTENANCE' ? '#d97706' : newStatus === 'RETIRED' ? '#dc2626' : '#2563eb';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #fed7aa; border-radius: 12px; background-color: #fffaf5;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #c2410c; margin-bottom: 6px;">⚠️ Asset Status Alert</h2>
          <p style="color: #78716c; margin: 0;">Smart Asset Tracking System (FR09-04)</p>
        </div>
        
        <p style="color: #1e293b; font-size: 15px;">An asset status change requiring administrative attention has occurred:</p>
        
        <div style="background-color: #ffffff; border: 1px solid #fed7aa; padding: 18px; border-radius: 8px; margin: 18px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 6px 0; color: #64748b;">Asset Tag:</td><td style="font-weight: bold; color: #0f172a;">${asset.assetTag}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Asset Name:</td><td style="font-weight: bold; color: #0f172a;">${asset.name}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Previous Status:</td><td style="color: #64748b;">${oldStatus}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">New Status:</td><td><span style="background-color: ${statusBadgeColor}; color: #ffffff; padding: 3px 10px; border-radius: 9999px; font-weight: bold; font-size: 12px;">${newStatus}</span></td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Updated By:</td><td style="color: #0f172a;">${changedBy}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Timestamp:</td><td style="color: #0f172a;">${new Date().toLocaleString()}</td></tr>
          </table>
        </div>
        <p style="color: #94a3b8; font-size: 12px; border-top: 1px solid #fed7aa; padding-top: 14px; margin-top: 20px;">
          This is an automated system notification for administrators.
        </p>
      </div>
    `;

    const info = await config.transporter.sendMail({
      from: config.from,
      to,
      subject: `[SATS Alert] Asset ${asset.assetTag} changed to ${newStatus}`,
      html,
    });

    return { sent: true, messageId: info?.messageId };
  } catch (err) {
    console.error('[Mailer] Error sending status alert email:', err.message);
    return { sent: false, error: err.message };
  }
}

/**
 * Send notification email to admin when asset location is updated (FR26-04)
 */
export async function sendLocationUpdateAlertEmail({ to, asset, oldRoomName, newRoomName, updatedBy }) {
  console.log('\n=================== [LOCATION UPDATE NOTIFICATION] ===================');
  console.log(`To:          ${to}`);
  console.log(`Asset:       ${asset.assetTag} - ${asset.name}`);
  console.log(`Movement:    ${oldRoomName || 'Unassigned'} -> ${newRoomName || 'Unassigned'}`);
  console.log(`Updated By:  ${updatedBy}`);
  console.log('=======================================================================\n');

  try {
    const config = await getTransporter();
    if (!config) return { sent: false, simulated: true };

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #bfdbfe; border-radius: 12px; background-color: #f8fafc;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #1d4ed8; margin-bottom: 6px;">📍 Asset Location Updated</h2>
          <p style="color: #64748b; margin: 0;">Smart Asset Tracking System (FR26-04)</p>
        </div>
        
        <p style="color: #1e293b; font-size: 15px;">An asset location update has been performed and logged:</p>
        
        <div style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 18px; border-radius: 8px; margin: 18px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 6px 0; color: #64748b;">Asset Tag:</td><td style="font-weight: bold; color: #0f172a;">${asset.assetTag}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Asset Name:</td><td style="font-weight: bold; color: #0f172a;">${asset.name}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">From Room:</td><td style="color: #64748b;">${oldRoomName || 'Unassigned'}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">To Room:</td><td style="font-weight: bold; color: #16a34a;">${newRoomName || 'Unassigned'}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Updated By:</td><td style="color: #0f172a;">${updatedBy}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Timestamp:</td><td style="color: #0f172a;">${new Date().toLocaleString()}</td></tr>
          </table>
        </div>
      </div>
    `;

    const info = await config.transporter.sendMail({
      from: config.from,
      to,
      subject: `[SATS Movement] Asset ${asset.assetTag} moved to ${newRoomName || 'Unassigned'}`,
      html,
    });

    return { sent: true, messageId: info?.messageId };
  } catch (err) {
    console.error('[Mailer] Error sending location update email:', err.message);
    return { sent: false, error: err.message };
  }
}

/**
 * Send notification to staff about scheduled maintenance (FR11-02)
 */
export async function sendMaintenanceScheduledEmail({ to, staffName, assetName, assetTag, scheduledDate, title, description, priority }) {
  console.log('\n=================== [MAINTENANCE SCHEDULED NOTIFICATION] ===================');
  console.log(`To:          ${to}`);
  console.log(`Staff:       ${staffName || 'Staff'}`);
  console.log(`Asset:       ${assetTag} - ${assetName}`);
  console.log(`Date:        ${new Date(scheduledDate).toLocaleDateString()}`);
  console.log(`Task:        ${title}`);
  console.log('============================================================================\n');

  try {
    const config = await getTransporter();
    if (!config) return { sent: false, simulated: true };

    const formattedDate = new Date(scheduledDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #fde68a; border-radius: 12px; background-color: #fffbeb;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #b45309; margin-bottom: 6px;">🛠️ Upcoming Asset Maintenance Scheduled</h2>
          <p style="color: #78716c; margin: 0;">Smart Asset Tracking System (FR11-02)</p>
        </div>
        
        <p style="color: #1e293b; font-size: 15px;">Hello ${staffName || 'Staff Member'},</p>
        <p style="color: #1e293b; font-size: 15px;">A maintenance task has been scheduled for an asset assigned to you or your department:</p>
        
        <div style="background-color: #ffffff; border: 1px solid #fed7aa; padding: 18px; border-radius: 8px; margin: 18px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 6px 0; color: #64748b;">Task Title:</td><td style="font-weight: bold; color: #0f172a;">${title}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Asset:</td><td style="font-weight: bold; color: #0f172a;">${assetName} (${assetTag})</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Scheduled Date:</td><td style="font-weight: bold; color: #b45309;">${formattedDate}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Priority:</td><td style="font-weight: bold; color: #ea580c;">${priority || 'MEDIUM'}</td></tr>
            ${description ? `<tr><td style="padding: 6px 0; color: #64748b;">Details:</td><td style="color: #334155;">${description}</td></tr>` : ''}
          </table>
        </div>

        <p style="color: #64748b; font-size: 13px;">Please ensure the asset is prepared and accessible for inspection or servicing on this date.</p>
      </div>
    `;

    const info = await config.transporter.sendMail({
      from: config.from,
      to,
      subject: `[Maintenance Scheduled] ${assetTag} - ${title} on ${formattedDate}`,
      html,
    });

    return { sent: true, messageId: info?.messageId };
  } catch (err) {
    console.error('[Mailer] Error sending maintenance scheduled email:', err.message);
    return { sent: false, error: err.message };
  }
}

/**
 * Send automated reminder before scheduled maintenance (FR11-04)
 */
export async function sendMaintenanceReminderEmail({ to, staffName, assetName, assetTag, scheduledDate, title, description }) {
  console.log('\n=================== [MAINTENANCE REMINDER NOTIFICATION] ===================');
  console.log(`To:          ${to}`);
  console.log(`Staff:       ${staffName || 'Staff'}`);
  console.log(`Asset:       ${assetTag} - ${assetName}`);
  console.log(`Date:        ${new Date(scheduledDate).toLocaleDateString()}`);
  console.log('===========================================================================\n');

  try {
    const config = await getTransporter();
    if (!config) return { sent: false, simulated: true };

    const formattedDate = new Date(scheduledDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #fed7aa; border-radius: 12px; background-color: #fff7ed;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #c2410c; margin-bottom: 6px;">⏰ Maintenance Reminder</h2>
          <p style="color: #78716c; margin: 0;">Smart Asset Tracking System (FR11-04)</p>
        </div>
        
        <p style="color: #1e293b; font-size: 15px;">Hello ${staffName || 'Staff Member'},</p>
        <p style="color: #1e293b; font-size: 15px;">This is a reminder that maintenance for the following asset is due soon:</p>
        
        <div style="background-color: #ffffff; border: 1px solid #ffedd5; padding: 18px; border-radius: 8px; margin: 18px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 6px 0; color: #64748b;">Task:</td><td style="font-weight: bold; color: #0f172a;">${title}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Asset:</td><td style="font-weight: bold; color: #0f172a;">${assetName} (${assetTag})</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Due Date:</td><td style="font-weight: bold; color: #c2410c;">${formattedDate}</td></tr>
            ${description ? `<tr><td style="padding: 6px 0; color: #64748b;">Notes:</td><td style="color: #334155;">${description}</td></tr>` : ''}
          </table>
        </div>

        <p style="color: #64748b; font-size: 13px;">Please complete or acknowledge this maintenance inspection as required.</p>
      </div>
    `;

    const info = await config.transporter.sendMail({
      from: config.from,
      to,
      subject: `[REMINDER] Maintenance due for ${assetTag} on ${formattedDate}`,
      html,
    });

    return { sent: true, messageId: info?.messageId };
  } catch (err) {
    console.error('[Mailer] Error sending maintenance reminder email:', err.message);
    return { sent: false, error: err.message };
  }
}

/**
 * Send notification when maintenance task is rescheduled (FR11-05)
 */
export async function sendMaintenanceRescheduledEmail({ to, staffName, assetName, assetTag, oldDate, newDate, reason }) {
  console.log('\n=================== [MAINTENANCE RESCHEDULED NOTIFICATION] ===================');
  console.log(`To:          ${to}`);
  console.log(`Asset:       ${assetTag} - ${assetName}`);
  console.log(`Old Date:    ${new Date(oldDate).toLocaleDateString()}`);
  console.log(`New Date:    ${new Date(newDate).toLocaleDateString()}`);
  console.log('==============================================================================\n');

  try {
    const config = await getTransporter();
    if (!config) return { sent: false, simulated: true };

    const fmtOld = new Date(oldDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const fmtNew = new Date(newDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f8fafc;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #0284c7; margin-bottom: 6px;">📅 Maintenance Task Rescheduled</h2>
          <p style="color: #64748b; margin: 0;">Smart Asset Tracking System (FR11-05)</p>
        </div>
        
        <p style="color: #1e293b; font-size: 15px;">Hello ${staffName || 'Staff Member'},</p>
        <p style="color: #1e293b; font-size: 15px;">The maintenance schedule for <strong>${assetName} (${assetTag})</strong> has been rescheduled:</p>
        
        <div style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 18px; border-radius: 8px; margin: 18px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 6px 0; color: #64748b;">Previous Date:</td><td style="color: #94a3b8; text-decoration: line-through;">${fmtOld}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">New Date:</td><td style="font-weight: bold; color: #0284c7;">${fmtNew}</td></tr>
            ${reason ? `<tr><td style="padding: 6px 0; color: #64748b;">Reason:</td><td style="color: #334155;">${reason}</td></tr>` : ''}
          </table>
        </div>
      </div>
    `;

    const info = await config.transporter.sendMail({
      from: config.from,
      to,
      subject: `[Rescheduled] Maintenance for ${assetTag} moved to ${fmtNew}`,
      html,
    });

    return { sent: true, messageId: info?.messageId };
  } catch (err) {
    console.error('[Mailer] Error sending maintenance reschedule email:', err.message);
    return { sent: false, error: err.message };
  }
}

/**
 * Send notification when an asset issue is reported (FR25-03, TC-25 Step 6)
 */
export async function sendAssetIssueReportedEmail({
  to = 'admin@sats.com',
  adminName = 'Administrator',
  reporterName,
  reporterEmail,
  assetTag,
  assetName,
  title,
  description,
  priority = 'MEDIUM',
  imageUrl,
}) {
  console.log('\n=================== [ASSET ISSUE REPORTED NOTIFICATION] ===================');
  console.log(`To:          ${to}`);
  console.log(`Asset:       ${assetTag} - ${assetName}`);
  console.log(`Reported By: ${reporterName || 'User'} (${reporterEmail || 'N/A'})`);
  console.log(`Issue Title: ${title}`);
  console.log(`Priority:    ${priority}`);
  console.log(`Description: ${description}`);
  if (imageUrl) console.log(`Image:       ${imageUrl.startsWith('data:') ? '[Base64 Image Attached]' : imageUrl}`);
  console.log('===========================================================================\n');

  try {
    const config = await getTransporter();
    if (!config) return { sent: false, simulated: true };

    const priorityColors = {
      CRITICAL: '#dc2626',
      HIGH: '#ea580c',
      MEDIUM: '#d97706',
      LOW: '#0284c7',
    };
    const pColor = priorityColors[priority] || '#d97706';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #dc2626; margin-bottom: 6px;">⚠️ Asset Issue Reported</h2>
          <p style="color: #64748b; margin: 0;">Smart Asset Tracking System</p>
        </div>
        
        <p style="color: #1e293b; font-size: 15px;">Hello ${adminName || 'Admin'},</p>
        <p style="color: #1e293b; font-size: 15px;">A user has submitted an issue report for the following asset:</p>
        
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 18px; border-radius: 8px; margin: 18px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 6px 0; color: #64748b; width: 35%;">Asset:</td><td style="font-weight: bold; color: #0f172a;">${assetName} (${assetTag})</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Issue:</td><td style="font-weight: bold; color: #0f172a;">${title}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Priority:</td><td><span style="font-weight: bold; color: ${pColor};">${priority}</span></td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Reported By:</td><td style="color: #334155;">${reporterName || 'Staff'} (${reporterEmail || ''})</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Date & Time:</td><td style="color: #334155;">${new Date().toLocaleString()}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b; vertical-align: top;">Description:</td><td style="color: #1e293b; font-weight: 500;">${description}</td></tr>
          </table>
          ${imageUrl ? `
            <div style="margin-top: 14px; padding-top: 14px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b; font-weight: bold;">ATTACHED PHOTO:</p>
              <img src="${imageUrl}" alt="Issue photo" style="max-width: 100%; max-height: 250px; border-radius: 6px; border: 1px solid #cbd5e1;" />
            </div>
          ` : ''}
        </div>

        <p style="color: #64748b; font-size: 13px;">Please review this issue in the SATS Dashboard and update the resolution status.</p>
      </div>
    `;

    const info = await config.transporter.sendMail({
      from: config.from,
      to,
      subject: `[ISSUE REPORTED] ${priority} issue on ${assetTag}: ${title}`,
      html,
    });

    return { sent: true, messageId: info?.messageId };
  } catch (err) {
    console.error('[Mailer] Error sending asset issue reported email:', err.message);
    return { sent: false, error: err.message };
  }
}


