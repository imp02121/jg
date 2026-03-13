/**
 * Native Compatibility
 *
 * Runtime native module enumeration and device fingerprinting.
 * Used to detect native module mismatches between JS bundles
 * and the host app's native layer.
 */

import { NativeModules } from "react-native";

/** Internal RN modules to filter out of fingerprinting */
const INTERNAL_MODULES = new Set([
  "UIManager",
  "DeviceInfo",
  "Timing",
  "PlatformConstants",
  "SourceCode",
  "ExceptionsManager",
  "Networking",
  "WebSocketModule",
  "AppState",
  "DevSettings",
  "NativeAnimatedModule",
  "StatusBarManager",
  "Appearance",
  "I18nManager",
  "Clipboard",
  "Vibration",
  "DeviceEventManager",
  "KeyboardObserver",
  "AsyncLocalStorage",
  "ImageLoader",
  "HeadlessJsTaskSupport",
  "BlobModule",
  "LinkingManager",
  "PermissionsAndroid",
  "ShareModule",
  "AlertManager",
]);

/**
 * Enumerate available native modules at runtime,
 * filtering out React Native internal modules.
 *
 * @returns Sorted array of third-party module names,
 *   or null if TurboModules are active and NativeModules is empty.
 */
export function getAvailableNativeModules(): string[] | null {
  // RN sets __turboModuleProxy on `global`, not `globalThis` (Hermes runtime)

  const g =
    typeof global !== "undefined"
      ? (global as Record<string, unknown>)
      : (globalThis as Record<string, unknown>);
  const turboProxy = g.__turboModuleProxy ?? g.RN$Bridgeless;

  // When TurboModules are active, NativeModules only contains a partial
  // list (legacy interop entries). TurboModule-registered modules won't
  // appear in NativeModules, so enumeration is unreliable — return null
  // to signal that module presence checks should be skipped.
  if (turboProxy) {
    return null;
  }

  const moduleNames = Object.keys(NativeModules as Record<string, unknown>);
  return moduleNames.filter((name) => !INTERNAL_MODULES.has(name)).sort();
}

/**
 * Generate a SHA-256 fingerprint of the device's native modules.
 *
 * @returns Hex-encoded SHA-256 hash string, or null if modules
 *   cannot be enumerated (e.g. TurboModules active).
 */
export async function generateDeviceFingerprint(): Promise<string | null> {
  const modules = getAvailableNativeModules();
  if (modules === null || modules.length === 0) {
    return null;
  }

  const payload = modules.join("\n");
  const encoded = new TextEncoder().encode(payload);

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (typeof crypto === "undefined" || !crypto.subtle) {
    return null;
  }

  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Check which required modules are missing from the device.
 *
 * @param requiredModules - Module names that the JS bundle expects
 * @returns Array of missing module names (empty if all present)
 */
export function checkModuleCompatibility(requiredModules: string[]): string[] {
  const available = getAvailableNativeModules();
  if (available === null) {
    return requiredModules;
  }

  const availableSet = new Set(available);
  return requiredModules.filter((name) => !availableSet.has(name));
}

/**
 * Check if all expected native modules (from the build) are present on the device.
 * Only checks module names, not versions — version mismatch is caught
 * by the runtime fingerprint hash comparison on the API side.
 *
 * @param modules - Expected modules from the API response
 * @returns Array of missing module names (empty if all present)
 */
export function checkExpectedModulesPresent(
  modules: { name: string; version: string }[],
): string[] {
  const available = getAvailableNativeModules();
  if (available === null) {
    // Cannot enumerate (TurboModules) — allow the update
    return [];
  }
  const availableSet = new Set(available);
  return modules.map((m) => m.name).filter((name) => !availableSet.has(name));
}
