/**
 * RollbackManager
 *
 * Manages rollback logic for both device-level and server-triggered rollbacks.
 * Provides safe rollback to previous bundle version when issues are detected.
 */

import type { CircuitBreaker } from "./circuit-breaker";
import { logInfo, logWarn } from "./debug/logger";
import type { Storage } from "./storage";
import { sendTelemetry } from "./telemetry";
import type { BundleNudgeConfig, NativeModuleInterface } from "./types";

/**
 * Reason for triggering a rollback.
 * - crash_detected: App crashed multiple times after update
 * - route_failure: Critical navigation/route failed to load
 * - server_triggered: Server requested rollback (e.g., bad release)
 * - manual: User or developer explicitly triggered rollback
 */
export type RollbackReason =
  | "crash_detected"
  | "native_crash_detected"
  | "route_failure"
  | "server_triggered"
  | "manual";

/**
 * Configuration for the RollbackManager.
 */
export interface RollbackManagerConfig {
  /** Storage instance for metadata persistence */
  storage: Storage;
  /** SDK configuration */
  config: BundleNudgeConfig;
  /** Native module for platform operations */
  nativeModule: NativeModuleInterface;
  /** Circuit breaker for blacklisting rolled-back releases */
  circuitBreaker?: CircuitBreaker;

  /** Optional callback when rollback is reported to server */
  onRollbackReported?: (reason: RollbackReason, version: string) => void;
}

export class RollbackManager {
  private storage: Storage;
  private config: BundleNudgeConfig;
  private nativeModule: NativeModuleInterface;
  private circuitBreaker?: CircuitBreaker;
  private onRollbackReported?: (reason: RollbackReason, version: string) => void;
  private isRollingBack = false;

  constructor(deps: RollbackManagerConfig) {
    this.storage = deps.storage;
    this.config = deps.config;
    this.nativeModule = deps.nativeModule;
    this.circuitBreaker = deps.circuitBreaker;
    this.onRollbackReported = deps.onRollbackReported;
  }

  /** Check if a rollback is available (previous version exists). */
  canRollback(): boolean {
    const metadata = this.storage.getMetadata();
    return metadata.previousVersion !== null;
  }

  /** Get the version that would be restored on rollback, or null. */
  getRollbackVersion(): string | null {
    return this.storage.getMetadata().previousVersion;
  }

  /** Get the current version that would be rolled back from, or null. */
  getCurrentVersion(): string | null {
    return this.storage.getMetadata().currentVersion;
  }

  /** Trigger a rollback to the previous bundle version. */
  async rollback(reason: RollbackReason): Promise<void> {
    // Prevent concurrent rollback calls
    if (this.isRollingBack) {
      logWarn("Rollback already in progress, skipping duplicate call");
      return;
    }

    this.isRollingBack = true;
    try {
      await this.executeRollback(reason);
    } finally {
      this.isRollingBack = false;
    }
  }

  private async executeRollback(reason: RollbackReason): Promise<void> {
    const metadata = this.storage.getMetadata();
    const currentVersion = metadata.currentVersion;
    const previousVersion = metadata.previousVersion;

    if (!previousVersion) {
      throw new Error(
        "BundleNudge: Cannot rollback - no previous version available. " +
          "This may occur on first install or after a native app update.",
      );
    }

    // Validate reason
    const validReasons: RollbackReason[] = [
      "crash_detected",
      "native_crash_detected",
      "route_failure",
      "server_triggered",
      "manual",
    ];
    if (!validReasons.includes(reason)) {
      throw new Error(`BundleNudge: Invalid rollback reason "${reason}"`);
    }

    logInfo("Rollback triggered", {
      reason,
      from: currentVersion ?? "unknown",
      to: previousVersion,
    });

    // Blacklist the bad version+hash so it is not re-applied
    await this.blacklistCurrentVersion(currentVersion, metadata.currentVersionHash);

    // Update storage state — if this fails, do NOT restart the app
    try {
      await this.storage.rollback();
    } catch (error) {
      logWarn("Rollback storage update failed, aborting restart", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    // Report rollback to server
    if (this.onRollbackReported && currentVersion) {
      this.onRollbackReported(reason, currentVersion);
    }

    this.reportRollback(reason, currentVersion, previousVersion);

    // For embedded rollback: clear native metadata + OTA files so
    // +bundleURL returns nil and the app loads the built-in bundle.
    // This makes the fix OTA-safe (no native code changes required).
    if (previousVersion === "__embedded__") {
      await this.nativeModule.clearUpdates();
    } else {
      // Sync native metadata.json so bundleURL() loads the rollback version
      try {
        await this.nativeModule.rollbackToVersion(previousVersion);
      } catch (error) {
        logWarn("Native rollbackToVersion failed", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Restart app with previous bundle
    await this.nativeModule.restartApp(false);
  }

  /** Mark the current update as verified and clean up the previous version. */
  async markUpdateVerified(): Promise<void> {
    const metadata = this.storage.getMetadata();
    const previousVersion = metadata.previousVersion;
    const currentVersion = metadata.currentVersion;

    await this.storage.clearPreviousVersion();

    // Prune old blacklist entries now that this version is verified
    this.pruneBlacklistForVersion(currentVersion);

    // Delete old bundle files from filesystem
    // Skip for "__embedded__" — there are no OTA files to delete
    if (previousVersion && previousVersion !== "__embedded__") {
      try {
        await this.nativeModule.deleteBundleVersion(previousVersion);
      } catch {
        // Non-fatal: cleanup failure shouldn't break verification
        // Old bundles will be cleaned up on next native app update
      }
    }
  }

  private pruneBlacklistForVersion(currentVersion: string | null): void {
    if (!this.circuitBreaker || !currentVersion) return;
    try {
      this.circuitBreaker.pruneOlderThan(currentVersion);
      void this.circuitBreaker.save().catch(() => {
        logWarn("Circuit breaker: async save failed after prune");
      });
    } catch {
      logWarn("Circuit breaker: failed to prune old entries");
    }
  }

  private async blacklistCurrentVersion(
    version: string | null,
    hash: string | null,
  ): Promise<void> {
    if (!this.circuitBreaker || !version || !hash) return;
    try {
      this.circuitBreaker.blacklist(version, hash);
      // Await save so blacklist persists before app restarts
      await this.circuitBreaker.save();
    } catch {
      logWarn("Circuit breaker: failed to blacklist release");
    }
  }

  private reportRollback(
    reason: RollbackReason,
    fromVersion: string | null,
    toVersion: string,
  ): void {
    const apiUrl = this.config.apiUrl ?? "https://api.bundlenudge.com";
    sendTelemetry(
      apiUrl,
      {
        deviceId: this.storage.getDeviceId(),
        appId: this.config.appId,
        eventType: "rollback_triggered",
        bundleVersion: fromVersion,
        metadata: {
          reason,
          rolledBackTo: toVersion,
        },
        timestamp: Date.now(),
      },
      this.storage.getAccessToken(),
    );
  }
}
