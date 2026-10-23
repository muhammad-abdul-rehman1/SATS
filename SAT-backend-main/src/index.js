import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import assetRoutes from './routes/assets.js';
import roomRoutes from './routes/rooms.js';
import resolveRoutes from './routes/resolve.js';
import userRoutes from './routes/users.js';
import maintenanceRoutes, { checkDueMaintenanceReminders } from './routes/maintenance.js';
import notificationRoutes from './routes/notifications.js';
import issueRoutes from './routes/issues.js';
import Notification from './models/Notification.js';
import NotificationSetting from './models/NotificationSetting.js';

// Resolve project root (index.js is in src/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// First try loading from working directory (useful when running within backend/)
dotenv.config();
// Then explicitly point one directory up to be resilient if cwd != backend
const explicitEnvPath = path.join(__dirname, '../.env');
dotenv.config({ path: explicitEnvPath });

// Diagnostic (only if missing) – helps track down "undefined" issues
if (!process.env.MONGO_URI) {
  console.error('[ENV] MONGO_URI not found after loading .env files. Diagnostics:');
  console.error('  process.cwd():', process.cwd());
  console.error('  Expected .env path:', explicitEnvPath);
  try {
    const fs = await import('fs');
    console.error('  .env exists at explicit path:', fs.existsSync(explicitEnvPath));
    if (fs.existsSync(explicitEnvPath)) {
      const firstBytes = fs.readFileSync(explicitEnvPath, 'utf8').split(/\r?\n/).slice(0,4);
      console.error('  .env first lines:', firstBytes);
    }
  } catch (e) {
    console.error('  Failed fs diagnostics:', e.message);
  }
}

const app = express();
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Bypass-Tunnel-Reminder', 'X-Requested-With', 'expo-platform'],
  credentials: true
}));

// Request logger to track incoming connections in real-time
app.use((req, res, next) => {
  console.log(`[REQ] ${new Date().toLocaleTimeString()} ${req.method} ${req.url} (Origin: ${req.headers.origin || 'none'}) from ${req.ip || req.socket?.remoteAddress}`);
  next();
});

// Parse JSON and URL-encoded bodies with increased limits to support base64 image uploads
const bodyLimit = process.env.BODY_LIMIT || '50mb';
app.use(bodyParser.json({ limit: bodyLimit }));
app.use(bodyParser.urlencoded({ limit: bodyLimit, extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/resolve', resolveRoutes);
app.use('/api/users', userRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/issues', issueRoutes);

// Central error-handling middleware (catches PayloadTooLargeError, bad JSON, etc.)
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large' || err.status === 413) {
    return res.status(413).json({
      message: 'Request payload is too large. Please upload a smaller file or reduce image resolution.',
      error: err.message
    });
  }
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ message: 'Invalid JSON payload', error: err.message });
  }
  console.error('[Request Error]', err);
  if (!res.headersSent) {
    res.status(err.status || 500).json({
      message: err.message || 'Internal Server Error'
    });
  }
});

const PORT = process.env.PORT || 4000;
let rawEnvUri = process.env.MONGO_URI ? process.env.MONGO_URI.trim() : '';

// Small helper: if URI starts with localhost but connection keeps failing, devs sometimes benefit from 127.0.0.1 explicitly.
if (rawEnvUri.startsWith('mongodb://localhost:')) {
  rawEnvUri = rawEnvUri.replace('mongodb://localhost', 'mongodb://127.0.0.1');
}

// Mask credentials for logging
function maskUri(uri) {
  try {
    if (!uri) return uri;
    const withoutQuery = uri.split('?')[0];
    if (!withoutQuery.includes('@')) return uri; // no credentials
    const protocolSplit = uri.split('://');
    if (protocolSplit.length < 2) return uri;
    const [proto, rest] = protocolSplit;
    const atIdx = rest.indexOf('@');
    if (atIdx === -1) return uri;
    const hostPortAndTail = rest.slice(atIdx + 1);
    return `${proto}://<credentials-hidden>@${hostPortAndTail}`;
  } catch { return '<unparseable-uri>'; }
}

async function connectWithRetry(attempt = 1) {
  const maxAttempts = 8;
  const delayMs = Math.min(30000, 1000 * Math.pow(2, attempt - 1)); // exponential backoff capped at 30s
  const startTs = Date.now();
  console.log(`[Mongo] Attempt ${attempt}/${maxAttempts} connecting -> ${maskUri(rawEnvUri)}`);

  try {
    await mongoose.connect(rawEnvUri, {
      serverSelectionTimeoutMS: 8000,
    });
    const elapsed = Date.now() - startTs;
    console.log(`[Mongo] Connected in ${elapsed}ms`);

    // Only start HTTP server after successful DB connect (current design)
    app.listen(PORT, '0.0.0.0', () => console.log(`Server running on 0.0.0.0:${PORT}`));

    // Periodic automated maintenance reminder check - runs every 6 hours
    setInterval(() => {
      checkDueMaintenanceReminders().catch(err => console.error('[MaintenanceCron] Error:', err.message));
    }, 6 * 60 * 60 * 1000);

    // Initialize notification settings & sample alerts if empty
    NotificationSetting.findOne({ scope: 'GLOBAL' }).then(async (setting) => {
      if (!setting) {
        await NotificationSetting.create({
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
        console.log('[NotificationSetting] Global defaults initialized');
      }
    }).catch(e => console.error('[NotificationSetting] Init error:', e.message));

    Notification.countDocuments().then(async (count) => {
      if (count === 0) {
        await Notification.create([
          {
            title: 'System Online & Protected',
            message: 'All core asset monitoring and security services are active and running normally.',
            type: 'SYSTEM',
            category: 'SYSTEM',
            priority: 'LOW',
            status: 'ACTIVE',
            isRead: false,
          },
          {
            title: 'Scheduled Preventive Maintenance Advisory',
            message: 'Periodic equipment calibration and sensor inspection cycles are scheduled for this month.',
            type: 'MAINTENANCE',
            category: 'MAINTENANCE',
            priority: 'MEDIUM',
            status: 'ACTIVE',
            isRead: false,
          }
        ]);
        console.log('[Notification] Seed alerts created');
      }
    }).catch(e => console.error('[Notification] Init error:', e.message));
  } catch (err) {
    const code = err.code || err.name;
    console.error('[Mongo] Connection failure:', {
      code,
      message: err.message,
      addressHint: rawEnvUri.match(/mongodb:\/\/([^/?]+)/)?.[1],
      attempt,
    });

    if (attempt < maxAttempts) {
      console.log(`[Mongo] Retrying in ${delayMs}ms...`);
      setTimeout(() => connectWithRetry(attempt + 1), delayMs);
    } else {
      console.error('[Mongo] All retry attempts exhausted. Leaving process alive for manual fix.');
    }
  }
}

if (!rawEnvUri) {
  console.error('MongoDB connection aborted: MONGO_URI is empty or undefined. Set it in backend/.env');
} else {
  // Kick off initial attempt
  connectWithRetry();
}

// Helpful global error handlers for visibility
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
