# Хүрээ — React Native

Native CLI app (not Expo) that talks to the existing Next.js backend in `/Users/xeroerka/Khuree`.

See `KHUREE_RN_MIGRATION.md` for the audited API map, models, and web → screen mapping.

## Run the backend first

```bash
cd /Users/xeroerka/Khuree
npm install
npm run dev
```

Default API origin is `http://localhost:3000` (iOS simulator) or `http://10.0.2.2:3000` (Android emulator). Change `src/config.ts` for a physical device or production host. Never put QPay or R2 secrets in this app.

## iOS

```bash
cd /Users/xeroerka/Khuree/mobile
bundle install
cd ios && bundle exec pod install && cd ..
npx react-native run-ios
```

## Android

```bash
cd /Users/xeroerka/Khuree/mobile
npx react-native run-android
```

## Stack

- React Native 0.87, TypeScript
- React Navigation (tabs + native stack)
- TanStack Query, Axios + Keychain cookie session
- react-native-video (HLS/MP4)
- @d11/react-native-fast-image
- AsyncStorage for continue-watching / resume
