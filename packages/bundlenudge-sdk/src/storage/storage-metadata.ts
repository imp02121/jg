/**
 * App Version Metadata Operations
 *
 * Handles app version info storage for detecting App Store/Play Store updates.
 * When the native app version changes, all bundles should be cleared.
 */

import type { Storage } from "./storage";
import type { AppVersionInfo } from "./types";

/**
 * Get the stored native app version info.
 *
 * Used to detect App Store/Play Store updates.
 *
 * @param storage - The storage instance
 * @returns The app version info or null if not set
 */
export function getAppVersionInfo(storage: Storage): AppVersionInfo | null {
  return storage.getMetadata().appVersionInfo;
}

/**
 * Store the current native app version info.
 *
 * @param storage - The storage instance
 * @param info - The app version info to store
 * @throws Error if appVersion or buildNumber is empty
 */
export async function setAppVersionInfo(storage: Storage, info: AppVersionInfo): Promise<void> {
  if (!info.appVersion || info.appVersion.trim() === "") {
    throw new Error("BundleNudge: appVersion is required");
  }
  if (!info.buildNumber || info.buildNumber.trim() === "") {
    throw new Error("BundleNudge: buildNumber is required");
  }
  await storage.updateMetadata({ appVersionInfo: info });
}

/**
 * Check if the native app version has changed.
 *
 * @param storage - The storage instance
 * @param currentInfo - The current app version info
 * @returns true if the app version or build number changed
 */
export function hasAppVersionChanged(storage: Storage, currentInfo: AppVersionInfo): boolean {
  const storedInfo = getAppVersionInfo(storage);
  if (!storedInfo) return true;
  return (
    storedInfo.appVersion !== currentInfo.appVersion ||
    storedInfo.buildNumber !== currentInfo.buildNumber
  );
}
