/**
 * Native Module Bridge
 *
 * Provides access to the native BundleNudge module with graceful fallback.
 */

import { NativeModules, Platform, TurboModuleRegistry } from "react-native";
import { logError, logWarn } from "./debug/logger";
import type { Spec } from "./specs/NativeBundleNudge";
import type { NativeModuleInterface } from "./types";

/**
 * Access the native BundleNudge module with proper typing.
 * Returns null if the native module is not linked.
 */
export function getNativeModule(): NativeModuleInterface | null {
  // Try TurboModule first (New Architecture)
  try {
    const turboModule = TurboModuleRegistry.get<Spec>("BundleNudge");
    if (turboModule) {
      return turboModule as unknown as NativeModuleInterface;
    }
  } catch {
    // fall through to bridge
  }

  // Fall back to bridge (Old Architecture)
  const nativeModule = NativeModules.BundleNudge as NativeModuleInterface | undefined;

  if (!nativeModule) {
    if (__DEV__) {
      logWarn(
        "Native module not found. " +
          "Make sure you have linked the native module correctly. " +
          'Run "pod install" for iOS or rebuild for Android.',
      );
    }
    return null;
  }

  return nativeModule;
}

/**
 * Create a fallback module for when native module is unavailable.
 * This allows the SDK to work in JS-only environments (e.g., Expo Go).
 */
export function createFallbackModule(): NativeModuleInterface {
  return {
    getConfiguration: () =>
      Promise.resolve({
        appVersion: "1.0.0",
        buildNumber: "1",
        bundleId: Platform.OS === "ios" ? "com.unknown.app" : "com.unknown.app",
      }),
    getCurrentBundleInfo: () => Promise.resolve(null),
    getBundlePath: () => Promise.resolve(null),
    notifyAppReady: () => Promise.resolve(true),
    restartApp: () => {
      if (__DEV__) {
        logWarn("restartApp called but native module not available");
      }
      return Promise.resolve(false);
    },
    clearUpdates: () => {
      if (__DEV__) {
        logWarn("clearUpdates called but native module not available");
      }
      return Promise.resolve(false);
    },
    saveBundleToStorage: () => {
      if (__DEV__) {
        logWarn("saveBundleToStorage called but native module not available");
      }
      return Promise.resolve("");
    },
    setUpdateInfo: () => {
      if (__DEV__) {
        logWarn("setUpdateInfo called but native module not available");
      }
      return Promise.resolve(true);
    },
    downloadBundleToStorage: () => {
      // JS fallback cannot save bundles to the filesystem
      return Promise.reject(
        new Error(
          "BundleNudge: JS fallback cannot save bundles to the filesystem. " +
            "Link the native module for bundle download support.",
        ),
      );
    },
    hashFile: () => {
      if (__DEV__) {
        logWarn("hashFile called but native module not available");
      }
      return Promise.resolve(""); // Empty string - JS validation will skip
    },
    deleteBundleVersion: (_version: string) => {
      if (__DEV__) {
        logWarn("deleteBundleVersion called but native module not available");
      }
      return Promise.resolve(false);
    },
    rollbackToVersion: (_version: string) => {
      if (__DEV__) {
        logWarn("rollbackToVersion called but native module not available");
      }
      return Promise.resolve(false);
    },
    getFreeDiskSpace: () => {
      if (__DEV__) {
        logWarn("getFreeDiskSpace called but native module not available");
      }
      return Promise.resolve(-1);
    },
    addListener: () => {
      // no-op in fallback
    },
    removeListeners: () => {
      // no-op in fallback
    },
  };
}

const LINK_HELP =
  "BundleNudge native module not linked. " + "Run 'pod install' for iOS or rebuild for Android.";

function nativeErrorMessage(method: string, original: string): string {
  if (/not found|null|undefined|cannot read/i.test(original)) {
    return `BundleNudge: ${method} failed - ${LINK_HELP}`;
  }
  return `BundleNudge: ${method} failed - ${original}`;
}

/**
 * Wrap a native module so that bridge errors produce actionable messages
 * and never crash the app. Non-critical methods degrade gracefully.
 */
export function wrapNativeModule(raw: NativeModuleInterface): NativeModuleInterface {
  function wrapSafe<T>(method: string, fn: () => Promise<T>, fallback: T): Promise<T> {
    return fn().catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      logError(nativeErrorMessage(method, msg));
      return fallback;
    });
  }

  return {
    getConfiguration: () => raw.getConfiguration(),
    getCurrentBundleInfo: () =>
      wrapSafe("getCurrentBundleInfo", () => raw.getCurrentBundleInfo(), null),
    getBundlePath: () => wrapSafe("getBundlePath", () => raw.getBundlePath(), null),
    notifyAppReady: () => wrapSafe("notifyAppReady", () => raw.notifyAppReady(), false),
    restartApp: (pending) => wrapSafe("restartApp", () => raw.restartApp(pending), false),
    clearUpdates: () => wrapSafe("clearUpdates", () => raw.clearUpdates(), false),
    saveBundleToStorage: (v, d) => raw.saveBundleToStorage(v, d),
    setUpdateInfo: (p) => raw.setUpdateInfo(p),
    downloadBundleToStorage: () => raw.downloadBundleToStorage(),
    hashFile: (p) => raw.hashFile(p),
    deleteBundleVersion: (v) =>
      wrapSafe("deleteBundleVersion", () => raw.deleteBundleVersion(v), false),
    rollbackToVersion: (v) => wrapSafe("rollbackToVersion", () => raw.rollbackToVersion(v), false),
    getFreeDiskSpace: () => wrapSafe("getFreeDiskSpace", () => raw.getFreeDiskSpace(), -1),
    addListener: (e) => {
      raw.addListener(e);
    },
    removeListeners: (c) => {
      raw.removeListeners(c);
    },
  };
}

/**
 * Get native module or fallback.
 * Returns a tuple of [module, isNative] to indicate whether native is available.
 */
export function getModuleWithFallback(): {
  module: NativeModuleInterface;
  isNative: boolean;
} {
  const nativeModule = getNativeModule();

  if (nativeModule) {
    return { module: wrapNativeModule(nativeModule), isNative: true };
  }

  return { module: createFallbackModule(), isNative: false };
}
