# Starward 3D for Google Play and the App Store
The mobile build is the same game compiled with the `mobile` platform adapter (`src/platform/mobile.ts`), kept separate from the CrazyGames and web builds. It is wrapped in a native shell with [Capacitor](https://capacitorjs.com/).

## Build the web assets
```bash
npm run build:mobile      # → dist/mobile/
```

## Wrap them (one-time setup, on a machine with Android Studio / Xcode)
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios @capacitor/local-notifications
npx cap init "Starward 3D" com.yourstudio.starward3d --web-dir dist/mobile
npx cap add android
npx cap add ios
npx cap sync
npx cap open android      # build and sign in Android Studio
npx cap open ios          # build and sign in Xcode
```
After every game update: `npm run build:mobile && npx cap sync`.

## What the mobile adapter does
- **Local notifications** ("your bays are full", "your recipe is ready") through `@capacitor/local-notifications`, the strongest return trigger a mobile game has. The adapter already schedules and cancels them; the game will schedule them as the daily loop lands (Part 3).
- **Ads and in-app purchases** are stubs that report "unavailable" today. AdMob (`@capacitor-community/admob`) and store billing slot into the same adapter without touching game code.
- Saves use on-device storage. Cloud save (Google Play Games / Game Center) can be added in the adapter later.

Store listings need your developer accounts, signing keys and payment details, so those steps are yours.
