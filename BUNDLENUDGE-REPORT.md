# BundleNudge SDK Integration Report

**Project:** The History Gauntlet (React Native Expo)
**SDK Version:** `@bundlenudge/sdk` v0.0.1 (local workspace package)
**Date:** 2026-03-14
**Environment:**
- Expo SDK ~52.0.0
- React Native ^0.76.0
- React ^18.3.1
- Node.js >= 18
- New Architecture: disabled (`newArchEnabled: false`)
- Platform: macOS (Darwin 24.6.0)

---

## Summary

We integrated `@bundlenudge/sdk` into a React Native Expo managed-workflow app ("The History Gauntlet") as a local workspace dependency (`"@bundlenudge/sdk": "workspace:*"`). We encountered four issues during integration, three of which required workarounds that reduce the reliability of the integration. One issue remains an active blocker for iOS builds.

---

## Issue 1: Expo Config Plugin Fails (CJS/ESM Incompatibility)

### Reproduction Steps

1. Add `"plugins": ["@bundlenudge/sdk"]` to `app.json` under the `expo` key, as documented in the SDK README.
2. Run `npx expo prebuild`.

### Expected Behavior

Expo's config plugin system loads `app.plugin.js`, which executes the plugin to auto-configure native files (AppDelegate, MainApplication) for BundleNudge.

### Actual Behavior

Prebuild crashes immediately with:

```
PluginError: Package "@bundlenudge/sdk" does not contain a valid config plugin.
Unexpected token 'typeof'
```

### Root Cause

The SDK's `app.plugin.js` is a CJS entry point:

```js
module.exports = require("./dist/expo/plugin").default;
```

This `require()` call loads `dist/expo/plugin.js`, which is produced by tsup. However, the built output contains ESM-only syntax (e.g., top-level `typeof` usage in a context that Node's CJS parser rejects). Expo's config plugin loader runs in a plain Node.js CJS context, so it cannot parse this output.

Additionally, in our local workspace setup, the `dist/` directory does not exist at all -- the SDK was copied as source and never built. The `package.json` build script (`tsup src/index.ts src/expo/plugin.ts --format cjs,esm --dts`) needs to be run before the plugin can work, but even when built, the CJS/ESM incompatibility remains.

The SDK's `package.json` does define proper conditional exports for the plugin:

```json
"./expo/plugin": {
  "import": "./dist/expo/plugin.mjs",
  "require": "./dist/expo/plugin.js",
  "types": "./dist/expo/plugin.d.ts"
}
```

But `app.plugin.js` bypasses these exports and directly requires the CJS dist file, which contains incompatible syntax.

### Workaround Applied

Removed `"plugins": ["@bundlenudge/sdk"]` from `app.json` entirely. This means native AppDelegate (iOS) and MainApplication (Android) edits for `BundleNudge.bundleURL()` / `BundleNudgeImpl.getBundlePath()` must be done manually, defeating the purpose of the config plugin.

### Suggestions

1. Ensure `tsup` output for `src/expo/plugin.ts` produces valid CJS that Node.js can `require()` without errors. Consider adding `--target node18` or explicitly setting the tsup config to avoid ESM-only syntax in CJS output.
2. Test the config plugin in a clean Expo project as part of CI to catch this class of issue.
3. If the SDK is distributed as source (e.g., in a monorepo workspace), consider shipping a pre-built `app.plugin.js` that does not depend on the `dist/` directory, or document that `pnpm build` must be run before `expo prebuild`.

---

## Issue 2: Static Imports Crash App on Launch

### Reproduction Steps

1. With the Expo config plugin removed (Issue 1 workaround), the native module is not linked.
2. Import the SDK using a standard static ES module import:
   ```tsx
   import { BundleNudge } from "@bundlenudge/sdk";
   ```
3. Launch the app.

### Expected Behavior

The app launches. If the native module is missing, the SDK logs a warning and falls back to the JS-only fallback module (as implemented in `src/native-module.ts` via `createFallbackModule()`).

### Actual Behavior

The app crashes immediately on launch with:

```
Invariant Violation: Failed to call into JavaScript module method
AppRegistry.runApplication(). Module has not been registered as callable.
Registered callable JavaScript modules (n = 0).
```

### Root Cause

Static ES module imports are evaluated at bundle load time, before `AppRegistry.registerComponent()` runs. The SDK's `src/index.ts` re-exports from many internal modules, some of which import from `react-native` and attempt to access `NativeModules` or `TurboModuleRegistry` at the module scope. When the native module is not linked (because the config plugin could not run), this access triggers a fatal error before React's app registry is initialized.

The SDK does have a fallback module (`createFallbackModule()` in `src/native-module.ts`) and a `getModuleWithFallback()` function that returns `{ module, isNative }`, but these are invoked lazily -- the crash happens before they get a chance to run.

### Workaround Applied

Converted all SDK imports to dynamic imports wrapped in try/catch:

```tsx
try {
  const sdk = await import("@bundlenudge/sdk");
  // use sdk.BundleNudge, sdk.notifyAppReady, etc.
} catch (error) {
  console.warn("BundleNudge SDK unavailable:", error);
}
```

This defers module evaluation until after the app registry is set up.

### Suggestions

1. Ensure all top-level module code in the SDK is side-effect-free. Defer any `NativeModules` / `TurboModuleRegistry` access to function call time, not module evaluation time.
2. Document this failure mode in the SDK docs. The current docs show static imports (`import { BundleNudge } from '@bundlenudge/sdk'`) without warning that this will crash if the native module is not linked.
3. Consider splitting the SDK's exports so that pure-JS utilities (hooks, types, config validation) can be imported without triggering native module resolution.

---

## Issue 3: No Graceful Degradation Without Native Module

### Description

The SDK documentation states:

> "Expo Go is NOT supported -- BundleNudge requires native modules for bundle storage and app restart. The SDK provides a JS-only fallback for Expo Go that simulates the interface but doesn't actually apply updates."

The SDK source code confirms this fallback exists: `src/native-module.ts` implements `createFallbackModule()` which provides no-op implementations for all native methods, and `getModuleWithFallback()` returns `{ module, isNative: false }` when the native module is absent.

### Expected Behavior

When the native module is unavailable (unlinked, Expo Go, or config plugin failure), the SDK should:
1. Detect the missing native module.
2. Activate the JS-only fallback automatically.
3. Allow `BundleNudge.initialize()` to succeed (in no-op mode).
4. Allow hooks (`useBundleNudge`, `useBundleVersion`, etc.) to return safe defaults.
5. Log a clear warning explaining the degraded state.

### Actual Behavior

The fallback module exists in source but does not activate correctly when the native module is missing due to a failed config plugin (as opposed to running in Expo Go). The static import crash (Issue 2) occurs before the fallback logic has a chance to run.

Even when using dynamic imports to work around the crash, there is no public API to check whether the native module is available. Consumers must rely on internal behavior and hope that `initialize()` handles it gracefully.

### Suggestions

1. Export a public `isNativeModuleAvailable(): boolean` function so consumers can check availability before calling `initialize()`.
2. Ensure the fallback activates in all "native module missing" scenarios, not just the Expo Go case. The detection logic in `getNativeModule()` already returns `null` correctly -- the issue is that module-level side effects crash before this check runs.
3. Have all exported hooks return safe defaults (empty state, no-op callbacks) when the SDK is not initialized, rather than throwing or accessing uninitialized singletons.

---

## Issue 4: iOS C++17 Build Errors (Current Blocker)

### Reproduction Steps

1. Work around Issues 1-3 (remove config plugin, use dynamic imports).
2. Run `npx expo run:ios` or `cd ios && pod install && xcodebuild`.

### Expected Behavior

The iOS project compiles successfully. React Native 0.76 requires C++17, and the Xcode build should use the C++17 standard.

### Actual Behavior

The build fails with approximately 20 C++ compilation errors in the `React-jsi` pod:

```
'auto' not allowed in template parameter until C++17
No template named 'bool_constant' in namespace 'std'
```

These errors indicate the Xcode build is using C++14 instead of C++17.

### Analysis

React Native 0.76 requires C++17 (`CLANG_CXX_LANGUAGE_STANDARD = c++17`). The errors suggest that either:

1. The BundleNudge native module's podspec or build settings override or conflict with the C++ standard setting.
2. The `expo prebuild` step (run without the BundleNudge config plugin) generated an Xcode project with incorrect C++ language standard settings.
3. There is a version incompatibility between Expo SDK 52, React Native 0.76, and the C++ standard expected by the JSI headers.

This issue may not be directly caused by the BundleNudge SDK, but it appeared during the integration process and warrants investigation into whether the SDK's podspec (`BundleNudge.podspec`) sets any compiler flags that could affect the C++ standard.

### Workaround

None yet. This is the current active blocker. Investigation is ongoing to determine whether a Podfile post-install hook setting `CLANG_CXX_LANGUAGE_STANDARD` to `c++17` resolves the issue.

### Suggestions

1. Verify that `BundleNudge.podspec` does not set or override `CLANG_CXX_LANGUAGE_STANDARD`. If it does, ensure it is set to `c++17` or higher.
2. Document the minimum Xcode and C++ standard requirements in the SDK's compatibility matrix.
3. If the SDK's Expo config plugin normally handles C++ standard configuration during `expo prebuild`, document that manual intervention is needed when the plugin is not used.

---

## Environment Details

**`packages/mobile/app.json`** (relevant excerpt):
```json
{
  "expo": {
    "name": "The History Gauntlet",
    "slug": "history-gauntlet",
    "version": "1.0.0",
    "newArchEnabled": false,
    "ios": {
      "bundleIdentifier": "com.historygauntlet.app"
    },
    "android": {
      "package": "com.historygauntlet.app"
    }
  }
}
```

Note: the `"plugins"` key was removed as part of the Issue 1 workaround.

**`packages/mobile/package.json`** (relevant dependencies):
```json
{
  "@bundlenudge/sdk": "workspace:*",
  "@react-native-async-storage/async-storage": "^2.1.0",
  "expo": "~52.0.0",
  "react": "^18.3.1",
  "react-native": "^0.76.0"
}
```

**`packages/bundlenudge-sdk/package.json`** (relevant fields):
```json
{
  "name": "@bundlenudge/sdk",
  "version": "0.0.1",
  "main": "dist/index.js",
  "module": "dist/index.mjs",
  "react-native": "src/index.ts",
  "optionalDependencies": {
    "@expo/config-plugins": "^7.0.0 || ^8.0.0"
  }
}
```

Note: The `"react-native"` field points to `src/index.ts` (source), while `"main"` points to `dist/index.js` (built output). The `dist/` directory does not exist in the workspace copy, so Metro resolves via the `"react-native"` field to source, while Node.js (used by Expo's config plugin loader) would attempt the `"main"` field and fail.

---

## Summary of Workarounds

| Issue | Workaround | Impact |
|-------|-----------|--------|
| 1. Config plugin CJS/ESM crash | Removed plugin from `app.json` | Native files must be configured manually |
| 2. Static import crash | Dynamic `await import()` in try/catch | Non-standard import pattern, deferred initialization |
| 3. No graceful degradation | Dynamic imports + manual error handling | No public API to check native module availability |
| 4. C++17 build errors | **None (active blocker)** | iOS build fails entirely |

---

## Recommendations for the SDK Team

1. **Test the Expo config plugin in CI** against a fresh Expo project with `expo prebuild`. This would have caught Issue 1 before release.
2. **Make all top-level exports side-effect-free.** No native module access should happen at import time. This is critical for tree-shaking, testing, and graceful degradation.
3. **Export `isNativeModuleAvailable()`** as a public API so consumers can branch on native availability.
4. **Document the "native module not linked" failure mode.** The docs currently show static imports as the primary usage pattern without mentioning that this crashes when native linking fails.
5. **Consider a separate JS-only entry point** (e.g., `@bundlenudge/sdk/js`) that exports only pure-JS utilities (hooks, types, version checking) without any native module imports.
6. **Verify podspec C++ standard compatibility** with React Native 0.76+ and Expo SDK 52+.
