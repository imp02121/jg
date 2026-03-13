/**
 * SDK Update Types
 *
 * Types related to update checking, downloading, and installation.
 */

/**
 * Current status of the update process.
 *
 * State machine:
 * - idle -> checking -> (up-to-date | update-available | error)
 * - update-available -> downloading -> installing -> idle
 * - any state -> error (on failure)
 */
export type UpdateStatus =
  | "idle"
  | "checking"
  | "downloading"
  | "installing"
  | "up-to-date"
  | "update-available"
  | "error";

/**
 * Information about an available update.
 */
export interface UpdateInfo {
  /** Version identifier (e.g., "1.2.3" or "20240115-abc123") */
  version: string;
  /** URL to download the bundle from */
  bundleUrl: string;
  /** Size of the bundle in bytes */
  bundleSize: number;
  /** SHA-256 hash of the bundle for verification */
  bundleHash: string;
  /** Unique identifier for this release */
  releaseId: string;
  /** Optional release notes to display to users */
  releaseNotes?: string;
  /** ISO timestamp when the release was published */
  releasedAt?: string;
}

/**
 * Progress information during bundle download.
 */
export interface DownloadProgress {
  /** Bytes downloaded so far */
  bytesDownloaded: number;
  /** Total bytes to download */
  totalBytes: number;
  /** Percentage complete (0-100) */
  percentage: number;
}

/**
 * Result of checking for updates.
 */
export interface UpdateCheckResult {
  /** Whether an OTA update is available */
  updateAvailable: boolean;
  /** Whether a native App Store/Play Store update is required */
  requiresAppStoreUpdate?: boolean;
  /** Message to display for App Store updates */
  appStoreMessage?: string;
  /** Direct link to the App Store / Play Store listing */
  appStoreUrl?: string;
  /** Reason the server declined OTA (e.g. "known_mismatch", "unverified_native_version") */
  reason?: string;
  /** Update details if available */
  update?: UpdateInfo;
  /** In-app message from the server (if any) */
  message?: { id: string; title: string; body: string };
}
