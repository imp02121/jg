/**
 * SDK Native Module Types
 *
 * Types for the native module interface.
 */

export interface NativeModuleInterface {
  getConfiguration(): Promise<{
    appVersion: string;
    buildNumber: string;
    bundleId: string;
  }>;

  getCurrentBundleInfo(): Promise<{
    currentVersion: string | null;
    currentVersionHash: string | null;
    pendingVersion: string | null;
    previousVersion: string | null;
  } | null>;

  getBundlePath(): Promise<string | null>;

  notifyAppReady(): Promise<boolean>;

  restartApp(onlyIfUpdateIsPending: boolean): Promise<boolean>;

  clearUpdates(): Promise<boolean>;

  /**
   * Save a bundle to native filesystem storage.
   * @param version - The version identifier for the bundle
   * @param bundleData - Base64 encoded bundle data
   * @returns The path where the bundle was saved
   */
  saveBundleToStorage(version: string, bundleData: string): Promise<string>;

  /**
   * Store update info in native module state for the next download.
   * Must be called before downloadBundleToStorage().
   *
   * @param payload - JSON string with { url, version, expectedHash, expectedSize }
   * @returns True if stored successfully
   */
  setUpdateInfo(payload: string): Promise<boolean>;

  /**
   * Download the bundle specified by the previous setUpdateInfo() call.
   * Streams to disk with hash verification. Emits BundleNudgeDownloadProgress events.
   * Rejects with E_NO_UPDATE_INFO if setUpdateInfo was not called first.
   *
   * @returns Object with path where bundle was saved and actual hash
   */
  downloadBundleToStorage(): Promise<{ path: string; hash: string }>;

  /**
   * Calculate SHA-256 hash of a file.
   * @param path - Absolute path to the file
   * @returns Hex-encoded SHA-256 hash (64 characters)
   */
  hashFile(path: string): Promise<string>;

  /**
   * Delete a specific bundle version from storage.
   * @param version - Version identifier of the bundle to delete
   * @returns True if deleted successfully, false if not found
   */
  deleteBundleVersion(version: string): Promise<boolean>;

  /**
   * Update native metadata.json to point to a specific version for rollback.
   * Sets currentVersion to the target version so the native bundleURL()
   * returns the correct bundle path on the next app restart.
   *
   * @param version - The version to roll back to
   * @returns True if metadata was updated successfully
   */
  rollbackToVersion(version: string): Promise<boolean>;

  /**
   * Get available disk space in bytes.
   * Returns -1 if the platform does not support this check.
   */
  getFreeDiskSpace(): Promise<number>;

  /** Subscribe to native events (for download progress). */
  addListener(eventName: string): void;

  /** Unsubscribe from native events. */
  removeListeners(count: number): void;
}
