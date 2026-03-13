/**
 * Native module helper utilities.
 * Wraps native module calls with proper error handling and fallbacks.
 */

import { Platform } from "react-native";
import { getModuleWithFallback } from "../native-module";
import { sleep } from "../utils";

const SDK_VERSION = "0.0.1";

export interface RestartOptions {
  delay?: number;
  reason?: string;
}

export interface NativeInfo {
  isAvailable: boolean;
  platform: "ios" | "android" | "unknown";
  sdkVersion: string | null;
}

/** Restart app to apply pending update. Safe no-op if native unavailable. */
export async function restartApp(options?: RestartOptions): Promise<boolean> {
  const { module, isNative } = getModuleWithFallback();
  if (!isNative) return false;
  if (options?.delay && options.delay > 0) await sleep(options.delay);
  try {
    await module.restartApp(true);
    return true;
  } catch {
    return false;
  }
}

/** Clear all downloaded updates and revert to embedded bundle. */
export async function clearAllUpdates(): Promise<boolean> {
  const { module, isNative } = getModuleWithFallback();
  if (!isNative) return false;
  try {
    return await module.clearUpdates();
  } catch {
    return false;
  }
}

/** Notify native that app started successfully to prevent auto-rollback. */
export async function notifyAppReady(): Promise<boolean> {
  const { module, isNative } = getModuleWithFallback();
  if (!isNative) return false;
  try {
    return await module.notifyAppReady();
  } catch {
    return false;
  }
}

/** Get current bundle path. Returns null if using embedded bundle. */
export async function getCurrentBundlePath(): Promise<string | null> {
  const { module, isNative } = getModuleWithFallback();
  if (!isNative) return null;
  try {
    return await module.getBundlePath();
  } catch {
    return null;
  }
}

/** Check if a pending update is ready to be applied. */
export async function hasPendingUpdate(): Promise<boolean> {
  const { module, isNative } = getModuleWithFallback();
  if (!isNative) return false;
  try {
    const info = await module.getCurrentBundleInfo();
    return info?.pendingVersion != null;
  } catch {
    return false;
  }
}

/** Get native module availability info. */
export function getNativeInfo(): NativeInfo {
  const { isNative } = getModuleWithFallback();
  const platform =
    Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "unknown";
  return { isAvailable: isNative, platform, sdkVersion: isNative ? SDK_VERSION : null };
}
