# SATS Mobile App

Expo React Native app for scanning QR codes, tracking assets, and viewing room maps.
Runs on iOS and Android.

---

## Local Development

### Prerequisites

- Node.js 18+
- The backend API running locally (see [SAT-backend/README.md](../SAT-backend/README.md))
- **Expo Go** app on your phone — [iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)
- OR an Android emulator / iOS simulator

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Create your environment file
cp .env.example .env
```

Open `.env` and add your Google Maps API key:

```env
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

Get a key at [console.cloud.google.com](https://console.cloud.google.com/) — enable the **Maps SDK for Android** and **Maps SDK for iOS**.

```bash
# 3. Start the Expo development server
npx expo start
```

Then:
- **Physical device**: scan the QR code in the terminal with the Expo Go app
- **Android emulator**: press `A`
- **iOS simulator**: press `I`

### API URL

The app automatically detects the backend URL:
- Android emulator → `http://10.0.2.2:4000/api`
- iOS simulator → `http://127.0.0.1:4000/api`
- Physical device → uses your machine's LAN IP (detected from the Expo dev server)

If auto-detection fails, set it manually in `.env`:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.x:4000/api
```

Replace `192.168.1.x` with your machine's local IP (`ipconfig` on Windows, `ifconfig` on Mac/Linux).

### Available scripts

| Command | Description |
|---|---|
| `npx expo start` | Start dev server (scan QR with Expo Go) |
| `npm run android` | Build and run on Android emulator |
| `npm run ios` | Build and run on iOS simulator |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values.

| Variable | Required | Description |
|---|---|---|
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Yes | Google Maps key for the map screen |
| `EXPO_PUBLIC_API_URL` | No | Override the auto-detected backend URL |

> Variables prefixed with `EXPO_PUBLIC_` are inlined at build time by Metro. Restart the dev server with `npx expo start --clear` after changing them.

---

## Production Build

Production builds use [EAS Build](https://docs.expo.dev/build/introduction/) (Expo Application Services).

### 1. Install EAS CLI

```bash
npm install -g eas-cli
eas login
```

### 2. Set production environment variables

Create `.env.production` (gitignored):

```env
EXPO_PUBLIC_API_URL=https://api.your-domain.com/api
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_production_google_maps_key
```

### 3. Build

```bash
# Android APK / AAB
eas build --platform android

# iOS IPA
eas build --platform ios

# Both at once
eas build --platform all
```

### 4. Submit to app stores

```bash
eas submit --platform android
eas submit --platform ios
```

### Google Maps key — Android native config

The Android native Google Maps config reads from `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` via `app.config.ts`. Make sure the key has **Maps SDK for Android** enabled in Google Cloud Console and is restricted to your app's package name (`com.smartassettracker`) in production.

---

## Tech Stack

- **Framework**: Expo (React Native)
- **Language**: TypeScript
- **Navigation**: Expo Router
- **Maps**: React Native Maps
- **Camera / QR**: Expo Camera, Expo Barcode Scanner
- **HTTP client**: Axios
- **Local storage**: AsyncStorage
