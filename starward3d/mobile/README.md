# Helioscend for Google Play and the App Store
The mobile build is the same game compiled with the `mobile` platform adapter (`src/platform/mobile.ts`), kept separate from the CrazyGames and web builds. It is wrapped in a native shell with [Capacitor](https://capacitorjs.com/).

## Build the web assets
```bash
npm run build:mobile      # → dist/mobile/
```

## Wrap them (one-time setup, on a machine with Android Studio / Xcode)
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios @capacitor/local-notifications
# capacitor.config.json is already in the project: change appId to your own reverse domain first
npx cap add android
npx cap add ios
npx cap sync
npx cap open android      # build and sign in Android Studio
npx cap open ios          # build and sign in Xcode
```
After every game update: `npm run build:mobile && npx cap sync`.

## What the mobile adapter does
- **Local notifications** ("your bays are full", "your recipe is ready") through `@capacitor/local-notifications`, the strongest return trigger a mobile game has. The game schedules them (full bays, finished recipes, supply drops, the daily reward at 7 pm) and the adapter cancels them when the player returns.
- **Ads and in-app purchases** are stubs that report "unavailable" today. AdMob (`@capacitor-community/admob`) and store billing slot into the same adapter without touching game code.
- Saves use on-device storage. Cloud save (Google Play Games / Game Center) can be added in the adapter later.

Store listings need your developer accounts, signing keys and payment details, so those steps are yours.

## Before you submit
- Change `appId` in `capacitor.config.json` (it cannot change after the first upload).
- Host a privacy policy: `mobile/PRIVACY.md` is a ready template. Both stores require the link.
- Icons and splash screens: `npx @capacitor/assets generate` from a 1024×1024 icon (the store thumbnail `store/poki-thumbnail-1024x1024.png` is a good starting point).
