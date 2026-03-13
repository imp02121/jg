# BundleNudge — OTA Updates for React Native

A complete guide to setting up BundleNudge in a new React Native app. This covers what BundleNudge is, how it works under the hood, and step-by-step integration for both iOS and Android.

---

## What is BundleNudge?

BundleNudge is an OTA (over-the-air) update system for React Native. It lets you push JavaScript bundle changes directly to users' devices without going through App Store or Play Store review.

**What you can update:** Any JavaScript/TypeScript code, styles, images imported via `require()`, and any logic that lives in the JS bundle.

**What you cannot update:** Native code (Objective-C, Swift, Kotlin, Java), native dependencies, or anything that requires a new binary build. BundleNudge has fingerprint detection that warns you when native dependencies change.

### How it works (high level)

```
1. You push code to GitHub
2. BundleNudge's cloud build worker clones your repo, runs Metro + Hermes,
   and uploads the compiled .hbc bundle to R2 storage
3. Your app's SDK checks for updates (on launch, on foreground, or on a timer)
4. If a new bundle is available, the SDK downloads it, verifies its SHA-256 hash,
   and stores it on-device
5. On next app launch (or immediately, depending on config), the native module
   loads the new bundle instead of the embedded one
6. If the app crashes within 30 seconds, the SDK automatically rolls back to
   the previous working bundle
```

### Architecture

```
┌─────────────────────┐     ┌──────────────────────────────────┐
│  Your React Native  │────▶│  BundleNudge API                 │
│  App (SDK embedded) │     │  (Cloudflare Workers + Hono)     │
└─────────────────────┘     │                                  │
                            │  D1 (SQLite) — primary data      │
                            │  R2 — JS bundle storage           │
                            │  KV — caching, rate limits        │
                            │  Durable Objects — WebSocket      │
                            └──────────┬───────────────────────┘
                                       │
                            ┌──────────▼───────────────────────┐
                            │  Build Worker                    │
                            │  (Scaleway Serverless Container) │
                            │  clone → Metro → Hermes → R2    │
                            └──────────────────────────────────┘

┌─────────────────────┐
│  Dashboard          │  app.bundlenudge.com
│  (Vite + React SPA) │  Deploy, rollback, monitor, configure
└─────────────────────┘
```

---

## Prerequisites

- React Native **>= 0.72** (supports both Old and New Architecture)
- Node.js **>= 18**
- A BundleNudge account at [app.bundlenudge.com](https://app.bundlenudge.com)
- Your app registered in the dashboard (you'll get an `appId`)

---

## Step 1: Install the SDK

```bash
# npm
npm install @bundlenudge/sdk @react-native-async-storage/async-storage

# yarn
yarn add @bundlenudge/sdk @react-native-async-storage/async-storage

# pnpm
pnpm add @bundlenudge/sdk @react-native-async-storage/async-storage
```

AsyncStorage is a **required peer dependency** — the SDK uses it to persist update metadata, circuit breaker state, and in-app message dismissals.

### iOS: Install CocoaPods

```bash
cd ios && pod install && cd ..
```

### Expo

If you're using Expo with a development build (not Expo Go), the SDK includes a config plugin:

```json
// app.json
{
  "expo": {
    "plugins": ["@bundlenudge/sdk"]
  }
}
```

Then run `npx expo prebuild` to generate native files.

> **Expo Go is NOT supported** — BundleNudge requires native modules for bundle storage and app restart. The SDK provides a JS-only fallback for Expo Go that simulates the interface but doesn't actually apply updates.

---

## Step 2: Configure the Native Module (iOS)

The native module is what lets the app load a downloaded OTA bundle instead of the embedded one. This is the most critical step.

### Swift AppDelegate (RN 0.84+)

Edit `ios/YourApp/AppDelegate.swift`:

```swift
import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import BundleNudge  // ← Add this import

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?
  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "YourApp",
      in: window,
      launchOptions: launchOptions
    )
    return true
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
    #if DEBUG
      // In DEBUG, always load from Metro dev server
      RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
    #else
      // In RELEASE, check for BundleNudge OTA bundle first, fall back to embedded
      BundleNudge.bundleURL() ?? Bundle.main.url(forResource: "main", withExtension: "jsbundle")
    #endif
  }
}
```

### Obj-C AppDelegate (RN 0.72–0.83)

If your app uses the older Obj-C AppDelegate pattern:

```objc
// AppDelegate.mm

#import "AppDelegate.h"
#import <React/RCTBundleURLProvider.h>
#import <BundleNudge/BundleNudge.h>  // ← Add this import

@implementation AppDelegate

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  // Check for BundleNudge OTA bundle first
  NSURL *bundleNudgeURL = [BundleNudge bundleURL];
  if (bundleNudgeURL) {
    return bundleNudgeURL;
  }
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

@end
```

### What `BundleNudge.bundleURL()` does

1. Checks if there's a **pending update** (downloaded but not yet applied)
2. If yes: promotes it to "current", returns the file path
3. If no: checks for a **current OTA bundle** on disk
4. Validates the bundle's SHA-256 hash against stored metadata
5. Returns `nil` if no OTA bundle exists (app loads embedded bundle)

> **Critical:** `BundleNudge.bundleURL()` is NEVER called in `DEBUG` builds. Metro dev server always takes priority. You must test OTA updates with RELEASE builds.

---

## Step 3: Configure the Native Module (Android)

Edit `android/app/src/main/java/com/yourapp/MainApplication.kt`:

```kotlin
package com.yourapp

import android.app.Application
import com.bundlenudge.BundleNudgeImpl  // ← Add this import
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList = PackageList(this).packages,
      // ← Pass the BundleNudge bundle path
      jsBundleFilePath = BundleNudgeImpl.getBundlePath(applicationContext),
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
  }
}
```

`BundleNudgeImpl.getBundlePath()` works the same way as iOS: checks for pending → current → returns `null` (embedded).

---

## Step 4: Initialize the SDK in JavaScript

In your root `App.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { BundleNudge, notifyAppReady } from '@bundlenudge/sdk';

function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function initSdk() {
      try {
        await BundleNudge.initialize(
          {
            // Required: your app ID from the dashboard
            appId: 'your-app-id-here',

            // Required: BundleNudge API URL
            apiUrl: 'https://api.bundlenudge.com',

            // Optional configuration (defaults shown)
            debug: __DEV__,              // Enable debug logging
            checkOnLaunch: true,         // Check for updates on app launch
            checkOnForeground: true,     // Check when app comes to foreground
            installMode: 'nextLaunch',   // 'nextLaunch' | 'immediate'
            backgroundCheckInterval: 300, // Seconds between background checks (default: 5 min)
            allowDowngrades: false,       // Allow installing older versions
          },
          {
            // Optional lifecycle callbacks
            onStatusChange: (status) => {
              console.log('[BundleNudge] Status:', status);
            },
            onError: (error) => {
              console.error('[BundleNudge] Error:', error.message);
            },
          },
        );

        // IMPORTANT: Call this after your app renders successfully.
        // This signals to the SDK that the update is stable.
        // If the app crashes before this call, the SDK may rollback.
        await notifyAppReady();

        if (!cancelled) setIsReady(true);
      } catch (error) {
        console.error('SDK init failed:', error);
        if (!cancelled) setIsReady(true); // Still show app even if SDK fails
      }
    }

    initSdk();
    return () => { cancelled = true; };
  }, []);

  if (!isReady) return <LoadingScreen />;

  return <YourAppContent />;
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `appId` | `string` | **(required)** | Your app's UUID from the dashboard |
| `apiUrl` | `string` | `https://api.bundlenudge.com` | API endpoint (must be HTTPS in production) |
| `apiKey` | `string` | — | Optional API key for device authentication |
| `debug` | `boolean` | `false` | Enable verbose debug logging |
| `checkOnLaunch` | `boolean` | `true` | Auto-check for updates on app start |
| `checkOnForeground` | `boolean` | `true` | Auto-check when app returns from background |
| `installMode` | `string` | `'nextLaunch'` | When to apply updates: `'nextLaunch'` or `'immediate'` |
| `backgroundCheckInterval` | `number` | `300` | Seconds between periodic background checks |
| `allowDowngrades` | `boolean` | `false` | Whether to allow installing older bundle versions |
| `verificationWindowMs` | `number` | `30000` | Milliseconds to wait before marking an update as stable |
| `crashThreshold` | `number` | `3` | Number of crashes within the crash window before auto-rollback |
| `crashWindowMs` | `number` | `10000` | Time window (ms) for crash counting |
| `suppressStorageSecurityWarnings` | `boolean` | `false` | Suppress AsyncStorage security warnings on rooted devices |
| `allowLegacyBundles` | `boolean` | `false` | Skip hash validation for pre-existing bundles |

### Lifecycle Callbacks

```typescript
{
  onStatusChange?: (status: UpdateStatus) => void;
  onError?: (error: Error) => void;
  onUpdateAvailable?: (update: UpdateInfo) => void;
  onDownloadProgress?: (progress: DownloadProgress) => void;
  onUpdateInstalled?: (version: string) => void;
}
```

---

## Step 5: Use React Hooks (Optional)

The SDK provides React hooks for declarative update management:

### `useBundleNudge` — Full update lifecycle

```tsx
import { useBundleNudge } from '@bundlenudge/sdk';

function UpdateBanner() {
  const { status, currentVersion, isOtaUpdate, checkForUpdate, sync } = useBundleNudge();

  if (status === 'update-available') {
    return (
      <View>
        <Text>Update available!</Text>
        <Button title="Install" onPress={sync} />
      </View>
    );
  }

  return <Text>Version: {currentVersion ?? 'built-in'} ({isOtaUpdate ? 'OTA' : 'Stock'})</Text>;
}
```

### `useBundleVersion` — Current version info

```tsx
import { useBundleVersion } from '@bundlenudge/sdk';

function VersionDisplay() {
  const { version, releaseNotes, releasedAt, isOtaUpdate } = useBundleVersion();
  return <Text>{version ?? 'stock'}</Text>;
}
```

### `useInAppMessage` — Server-driven messages

```tsx
import { useInAppMessage } from '@bundlenudge/sdk';

function MessageModal() {
  const { message, hasMessage, dismiss } = useInAppMessage();

  if (!hasMessage || !message) return null;

  return (
    <Modal visible>
      <Text>{message.title}</Text>
      <Text>{message.body}</Text>
      <Button title="Got it" onPress={dismiss} />
    </Modal>
  );
}
```

---

## Step 6: Dashboard Setup

1. **Sign up** at [app.bundlenudge.com](https://app.bundlenudge.com)
2. **Create an app** — you'll get an `appId` (UUID format)
3. **Connect GitHub** — link your repo so the build worker can clone it
4. **Configure build settings** — entry file, platform, any custom Metro config
5. **Trigger a build** — or push to the connected branch

### Build Pipeline

When you trigger a build (manually or via GitHub webhook):

```
1. Build worker (Scaleway container) starts
2. Clones your repo at the specified commit
3. Runs Metro bundler to create the JS bundle
4. Compiles with Hermes (produces .hbc bytecode)
5. Computes SHA-256 hash of the bundle
6. Computes native and runtime fingerprints
7. Uploads bundle to R2 storage
8. Records build metadata in D1
```

### Deploying an update

After a build completes:

1. Go to the **commit detail page** in the dashboard
2. Click **Deploy** to make the release available
3. Set **rollout percentage** (0–100%) for gradual rollout
4. Monitor: device count, download count, blocked devices, errors

### Rollback

If something goes wrong:

- **Automatic:** The SDK detects crashes (3 within 10s) and rolls back to the previous bundle
- **Manual (dashboard):** Click "Rollback" on any deployed release to deactivate it and reactivate the previous version
- **Manual (SDK):** Call `BundleNudge.getInstance().rollback()` from your app

---

## Step 7: Testing OTA Updates

### Building a release build

OTA updates **only work in release builds**. In debug mode, React Native loads from the Metro dev server, and `BundleNudge.bundleURL()` is never called.

```bash
# iOS — Release build
npx react-native run-ios --mode Release

# Android — Release build
npx react-native run-android --mode release
```

### Testing the flow

1. Build and install a release build on your device/simulator
2. Open the app — the SDK will initialize and register the device
3. Make a code change, push to GitHub, trigger a build in the dashboard
4. Deploy the build with 100% rollout
5. Wait for the SDK to check for updates (or kill + relaunch the app)
6. On next launch, the new bundle loads

### Verifying the update applied

```tsx
import { BundleNudge } from '@bundlenudge/sdk';

// Check if running an OTA bundle
const release = BundleNudge.getInstance().getReleaseInfo();
console.log('Is OTA:', release.isOtaUpdate);
console.log('Version:', release.version);
console.log('Released:', release.releasedAt);
```

---

## How the SDK Works Internally

### Update check flow

```
POST /v1/updates/check
{
  appId, deviceId, currentVersion, currentBundleHash,
  appVersion, platform, nativeFingerprint
}

Response:
{
  bundleUrl,      // R2 download URL
  bundleHash,     // SHA-256 for verification
  version,        // Semantic version
  releaseNotes,   // Optional
  bundleSize,     // Bytes
  releaseId       // For tracking
}
```

### Dual metadata stores

The SDK maintains two metadata stores that must stay in sync:

1. **Native metadata** (`Documents/bundlenudge/metadata.json`) — read by native code at app launch before JS executes
2. **JS AsyncStorage** (`@BundleNudge:metadata`) — read/written by the JS SDK

`syncNativeMetadata()` runs on init to reconcile any differences (e.g., native applied a pending update on launch that JS doesn't know about yet).

### Crash detection & auto-rollback

```
App launches with OTA bundle
  → SDK sets "loading" flag in AsyncStorage
  → App renders successfully
  → notifyAppReady() clears the flag, starts 30s stability timer
  → If app crashes before notifyAppReady():
      → Next launch: SDK sees stale "loading" flag
      → Increments crash counter
      → If crashes >= 3 within 10s window:
          → Rolls back to previous bundle
          → Blacklists the failed version+hash in circuit breaker (7-day TTL)
```

### Circuit breaker

Failed version+hash combos are blacklisted so the SDK won't download the same broken bundle again. The blacklist:
- Stores up to 50 entries
- Each entry expires after 7 days
- Is keyed by `version + hash` (so a re-published fix with the same version but different hash will pass through)
- Persists across app restarts via AsyncStorage

---

## Security

- **HTTPS enforced** — the SDK rejects HTTP API URLs (except localhost for development)
- **SHA-256 hash verification** — every downloaded bundle is verified against the server-provided hash before being stored
- **Bundle integrity on load** — native code re-validates the hash on every app launch
- **Tampered bundle detection** — if the hash doesn't match, the native module deletes the bundle and falls back to embedded
- **No JS memory buffering** — bundles are streamed directly to disk via NSURLSession/HttpURLConnection
- **Version sanitization** — version strings are sanitized to prevent path traversal

---

## Crash Reporter Integration

Tag your crash reporter with OTA metadata for debugging:

```tsx
import { tagSentry, tagBugsnag, tagCrashlytics } from '@bundlenudge/sdk';

// After SDK init:
tagSentry();       // Sets Sentry tags: bundlenudge.version, bundlenudge.isOta, etc.
tagBugsnag();      // Same for Bugsnag
tagCrashlytics();  // Same for Firebase Crashlytics
```

---

## Troubleshooting

### "No update applied" after deploying

- **Are you running a RELEASE build?** Debug builds use Metro, not BundleNudge.
- **Is the SDK initialized?** Check `BundleNudge.isInitialized()`.
- **Is the release deployed at 100%?** Check the dashboard.
- **Is the device registered?** Look at device count in the dashboard.
- **Check debug logs:** Set `debug: true` in config and filter for `[BundleNudge]`.

### App crashes after OTA update

- The SDK will auto-rollback after 3 crashes within 10s.
- Check the circuit breaker: the failed version is blacklisted for 7 days.
- To force a re-download after fixing: change the bundle content (even a whitespace change produces a new hash).

### `BundleNudge.bundleURL()` returns nil

This is expected if:
- No OTA bundle has been downloaded yet
- The app is running in DEBUG mode
- The stored bundle failed hash validation (corrupted/tampered)

The app will load the embedded bundle as normal.

### AsyncStorage warnings on rooted devices

Set `suppressStorageSecurityWarnings: true` in the config. Note: AsyncStorage is not encrypted — for sensitive token storage, consider the Keychain/Keystore in a future SDK release.

---

## API Reference (SDK Methods)

```typescript
// Static methods
BundleNudge.initialize(config, callbacks?)  // Init singleton — call once
BundleNudge.getInstance()                   // Get initialized instance
BundleNudge.isInitialized()                 // Check if initialized

// Instance methods
sdk.checkForUpdate(trigger?)        // Check for available update
sdk.downloadAndInstall(update)      // Download + verify + store
sdk.sync(trigger?)                  // checkForUpdate + downloadAndInstall
sdk.notifyAppReady()                // Signal app rendered successfully
sdk.restartApp()                    // Restart to apply pending update
sdk.clearUpdates()                  // Remove all OTA bundles
sdk.getStatus()                     // Current status: idle, checking, downloading, etc.
sdk.getCurrentVersion()             // Current OTA version or null
sdk.getReleaseInfo()                // { version, releaseNotes, releasedAt, isOtaUpdate }
sdk.canRollback()                   // Whether rollback is available
sdk.rollback()                      // Manual rollback to previous version
sdk.trackEvent(name)                // Health monitor: track named event
sdk.trackEndpoint(method, url, status)  // Health monitor: track API call
sdk.isHealthVerified()              // All health checks passed?
sdk.getCurrentMessage()             // Current in-app message or null
sdk.dismissMessage(messageId)       // Dismiss an in-app message

// Standalone functions
notifyAppReady()                    // Shorthand for getInstance().notifyAppReady()
getNativeInfo()                     // { sdkVersion, platform, ... }
restartApp()                        // Shorthand for restart
clearAllUpdates()                   // Shorthand for clearUpdates
```

---

## Quick Checklist

- [ ] Install `@bundlenudge/sdk` and `@react-native-async-storage/async-storage`
- [ ] Run `pod install` for iOS
- [ ] Update iOS AppDelegate to call `BundleNudge.bundleURL()` in the `#else` (RELEASE) branch
- [ ] Update Android MainApplication to pass `BundleNudgeImpl.getBundlePath(context)` as `jsBundleFilePath`
- [ ] Call `BundleNudge.initialize()` in your root App component
- [ ] Call `notifyAppReady()` after your main UI renders
- [ ] Create your app in the BundleNudge dashboard
- [ ] Connect your GitHub repo
- [ ] Test with a RELEASE build (not debug!)
- [ ] Trigger a build, deploy, and verify the update arrives on-device
