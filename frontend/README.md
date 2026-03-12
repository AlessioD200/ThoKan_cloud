# Frontend

Next.js application for ThoKan Cloud.

## Setup

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

## Environment

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1

# Native iOS/Android API URL override
# Production example: https://thokan.cloud/api/v1
# LAN example for physical device testing: http://192.168.1.42:8000/api/v1
NEXT_PUBLIC_NATIVE_API_BASE_URL=https://thokan.cloud/api/v1

# Optional: load the live hosted app inside the native shell
# Production example: https://thokan.cloud
CAPACITOR_SERVER_URL=https://thokan.cloud
```

App runs on `http://localhost:3000`.

## Android Production Build

Use the hosted domain so the Android app behaves the same as the web app:

```bash
cd frontend
export NEXT_PUBLIC_NATIVE_API_BASE_URL=https://thokan.cloud/api/v1
export CAPACITOR_SERVER_URL=https://thokan.cloud
npm run capacitor:build:android
npx cap open android
```

Then in Android Studio:
1. Select a device or emulator
2. Click "Run" or press Shift+F10
3. The app will load from thokan.cloud and show the login screen

## iOS Production Build

Use the hosted domain so the iOS app behaves the same as the web app:

```bash
cd frontend
export NEXT_PUBLIC_NATIVE_API_BASE_URL=https://thokan.cloud/api/v1
export CAPACITOR_SERVER_URL=https://thokan.cloud
npm run capacitor:build:ios
npx cap open ios
```

Then in Xcode:
1. Select a device or simulator
2. Click the "Play" button (Run) or press Cmd+R
3. The app will connect to thokan.cloud automatically
4. You'll see the ThoKan Cloud login screen with the logo
5. After login, you'll have full access to files, email, admin, and settings

### iOS Network Features

- **Automatic domain connection**: Connects to `https://thokan.cloud/api/v1` by default
- **Network detection**: Automatically detects when connection is lost and shows offline indicators
- **Auto-reconnection**: Retries connection when network becomes available
- **Full cloud access**: Same features as web app (files, email, admin panel, settings)
