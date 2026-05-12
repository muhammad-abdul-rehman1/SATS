# SATS Web Dashboard

Next.js admin panel for the Smart Asset Tracker system. Provides asset management, user management, analytics, and reporting in the browser.

---

## Local Development

### Prerequisites

- Node.js 18+
- The backend API running at `http://localhost:4000` (see [SAT-backend/README.md](../SAT-backend/README.md))

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Create your environment file
cp .env.local.example .env.local
```

The default `.env.local.example` already points to `http://localhost:4000/api`, so no changes are needed for local development unless your backend runs on a different port.

```bash
# 3. Start the development server
npm run dev
```

Open `http://localhost:3000` in your browser.

### Login

Use any account created by the backend seeder:

```
Email:    admin@example.com
Password: password123
```

### Available scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm start` | Start production build (run after `npm run build`) |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Run TypeScript type checking |

---

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your values.

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | Backend API base URL |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Yes | Google Maps API key for map features |

---

## Production Deployment

### 1. Set environment variables

Create `.env.local` on your server (this file is gitignored):

```env
NEXT_PUBLIC_API_URL=https://api.your-domain.com/api
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_production_google_maps_key
```

### 2. Build and start

```bash
npm run build
npm start
```

The app runs on port 3000 by default. Use a reverse proxy (nginx, Caddy, etc.) to serve it on port 80/443.

### 3. Deploy to Vercel (recommended)

Vercel is the simplest option for Next.js:

```bash
npm install -g vercel
vercel --prod
```

Set the environment variables in the Vercel project dashboard under **Settings > Environment Variables**.

### 4. Google Maps API key (production)

In [Google Cloud Console](https://console.cloud.google.com/):
1. Go to **Credentials** and find your API key
2. Under **Application restrictions**, set **HTTP referrers** to your production domain
3. Under **API restrictions**, limit it to **Maps JavaScript API** only

This prevents the key from being used by other websites even if it is seen in the browser.

---

## Tech Stack

- **Framework**: Next.js 14 with React 18
- **Language**: TypeScript
- **UI**: Material-UI (MUI) + Tailwind CSS
- **State**: Zustand
- **Charts**: Recharts
- **HTTP client**: Axios
- **Data grid**: MUI DataGrid
