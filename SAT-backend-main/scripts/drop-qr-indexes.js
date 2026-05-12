// Utility to drop old non-sparse unique indexes on qrCode fields so new sparse ones can be created
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Primary expected location: backend/.env (script lives in backend/scripts)
const primaryEnv = path.join(__dirname, '..', '.env');
const legacyEnv = path.join(__dirname, '../..', '.env'); // safeguard if structure changes

let loaded = dotenv.config({ path: primaryEnv });
if (loaded.error || !process.env.MONGO_URI) {
  // Try legacy location
  dotenv.config({ path: legacyEnv });
}

if (!process.env.MONGO_URI) {
  console.error('MONGO_URI not set after attempting paths:\n -', primaryEnv, '\n -', legacyEnv);
}

const uri = process.env.MONGO_URI;
if (!uri) {
  console.error('MONGO_URI not set');
  process.exit(1);
}

async function run() {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    console.log('Connected for index maintenance');
    const db = mongoose.connection.db;

    const targets = [
      { coll: 'rooms', index: 'qrCode_1' },
      { coll: 'assets', index: 'qrCode_1' }
    ];

    for (const t of targets) {
      const indexes = await db.collection(t.coll).indexes();
      const has = indexes.find(i => i.name === t.index);
      if (has) {
        console.log(`Dropping index ${t.index} on ${t.coll} ...`);
        try {
          await db.collection(t.coll).dropIndex(t.index);
          console.log(`Dropped ${t.index}`);
        } catch (e) {
          console.warn(`Could not drop ${t.index}:`, e.message);
        }
      } else {
        console.log(`Index ${t.index} not present on ${t.coll}`);
      }
    }

    console.log('Done. Restart the app so Mongoose can build sparse indexes.');
    process.exit(0);
  } catch (e) {
    console.error('Error maintaining indexes:', e);
    process.exit(1);
  }
}

run();