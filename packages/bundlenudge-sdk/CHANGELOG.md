# Changelog

All notable changes to `@bundlenudge/sdk` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1] - 2026-03-06

### Added

- `stabilityWindowMs` config option (default 30s) for post-`notifyAppReady()` stability verification
- `backgroundCheckInterval` config option (default 300s) for periodic background update checks
- `nativeFingerprint` config option for build-time fingerprint override
- `allowLegacyBundles` config option for unverified bundle loading (development only)
- `allowDowngrades` config option to control version downgrade behavior
- `suppressStorageSecurityWarnings` config option for AsyncStorage security warnings
- `rolledBackFrom` context sent to API on update check after a rollback (includes releaseId, version, hash)
- `shouldClearUpdates` server response support for embedded bundle fallback
- `releaseId` storage for tracking which release is currently active
- Circuit breaker with 7-day TTL to prevent re-applying rolled-back updates
- `useAppStoreUpdate` hook for native App Store/Play Store update prompts
- `useInAppMessage` hook for server-driven in-app messaging
- `useBundleVersion` hook for displaying OTA version info in UI
- Foreground check on `AppState` change with configurable `checkOnForeground`
- Native crash guard detection before JS executes
- Bundle integrity validation on load with hash verification
- Telemetry reporting for rollback events
- Dual-flag verification system (appReady + healthPassed)
- Health monitoring with event and endpoint tracking

### Fixed

- Rollback concurrency: `isRollingBack` guard prevents duplicate rollback calls
- Rollback to embedded bundle: `previousVersion === "__embedded__"` triggers `clearUpdates()` instead of `rollbackToVersion()`
- Circuit breaker persistence: `await save()` before app restart ensures blacklist survives
- Native metadata sync: three-case sync logic handles diverged native/JS state
- Stale pending version cleanup when native has no record of JS pending state

### Security

- HTTPS enforcement on `apiUrl` (HTTP only allowed for localhost/127.0.0.1)
- SHA-256 bundle hash verification with normalized lowercase comparison
- Input validation on `appId` (alphanumeric + hyphens, max 100 chars) and `apiKey` (max 256 chars)
- AsyncStorage security warning for token storage on rooted/jailbroken devices
