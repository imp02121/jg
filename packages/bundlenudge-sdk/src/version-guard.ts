/**
 * VersionGuard
 *
 * Detects native app updates (App Store/Play Store) and clears
 * OTA bundles to ensure users start fresh with new native code.
 */

import type { AppVersionInfo, Storage } from "./storage";

// Re-export AppVersionInfo for convenience
export type { AppVersionInfo } from "./storage";

/**
 * Configuration for the VersionGuard.
 */
export interface VersionGuardConfig {
  /** Function to get current version from native module */
  getCurrentVersion: () => AppVersionInfo;
  /** Optional callback when native update is detected */
  onNativeUpdateDetected?: () => void;
}

/**
 * Detects when the native app has been updated via App Store/Play Store.
 * When detected, clears all OTA bundles to ensure compatibility with
 * new native code.
 */
export class VersionGuard {
  private storage: Storage;
  private config: VersionGuardConfig;

  constructor(storage: Storage, config: VersionGuardConfig) {
    this.storage = storage;
    this.config = config;
  }

  /**
   * Check if native app was updated via App Store.
   * If so, clears all OTA bundles and resets crash count.
   *
   * @returns true if native update was detected
   */
  async checkForNativeUpdate(): Promise<boolean> {
    const storedVersion = this.storage.getAppVersionInfo();
    const currentVersion = this.config.getCurrentVersion();

    const isNativeUpdate = this.isVersionChange(storedVersion, currentVersion);

    if (isNativeUpdate) {
      await this.handleNativeUpdate(currentVersion);
      return true;
    }

    return false;
  }

  /**
   * Check if version has changed (first launch or different version/build).
   */
  private isVersionChange(stored: AppVersionInfo | null, current: AppVersionInfo): boolean {
    if (!stored) {
      return true; // First launch
    }

    if (stored.appVersion !== current.appVersion) {
      return true; // App version changed
    }

    if (stored.buildNumber !== current.buildNumber) {
      return true; // Build number changed (same version)
    }

    return false;
  }

  /**
   * Handle native update by clearing bundles and updating stored version.
   */
  private async handleNativeUpdate(currentVersion: AppVersionInfo): Promise<void> {
    await this.storage.clearAllBundles();
    await this.storage.clearCrashCount();
    await this.storage.setAppVersionInfo(currentVersion);

    this.config.onNativeUpdateDetected?.();
  }
}
