# Native App Setup (iOS & Android)

Dit project is nu klaar voor native iOS en Android build via **Capacitor**. De volgende stappen zullen je helpen om de native apps te bundelen.

## ⚠️ Prerequisites

### Mac (voor iOS development)
- Xcode 15+
- Cocoapods: `sudo gem install cocoapods`
- Node.js 18+

### Android Development
- Android Studio (installeert Android SDK, NDK, etc.)
- Java 11+
- ANDROID_HOME environment variable ingesteld

## 📱 Setup Stappen

### 1. Dependencies installeren (in `frontend/` folder)

```bash
cd frontend
npm install
```

### 2. Next.js build voor native

**Voor lokale development op phone:**
```bash
npm run build
```

**Capacitor verwacht de static files in `out/` folder:**
```bash
# Dit is al ingesteld in next.config.ts (export mode)
npm run build
```

### 3. iOS App Setup

```bash
# Voeg iOS platform toe (eenmalig)
npm run capacitor:add:ios  # of: npx cap add ios

# Build Next.js en sync naar iOS
npm run capacitor:build:ios

# Open Xcode om te builden/testen
npm run capacitor:open:ios
```

**In Xcode:**
1. Select target "App" → General tab
2. Zet "Minimum Deployment" op iOS 15.0+
3. Zet je Development Team
4. Zet Bundle Identifier (al ingesteld: `com.thokan.cloud`)
5. Klik "Product" → "Run" om te builden op device/simulator

**iOS Production Build (met thokan.cloud domein):**
```bash
cd frontend
export NEXT_PUBLIC_NATIVE_API_BASE_URL=https://thokan.cloud/api/v1
export CAPACITOR_SERVER_URL=https://thokan.cloud
npm run capacitor:build:ios
npm run capacitor:open:ios
```

Dan in Xcode:
1. Select je device of simulator
2. Klik "Run" (Play button) of druk Cmd+R
3. De app zal automatisch verbinden met `https://thokan.cloud`
4. Je ziet het ThoKan Cloud login scherm met logo
5. Na inloggen heb je volledige toegang tot bestanden, e-mail, admin en instellingen

**iOS Netwerk Features:**
- ✅ Automatische domein verbinding (https://thokan.cloud/api/v1)
- ✅ Netwerk detectie (offline indicatoren)
- ✅ Auto-reconnect wanneer netwerk beschikbaar is
- ✅ Volledige cloud toegang (files, email, admin, settings)

### 4. Android App Setup

```bash
# Voeg Android platform toe (eenmalig)
npm run capacitor:add:android  # of: npx cap add android

# Build Next.js en sync naar Android
npm run capacitor:build:android

# Open Android Studio
npm run capacitor:open:android
```

**In Android Studio:**
1. Zet compileSdkVersion op 35+
2. Zet AGP (Android Gradle Plugin) op 8.3+
3. Klik "Run" → target device/emulator

**Android Production Build (met thokan.cloud domein):**
```bash
cd frontend
export NEXT_PUBLIC_NATIVE_API_BASE_URL=https://thokan.cloud/api/v1
export CAPACITOR_SERVER_URL=https://thokan.cloud
npm run capacitor:build:android
npm run capacitor:open:android
```

Dan in Android Studio:
1. Select je device of emulator
2. Klik "Run" of druk Shift+F10
3. De app zal automatisch verbinden met `https://thokan.cloud`
4. Je ziet het ThoKan Cloud login scherm met logo
5. Na inloggen heb je volledige toegang tot bestanden, e-mail, admin en instellingen

**Android Netwerk Features:**
- ✅ Automatische domein verbinding (https://thokan.cloud/api/v1)
- ✅ Netwerk detectie (offline indicatoren)
- ✅ Auto-reconnect wanneer netwerk beschikbaar is
- ✅ Volledige cloud toegang (files, email, admin, settings)

### 5. Environment Configuration

**For production builds (connecting to thokan.cloud):**
```bash
export NEXT_PUBLIC_NATIVE_API_BASE_URL=https://thokan.cloud/api/v1
export CAPACITOR_SERVER_URL=https://thokan.cloud
```

**For local/LAN testing (connecting to local backend):**
```bash
export NEXT_PUBLIC_NATIVE_API_BASE_URL=http://192.168.1.42:8000/api/v1
export CAPACITOR_SERVER_URL=http://192.168.1.42:3000
```

These environment variables are baked into the static bundle at build time.

### 6. Continuous Development

Na eerste setup, voor dagelijks development:

```bash
# Maak changes in Next.js
npm run dev  # of npm run build

# Sync changes naar native
npm run capacitor:sync

# Herstart app op device (in Xcode/Android Studio)
```

## 🔧 Configuratie

**App metadata staat in:**
- `capacitor.config.ts` - App ID, name, build output paths, iOS/Android specific settings

**Web manifest staat in:**
- `public/manifest.webmanifest` - PWA icons, theme colors (ook gebruikt door native build)

**Service Worker staat in:**
- `public/sw.js` - Offline support & caching

**Network detection staat in:**
- `components/capacitor-providers.tsx` - Automatic network status detection and reconnection

## 📦 Distribution

### iOS (TestFlight / App Store)
```bash
cd frontend
export NEXT_PUBLIC_NATIVE_API_BASE_URL=https://thokan.cloud/api/v1
export CAPACITOR_SERVER_URL=https://thokan.cloud
npm run capacitor:build:ios
npm run capacitor:open:ios
# In Xcode: Product → Archive → Upload
```

### Android (Play Store / Firebase)
```bash
cd frontend
export NEXT_PUBLIC_NATIVE_API_BASE_URL=https://thokan.cloud/api/v1
export CAPACITOR_SERVER_URL=https://thokan.cloud
npm run capacitor:build:android
npm run capacitor:open:android
# In Android Studio: Build → Generate Signed Bundle/APK
```

## 🐛 Troubleshooting

**"Pod install failed" (iOS)**
```bash
cd ios/App
rm -rf Pods Podfile.lock
pod repo update
pod install
cd ../..
```

**"Build failed" (Android)**
```bash
cd android
./gradlew clean build --stacktrace
cd ..
```

**App crashes bij startup**
- Check console output in Xcode/Android Studio
- Zorg dat API backend draait (https://thokan.cloud/api/v1)
- Zorg dat CORS ingesteld is voor het domein
- Check dat JWT token correct wordt meegepast in auth headers
- Check Network status in localStorage via DevTools

**App toont login scherm maar kan niet verbinden**
- Controleer dat `CAPACITOR_SERVER_URL` correct is ingesteld (default: https://thokan.cloud)
- Controleer dat `NEXT_PUBLIC_NATIVE_API_BASE_URL` correct is ingesteld (default: https://thokan.cloud/api/v1)
- Controleer netwerk verbinding op het device
- Controleer SSL certificate validity op het device (iOS 15+)

**iOS shows "Untrusted server certificate"**
- Zorg dat de SSL certificate geldig is op thokan.cloud
- Op simulator: Certificaten worden automatisch vertrouwd voor https://localhost
- In production: App vertrouwt alleen geldig ondertekende certificates

## 📚 Meer info

- [Capacitor docs](https://capacitorjs.com/)
- [Capacitor iOS docs](https://capacitorjs.com/docs/ios)
- [Capacitor Android docs](https://capacitorjs.com/docs/android)
- [Next.js static export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [iOS deployment](https://developer.apple.com/ios/submit/)
- [Android deployment](https://play.google.com/console)

---

**Note:** Deze setup bouwt dezelfde React/TypeScript code voor native als voor web, dus geen code duplicatie!
