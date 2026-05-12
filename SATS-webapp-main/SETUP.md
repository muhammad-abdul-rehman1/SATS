# SATS Web App - Quick Start Guide

## 🚀 Installation

### Option 1: Automated Setup (Recommended)

#### Windows:
```bash
.\setup.bat
```

#### macOS/Linux:
```bash
bash setup.sh
```

### Option 2: Manual Setup

1. **Navigate to project directory**:
   ```bash
   cd SATS-webapp
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create environment file**:
   ```bash
   cp .env.local.example .env.local
   ```

4. **Update API URL** (in `.env.local`):
   
   The app is configured to use the live API by default:
   ```
   NEXT_PUBLIC_API_URL=https://api.system-sab.sbs/api
   ```
   
   For local development, change to:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:4000/api
   ```
   
   For physical devices on LAN, use your machine's IP:
   ```
   NEXT_PUBLIC_API_URL=http://192.168.X.X:4000/api
   ```

## 📖 Running the App

### Development Mode:
```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build:
```bash
npm run build
npm start
```

### Type Checking:
```bash
npm run type-check
```

### Linting:
```bash
npm run lint
```

## 🔑 Login Credentials

For testing, use the following demo credentials:

```
Email: admin@example.com
Password: password123
```

You can also use any user created in the backend with valid credentials.

## 🏗️ Project Structure

```
SATS-webapp/
├── src/
│   ├── pages/                 # Next.js pages (routes)
│   │   ├── index.tsx         # Dashboard
│   │   ├── login.tsx         # Login page
│   │   ├── assets/           # Asset management
│   │   ├── rooms/            # Rooms list
│   │   ├── users/            # User management
│   │   ├── reports/          # Reports & analytics
│   │   ├── _app.tsx          # App wrapper
│   │   └── _document.tsx     # HTML document
│   │
│   ├── components/            # Reusable React components
│   │   ├── Layout/           # Main layout wrapper
│   │   ├── Dashboard/        # Dashboard-specific components
│   │   ├── Assets/           # Asset components
│   │   ├── Users/            # User components
│   │   ├── Charts/           # Chart components
│   │   └── Common/           # Shared components
│   │
│   ├── services/              # API service layer
│   │   ├── api.ts            # Axios instance
│   │   ├── auth.ts           # Auth APIs
│   │   ├── assets.ts         # Asset APIs
│   │   ├── rooms.ts          # Room APIs
│   │   ├── users.ts          # User APIs
│   │   └── reports.ts        # Reports APIs
│   │
│   ├── hooks/                 # Custom React hooks
│   │   ├── useRoute.ts       # Route protection hooks
│   │   ├── useAssets.ts      # Asset data hook
│   │   └── useFetch.ts       # Generic fetch hook
│   │
│   ├── contexts/              # React contexts
│   │   └── AuthContext.tsx   # Authentication state
│   │
│   ├── types/                 # TypeScript type definitions
│   │   └── index.ts          # All type definitions
│   │
│   ├── utils/                 # Utility functions
│   │   ├── storage.ts        # LocalStorage helpers
│   │   ├── formatting.ts     # Data formatting
│   │   └── constants.ts      # App constants
│   │
│   └── styles/                # Global styles
│       └── globals.css       # CSS utilities
│
├── public/                    # Static assets
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
├── next.config.js            # Next.js config
├── tailwind.config.js        # Tailwind CSS config
├── postcss.config.js         # PostCSS config
├── .eslintrc.json            # ESLint config
├── .env.local.example        # Environment template
├── .gitignore                # Git ignore rules
├── setup.sh                  # Linux/Mac setup
├── setup.bat                 # Windows setup
└── README.md                 # This file
```

## 🔗 API Integration

The web app communicates with the backend API at:
- **Default**: `https://api.system-sab.sbs/api` (Live Production API)
- **Alternative**: `http://localhost:4000/api` (Local Development)
- **Configurable**: Via `NEXT_PUBLIC_API_URL` environment variable

### Available API Endpoints

#### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/profile` - Get current user profile

#### Assets
- `GET /api/assets` - List all assets
- `GET /api/assets/:id` - Get asset details
- `POST /api/assets` - Create new asset (Admin only)
- `PUT /api/assets/:id` - Update asset
- `DELETE /api/assets/:id` - Delete asset (Admin only)
- `GET /api/assets/:id/qr-code` - Generate QR code

#### Rooms
- `GET /api/rooms` - List all rooms
- `GET /api/rooms/:id` - Get room details
- `POST /api/rooms` - Create new room (Admin only)
- `PUT /api/rooms/:id` - Update room (Admin only)
- `DELETE /api/rooms/:id` - Delete room (Admin only)

#### Users
- `GET /api/users` - List all users
- `GET /api/users/:id` - Get user details
- `PUT /api/users/:id` - Update user (Admin only)
- `DELETE /api/users/:id` - Delete user (Admin only)

## 🎨 Styling

The app uses:
- **Material-UI (MUI)** for components
- **Tailwind CSS** for utility classes
- Both frameworks configured to work together

## 🔐 Authentication Flow

1. User enters email and password on login page
2. Credentials sent to backend API
3. Backend returns JWT token
4. Token stored in localStorage
5. Token included in all subsequent API requests
6. Expired tokens automatically redirect to login

## 🐛 Troubleshooting

### "Cannot connect to API"
- Check backend is running on `http://localhost:4000`
- Verify `NEXT_PUBLIC_API_URL` in `.env.local`
- For LAN access, use machine IP instead of localhost

### "Port 3000 already in use"
Use a different port:
```bash
npm run dev -- -p 3001
```

### "Dependencies not installing"
Clear cache and reinstall:
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### "TypeScript errors"
Run type checking:
```bash
npm run type-check
```

## 📦 Technology Stack

- **Framework**: Next.js 14
- **Language**: TypeScript
- **UI Library**: Material-UI (MUI)
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Charts**: Recharts
- **HTTP Client**: Axios
- **Build Tool**: Next.js (webpack)

## 🚀 Deployment

### Vercel (Recommended for Next.js)
1. Push code to GitHub
2. Connect to Vercel
3. Set `NEXT_PUBLIC_API_URL` environment variable
4. Deploy

### Self-hosted
```bash
npm run build
npm start
```

## 📝 Environment Variables

- `NEXT_PUBLIC_API_URL` - Backend API URL (default: http://localhost:4000/api)
- `NEXT_PUBLIC_JWT_SECRET` - For cookie validation (optional)

## 🤝 Contributing

1. Follow existing code structure
2. Use TypeScript for type safety
3. Create reusable components
4. Test before committing
5. Follow ESLint rules

## 📄 License

Part of Smart Asset Tracker (SATS) system.

## 🆘 Support

For issues or questions, check the main SATS repository documentation.
