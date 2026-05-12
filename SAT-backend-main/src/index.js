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
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(bodyParser.json());

app.use('/api/auth', authRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/resolve', resolveRoutes);
app.use('/api/users', userRoutes);

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
