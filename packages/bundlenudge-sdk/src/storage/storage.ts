/** Storage - SDK metadata persistence using AsyncStorage. */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { logWarn } from "../debug/logger";
import { generateDeviceId } from "../utils";
import * as bundleOps from "./storage-bundle";
import * as crashOps from "./storage-crash";
import * as metadataOps from "./storage-metadata";
import type { AppVersionInfo, StoredMetadata, VerificationState } from "./types";
import { STORAGE_KEY, storedMetadataSchema } from "./types";
import * as verifyOps from "./verification";

export interface StorageConfig {
  /** Suppress security warnings about storing tokens in AsyncStorage. */
  suppressSecurityWarnings?: boolean;
  /** Called when corrupted data is detected and storage is reset to defaults. */
  onStorageReset?: (reason: string) => void;
}

let securityWarningShown = false;

export class Storage {
  private metadata: StoredMetadata | null = null;
  private config: StorageConfig;

  constructor(config: StorageConfig = {}) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      const stored = await this.getItem(STORAGE_KEY);
      if (stored) {
        const result = storedMetadataSchema.safeParse(JSON.parse(stored));
        if (result.success) {
          this.metadata = result.data;
        } else {
          logWarn("Corrupted metadata detected, resetting");
          this.metadata = this.getDefaultMetadata();
          await this.persist();
          this.config.onStorageReset?.("corrupted_metadata");
        }
      } else {
        this.metadata = this.getDefaultMetadata();
        await this.persist();
      }
    } catch {
      logWarn("Storage error, resetting to defaults");
      this.metadata = this.getDefaultMetadata();
      await this.persist();
      this.config.onStorageReset?.("storage_error");
    }
  }

  getMetadata(): StoredMetadata {
    if (!this.metadata) {
      throw new Error(
        "BundleNudge: Storage not initialized. " +
          "Call storage.initialize() before accessing metadata.",
      );
    }
    return this.metadata;
  }

  async updateMetadata(updates: Partial<StoredMetadata>): Promise<void> {
    if (!this.metadata) {
      throw new Error(
        "BundleNudge: Storage not initialized. " +
          "Call storage.initialize() before updating metadata.",
      );
    }
    this.metadata = { ...this.metadata, ...updates };
    await this.persist();
  }

  getDeviceId(): string {
    return this.getMetadata().deviceId;
  }
  getAccessToken(): string | null {
    return this.getMetadata().accessToken;
  }

  async setAccessToken(token: string): Promise<void> {
    if (!token || token.trim() === "") {
      throw new Error("BundleNudge: Access token cannot be empty");
    }

    // Warn about insecure storage (once per session)
    if (!this.config.suppressSecurityWarnings && !securityWarningShown) {
      logWarn(
        "SECURITY: Access token stored in AsyncStorage which is NOT secure on rooted/jailbroken devices. " +
          "For production apps, consider using react-native-keychain for secure token storage. " +
          "Set suppressSecurityWarnings: true in Storage config to suppress this warning.",
      );
      securityWarningShown = true;
    }

    await this.updateMetadata({ accessToken: token });
  }

  getCurrentVersion(): string | null {
    return this.getMetadata().currentVersion;
  }
  getReleaseNotes(): string | null {
    return this.getMetadata().currentReleaseNotes ?? null;
  }
  getReleasedAt(): string | null {
    return this.getMetadata().currentReleasedAt ?? null;
  }

  async setPendingUpdate(
    version: string,
    hash: string,
    releaseNotes?: string,
    releasedAt?: string,
    releaseId?: string,
  ): Promise<void> {
    if (!version || version.trim() === "") {
      throw new Error("BundleNudge: Pending update version cannot be empty");
    }
    await this.updateMetadata({
      pendingVersion: version,
      pendingVersionHash: hash || null,
      pendingUpdateFlag: true,
      pendingReleaseNotes: releaseNotes ?? null,
      pendingReleasedAt: releasedAt ?? null,
      pendingReleaseId: releaseId ?? null,
    });
  }

  async applyPendingUpdate(): Promise<void> {
    const metadata = this.getMetadata();
    if (!metadata.pendingVersion) return;
    await this.updateMetadata({
      previousVersion: metadata.currentVersion ?? "__embedded__",
      currentVersion: metadata.pendingVersion,
      currentVersionHash: metadata.pendingVersionHash ?? null,
      currentReleaseId: metadata.pendingReleaseId ?? null,
      pendingVersion: null,
      pendingVersionHash: null,
      pendingReleaseId: null,
      pendingUpdateFlag: false,
      crashCount: 0,
      lastCrashTime: null,
      currentReleaseNotes: metadata.pendingReleaseNotes ?? null,
      currentReleasedAt: metadata.pendingReleasedAt ?? null,
      pendingReleaseNotes: null,
      pendingReleasedAt: null,
    });
  }

  async recordCrash(): Promise<number> {
    return crashOps.recordCrash(this);
  }
  async clearCrashCount(): Promise<void> {
    return crashOps.clearCrashCount(this);
  }
  async rollback(): Promise<void> {
    return crashOps.rollback(this);
  }
  async clearPreviousVersion(): Promise<void> {
    return crashOps.clearPreviousVersion(this);
  }
  getVerificationState(): VerificationState | null {
    return verifyOps.getVerificationState(this);
  }
  isFullyVerified(): boolean {
    return verifyOps.isFullyVerified(this);
  }
  async setAppReady(): Promise<void> {
    return verifyOps.setAppReady(this);
  }
  async setHealthPassed(): Promise<void> {
    return verifyOps.setHealthPassed(this);
  }
  async resetVerificationState(): Promise<void> {
    return verifyOps.resetVerificationState(this);
  }

  async setVerificationState(state: VerificationState): Promise<void> {
    await this.updateMetadata({ verificationState: state });
  }

  // App Version (delegated)
  getAppVersionInfo(): AppVersionInfo | null {
    return metadataOps.getAppVersionInfo(this);
  }
  async setAppVersionInfo(info: AppVersionInfo): Promise<void> {
    await metadataOps.setAppVersionInfo(this, info);
  }
  async clearAllBundles(): Promise<void> {
    return bundleOps.clearAllBundles(this);
  }

  // Bundle Hash (delegated)
  getBundleHash(version: string): string | null {
    return bundleOps.getBundleHash(this, version);
  }
  async setBundleHash(version: string, hash: string): Promise<void> {
    await bundleOps.setBundleHash(this, version, hash);
  }
  async removeBundleVersion(version: string): Promise<void> {
    await bundleOps.removeBundleVersion(this, version);
  }

  // Private
  private getDefaultMetadata(): StoredMetadata {
    return {
      deviceId: generateDeviceId(),
      accessToken: null,
      currentVersion: null,
      currentVersionHash: null,
      previousVersion: null,
      pendingVersion: null,
      pendingUpdateFlag: false,
      lastCheckTime: null,
      crashCount: 0,
      lastCrashTime: null,
      verificationState: null,
      appVersionInfo: null,
      bundleHashes: {},
      currentReleaseNotes: null,
      currentReleasedAt: null,
      pendingReleaseNotes: null,
      pendingReleasedAt: null,
      pendingVersionHash: null,
      pendingReleaseId: null,
      currentReleaseId: null,
      rolledBackFromVersion: null,
      rolledBackFromHash: null,
      rolledBackFromReleaseId: null,
      storedRuntimeFingerprint: null,
      expectedNativeModules: null,
    };
  }

  private async persist(): Promise<void> {
    if (!this.metadata) return;
    await this.setItem(STORAGE_KEY, JSON.stringify(this.metadata));
  }

  private async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      logWarn(`Storage read error: ${message}`);
      throw new Error("BundleNudge: Failed to read from storage");
    }
  }

  private async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      logWarn(`Storage write error: ${message}`);
      throw new Error("BundleNudge: Failed to write to storage");
    }
  }
}
