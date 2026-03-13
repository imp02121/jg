# @bundlenudge/sdk

React Native SDK for BundleNudge OTA updates.

## Installation

```bash
npm install @bundlenudge/sdk
# or
yarn add @bundlenudge/sdk
```

### iOS Setup

Add to your `Podfile`:

```ruby
pod 'BundleNudge', :path => '../node_modules/@bundlenudge/sdk/ios'
```

Update `AppDelegate.swift`:

```swift
import BundleNudge

func sourceURL() -> URL? {
  return BundleNudge.bundleURL() ?? Bundle.main.url(forResource: "main", withExtension: "jsbundle")
}
```

### Android Setup

Add to `MainApplication.kt`:

```kotlin
import com.bundlenudge.BundleNudgeModule
import com.bundlenudge.BundleNudgePackage

override fun getJSBundleFile(): String? {
  return BundleNudgeModule.getBundlePath(applicationContext)
}

override fun getPackages(): List<ReactPackage> = listOf(
  MainReactPackage(),
  BundleNudgePackage()
)
```

## Usage

### Initialize

```typescript
import { BundleNudge } from "@bundlenudge/sdk";

await BundleNudge.initialize({
  appId: "your-app-id",
  checkOnLaunch: true,
  checkOnForeground: true,
  installMode: "nextLaunch", // or 'immediate'
});
```

### Check for Updates

```typescript
const bundleNudge = BundleNudge.getInstance();

// Manual check
const update = await bundleNudge.checkForUpdate();
if (update) {
  await bundleNudge.downloadAndInstall(update);
}

// Or use sync() for automatic handling
await bundleNudge.sync();
```

### Mark App Ready

Call after your main UI renders to verify the update works:

```typescript
useEffect(() => {
  BundleNudge.getInstance().notifyAppReady();
}, []);
```

### Callbacks

```typescript
await BundleNudge.initialize(
  {
    appId: "your-app-id",
  },
  {
    onStatusChange: (status) => console.log("Status:", status),
    onDownloadProgress: (progress) => console.log(`${progress.percentage}%`),
    onUpdateAvailable: (update) => console.log("Update:", update.version),
    onError: (error) => console.error("Error:", error),
  },
);
```

### Hooks

#### useBundleVersion

Display the current OTA bundle version and release info:

```typescript
import { useBundleVersion } from '@bundlenudge/sdk';

function SettingsScreen() {
  const { version, releaseNotes, releasedAt, isOtaUpdate } = useBundleVersion();
  if (!isOtaUpdate) return null;
  return <Text>OTA Version: {version}</Text>;
}
```

`isOtaUpdate` is `false` until the first OTA bundle is applied.

#### useAppStoreUpdate

Detect when a native App Store or Play Store update is required (e.g., after a native code change that makes OTA updates incompatible):

```typescript
import { useAppStoreUpdate } from '@bundlenudge/sdk';

function StoreUpdateBanner() {
  const { requiresAppStoreUpdate, message, openStore } = useAppStoreUpdate();
  if (!requiresAppStoreUpdate) return null;
  return (
    <View>
      <Text>{message}</Text>
      <Button title="Update Now" onPress={openStore} />
    </View>
  );
}
```

#### useInAppMessage

Show server-driven in-app messages with persistent dismissal:

```typescript
import { useInAppMessage } from '@bundlenudge/sdk';

function InAppBanner() {
  const { message, hasMessage, dismiss } = useInAppMessage();
  if (!hasMessage) return null;
  return (
    <View>
      <Text>{message.title}</Text>
      <Text>{message.body}</Text>
      <Button title="Dismiss" onPress={dismiss} />
    </View>
  );
}
```

Dismissed messages are persisted across sessions via AsyncStorage.

## Architecture

```
┌─────────────────┐
│   BundleNudge   │  Public API
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌───▼───┐
│Storage│ │Updater│
└───────┘ └───┬───┘
              │
    ┌─────────┼─────────┐
    │         │         │
┌───▼────┐ ┌──▼───┐ ┌───▼───────┐
│Crash   │ │Native│ │Rollback   │
│Detector│ │Module│ │Manager    │
└────────┘ └──────┘ └───────────┘
```

### Key Classes

- **BundleNudge** - Main entry point, singleton
- **Storage** - AsyncStorage-based metadata persistence
- **Updater** - Download and install updates
- **CrashDetector** - Dual-flag verification (appReady + healthPassed), crash counting
- **RollbackManager** - Rollback to previous version, circuit breaker blacklisting

### Native Module Interface

```typescript
interface NativeModuleInterface {
  getConfiguration(): Promise<{ appVersion, buildNumber, bundleId }>
  getCurrentBundleInfo(): Promise<{ currentVersion, pendingVersion, ... } | null>
  getBundlePath(): Promise<string | null>
  notifyAppReady(): Promise<boolean>
  restartApp(onlyIfUpdateIsPending: boolean): Promise<boolean>
  clearUpdates(): Promise<boolean>
}
```

## Update Flow

1. **Check** - POST /v1/updates/check with device attributes
2. **Download** - Fetch bundle from bundleUrl
3. **Verify** - Check SHA-256 hash matches
4. **Save** - Write to native filesystem
5. **Mark Pending** - Update metadata
6. **Restart** - Apply on next launch or immediately

## Crash Detection & Rollback

### Free/Pro Tier

- 60-second verification window after update
- If app crashes before `notifyAppReady()`, rollback on next launch
- After 60 seconds without crash, previous bundle is deleted

### Team/Enterprise Tier

- Route monitoring: track critical API responses
- If any critical route returns non-2xx, immediate rollback
- 5-minute timeout (routes not called = success)

## Stored Metadata

```typescript
interface StoredMetadata {
  deviceId: string; // Stable UUID
  accessToken: string | null; // API auth token
  currentVersion: string | null;
  currentVersionHash: string | null;
  previousVersion: string | null; // For rollback
  pendingVersion: string | null; // Downloaded, not applied
  pendingUpdateFlag: boolean;
  lastCheckTime: number | null;
  crashCount: number;
  lastCrashTime: number | null;
}
```

## Development

```bash
pnpm dev        # Watch mode
pnpm test       # Run tests
pnpm typecheck  # Type check
pnpm build      # Build for distribution
```
