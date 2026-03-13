# @bundlenudge/sdk

React Native SDK for OTA updates. TypeScript, tsup (CJS + ESM), peer deps: react >=18, react-native >=0.72, @react-native-async-storage/async-storage.

## Key Files

| File                             | Purpose                                                                    |
| -------------------------------- | -------------------------------------------------------------------------- |
| `src/bundlenudge.ts`             | Main singleton class: initialize, checkForUpdate, downloadAndInstall, sync |
| `src/updater.ts`                 | Update check + download + hash verification                                |
| `src/rollback-manager.ts`        | Rollback to previous bundle, blacklist via CircuitBreaker                  |
| `src/crash-detector.ts`          | Dual-flag verification (appReady + healthPassed), crash counting           |
| `src/native-crash-guard.ts`      | Detects crashes before JS executes (AsyncStorage flag)                     |
| `src/circuit-breaker.ts`         | Blacklists version+hash combos to prevent crash loops                      |
| `src/storage/storage.ts`         | JS metadata persistence via AsyncStorage (single JSON blob)                |
| `src/native-module.ts`           | Native module bridge (TurboModule or bridge), JS fallback for Expo Go      |
| `src/fetch-utils.ts`             | HTTPS enforcement, redirect blocking, timeout                              |
| `src/hooks/useBundleNudge.ts`    | React hook: full update lifecycle                                          |
| `src/hooks/useAppStoreUpdate.ts` | React hook: app store update prompts (fingerprint blocks)                  |
| `src/hooks/useInAppMessage.ts`   | React hook: server-driven in-app messages with dismiss persistence         |
| `src/hooks/useBundleVersion.ts`  | React hook: current OTA version, release notes, releasedAt                 |
| `src/expo/plugin.ts`             | Expo config plugin for auto-configuration                                  |
| `ios/BundleNudge.h`              | Obj-C header — exposes `+bundleURL` for AppDelegate                        |
| `ios/BundleNudge.mm`             | Obj-C++ native module (~830 lines): downloads, hash verify, file I/O       |
| `android/src/`                   | Kotlin native module: same capabilities as iOS                             |

## Update Flow

```
initialize() -> registerDevice -> checkForUpdate (POST /v1/updates/check)
  -> downloadAndInstall (streaming to disk, hash verify, set pending)
  -> restart app or apply on next launch
```

The update check includes `rolledBackFrom` context (releaseId, version, hash) when the device previously rolled back. The server can respond with `shouldClearUpdates: true` to force an embedded bundle fallback. The `releaseId` is stored in metadata so the API can track which release is active on each device.

## Rollback Architecture

Rollback triggers: crash count >= threshold (default 3) within crash window (10s), native crash guard detection, route failure, server-triggered, or manual.

**Stability window:** After `notifyAppReady()`, a 30s stability timer starts (`stabilityWindowMs`). If the app survives without crashing, `onStabilityConfirmed` fires and old bundles can be cleaned up.

**Circuit breaker (7-day TTL):** Rolled-back version+hash combos are blacklisted via `CircuitBreaker`. The same version with a different hash (re-published fix) passes through. Entries expire after 7 days, max 50 entries, persisted in AsyncStorage.

**Embedded fallback:** When `previousVersion === "__embedded__"`, rollback calls `clearUpdates()` instead of `rollbackToVersion()`, so `+bundleURL` returns nil and the app loads the built-in bundle.

**Concurrency protection:** `isRollingBack` flag prevents duplicate rollback calls. Circuit breaker save is awaited before app restart to ensure blacklist persists.

## Native Module Architecture

The SDK has a **full native module** on both platforms — it is NOT JS-only.

**iOS:** `ios/BundleNudge.mm` (Obj-C++) — NSURLSession downloads, CommonCrypto SHA-256, file I/O, metadata.json persistence, `+bundleURL` static method for AppDelegate.

**Android:** `android/src/` (Kotlin) — equivalent functionality.

**Two metadata stores must stay in sync:**

1. **Native metadata.json** at `Documents/bundlenudge/metadata.json` — managed by native code
2. **JS AsyncStorage** at `@BundleNudge:metadata` — managed by `src/storage/storage.ts`
3. `syncNativeMetadata()` in `bundlenudge.ts` syncs them on init

**Bundle loading flow (AppDelegate):**

```
#if DEBUG  → Metro dev server (BundleNudge.bundleURL() is NEVER called)
#else      → BundleNudge.bundleURL() ?? embedded main.jsbundle
```

`+bundleURL` checks pending update → promotes to current → returns path. This only fires in RELEASE builds.

## Patterns

- Singleton with async init: `BundleNudge.initialize(config)` -- `src/bundlenudge.ts`
- Mutex prevents concurrent checkForUpdate/downloadAndInstall -- `src/mutex.ts`
- Native module bridge with JS fallback for Expo Go -- `src/native-module.ts`
- CodePush migration aliases: `setupCodePush`, `useCodePush`, `withCodePush` -- `src/setup/`, `src/hooks/`
- All API responses validated with Zod schemas -- `src/updater.ts`
- Fingerprint safety: `useAppStoreUpdate` hook surfaces blocks from API -- `src/hooks/useAppStoreUpdate.ts`

## Commands

```bash
pnpm --filter @bundlenudge/sdk test
pnpm --filter @bundlenudge/sdk typecheck
pnpm --filter @bundlenudge/sdk build       # tsup -> CJS + ESM + DTS
```

## Gotchas

- **DEBUG builds do NOT apply OTA updates** — AppDelegate uses Metro in DEBUG, `BundleNudge.bundleURL()` never called. Version reporting will be stale. Always test OTA with RELEASE builds (`--mode Release`).
- **Two metadata stores can diverge** — if native applies a pending update but JS doesn't know, or vice versa. `syncNativeMetadata()` handles this on init, but edge cases exist.
- Native files (`ios/`, `android/`) ship inside the npm tarball but live at the **package root**, not under `src/`. Don't look only in `src/` for SDK code.
- React Native mocked at module level in tests (NativeModules, Platform, AsyncStorage)
- `downloadBundleToStorage` streams to disk natively -- no JS memory buffering
- Storage warns once per session about AsyncStorage on rooted devices (suppress via config)
- SDK does NOT use `react-native-fs` -- all file ops go through native module interface
- Hash comparison uses normalized lowercase comparison (`src/crypto-utils.ts`)
