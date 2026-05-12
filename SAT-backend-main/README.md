# SAT Backend

Express.js REST API with MongoDB. Serves both the web dashboard and the mobile app.

---

## Local Development

### Prerequisites

- Node.js 18+
- MongoDB running locally **or** a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Create your environment file
cp .env.example .env
```

Open `.env` and set your values:

```env
PORT=4000
MONGO_URI=mongodb://127.0.0.1:27017/smart-asset-tracker
JWT_SECRET=any_random_string_for_local_dev
JWT_REFRESH_SECRET=another_random_string_for_local_dev
```

```bash
# 3. Seed the database with sample data (first run only)
npm run seed

# 4. Start the dev server (auto-restarts on file changes)
npm run dev
```

The API is now available at `http://localhost:4000/api`.

### Sample accounts created by the seeder

| Role | Email | Password |
|---|---|---|
| Super Admin | admin@example.com | password123 |
| Normal User | john@example.com | password123 |
| Normal User | jane@example.com | password123 |

### Available scripts

| Command | Description |
|---|---|
| `npm run dev` | Start with nodemon (auto-reload) |
| `npm start` | Start without auto-reload |
| `npm run seed` | Wipe and re-seed the database |

---

## Environment Variables

All variables are defined in `.env.example`. Copy it to `.env` and fill in your values.

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Port the server listens on (default: 4000) |
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret used to sign access tokens |
| `JWT_REFRESH_SECRET` | Yes | Secret used to sign refresh tokens |
| `CORS_ORIGIN` | No | Allowed origin for the web dashboard (e.g. `http://localhost:3000`) |

---

## API Overview

### Auth

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login, returns JWT tokens |
| GET | `/api/auth/profile` | Get current user profile |

### Assets

| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/assets` | All users |
| GET | `/api/assets/:id` | All users |
| POST | `/api/assets` | Super Admin only |
| PUT | `/api/assets/:id` | Owner or Super Admin |
| DELETE | `/api/assets/:id` | Super Admin only |
| GET | `/api/assets/:id/qr-code` | All users |

### Rooms

| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/rooms` | All users |
| GET | `/api/rooms/:id` | All users |
| POST | `/api/rooms` | Super Admin only |
| PUT | `/api/rooms/:id` | Super Admin only |
| DELETE | `/api/rooms/:id` | Super Admin only |

### QR / Scan

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/resolve` | Resolve a scanned QR code payload |
| GET | `/api/resolve/scan-history` | Scan history for the current user |

---

## Production Deployment

### 1. Prepare environment variables

Create a `.env.production` file (this file is gitignored and must never be committed):

```env
PORT=4000
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/smart-asset-tracker
JWT_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
JWT_REFRESH_SECRET=<generate a second value the same way>
CORS_ORIGIN=https://your-web-dashboard-domain.com
```

Generate secure secrets:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Run this command twice — once for `JWT_SECRET`, once for `JWT_REFRESH_SECRET`. Use a different value for each.

### 2. Start the server

```bash
NODE_ENV=production node src/index.js
```

For process management in production, use [PM2](https://pm2.keymetrics.io/):

```bash
npm install -g pm2
pm2 start src/index.js --name sat-backend
pm2 save
```

### 3. MongoDB Atlas setup

1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a database user under **Database Access**
3. Allow your server's IP under **Network Access**
4. Copy the connection string into `MONGO_URI` in your `.env.production`

### 4. Do not seed in production

The `npm run seed` command **wipes the database** before inserting sample data. Never run it against a production database.
