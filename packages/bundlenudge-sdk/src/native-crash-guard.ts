/**
 * NativeCrashGuard - Detects crashes that happen before JavaScript can execute.
 *
 * The existing CrashDetector relies on JS running, but if a bad OTA bundle
 * crashes at import time (e.g., missing native module), JS never runs and
 * the crash goes undetected. This guard uses a persistent storage flag:
 *
 * 1. Before applying an OTA bundle, write a "loading" flag to storage.
 * 2. When notifyAppReady() is called, clear the flag.
 * 3. On next SDK init, if the flag is set, the previous launch crashed
 *    before JS was ready — trigger rollback.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { logError, logWarn } from "./debug/logger";

const CRASH_GUARD_KEY = "@bundlenudge/crash_guard";

/**
 * Shape of the crash guard state persisted in AsyncStorage.
 */
export interface CrashGuardState {
  loadingOtaBundle: boolean;
  bundleVersion: string;
  bundleHash: string;
  timestamp: number;
}

/**
 * Result returned when checking for a crash on start.
 */
export interface CrashCheckResult {
  crashed: boolean;
  version?: string;
  hash?: string;
}

/**
 * Reads the crash guard state from AsyncStorage.
 * Returns null if no state exists or if parsing fails.
 */
async function readState(): Promise<CrashGuardState | null> {
  try {
    const raw = await AsyncStorage.getItem(CRASH_GUARD_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isValidState(parsed)) return null;
    return parsed;
  } catch {
    logWarn("Failed to read crash guard state");
    return null;
  }
}

/**
 * Writes the crash guard state to AsyncStorage.
 */
async function writeState(state: CrashGuardState): Promise<void> {
  await AsyncStorage.setItem(CRASH_GUARD_KEY, JSON.stringify(state));
}

/**
 * Removes the crash guard state from AsyncStorage.
 */
async function removeState(): Promise<void> {
  await AsyncStorage.removeItem(CRASH_GUARD_KEY);
}

/**
 * Type guard validating the shape of a parsed crash guard state.
 */
function isValidState(value: unknown): value is CrashGuardState {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.loadingOtaBundle === "boolean" &&
    typeof obj.bundleVersion === "string" &&
    typeof obj.bundleHash === "string" &&
    typeof obj.timestamp === "number"
  );
}

/**
 * Check if the previous launch crashed during OTA bundle loading.
 *
 * If a crash guard flag is found, it means the app crashed before
 * notifyAppReady() could clear it. The flag is always cleared after
 * reading to prevent infinite rollback loops.
 *
 * @returns Whether a crash was detected, plus version/hash info
 */
export async function checkForCrashOnStart(): Promise<CrashCheckResult> {
  try {
    const state = await readState();
    if (!state?.loadingOtaBundle) {
      return { crashed: false };
    }
    // Always clear the flag to prevent infinite rollback loops
    await clearBundleLoading();
    return {
      crashed: true,
      version: state.bundleVersion,
      hash: state.bundleHash,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    logError("Crash guard check failed", { detail: msg });
    // Never break the app — treat as no crash
    return { crashed: false };
  }
}

/**
 * Mark that we are about to load an OTA bundle.
 *
 * Call this BEFORE applying the OTA bundle. If the app crashes
 * before notifyAppReady() clears this flag, the next launch will
 * detect the crash and trigger a rollback.
 *
 * @param version - The bundle version being loaded
 * @param hash - The bundle hash being loaded
 */
export async function markBundleLoading(version: string, hash: string): Promise<void> {
  try {
    await writeState({
      loadingOtaBundle: true,
      bundleVersion: version,
      bundleHash: hash,
      timestamp: Date.now(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    logError("Failed to set crash guard flag", { detail: msg });
    // Non-fatal: the app should still try to load the bundle
  }
}

/**
 * Clear the bundle loading flag.
 *
 * Called by notifyAppReady() to indicate the app launched successfully
 * with the new OTA bundle.
 */
export async function clearBundleLoading(): Promise<void> {
  try {
    await removeState();
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    logError("Failed to clear crash guard flag", { detail: msg });
    // Non-fatal: worst case is a false-positive crash detection next launch
  }
}
