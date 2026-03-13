/** Updater - Handles update checking, downloading, and installation. */

import { Platform } from "react-native";
import type { CircuitBreaker } from "./circuit-breaker";
import { API_REQUEST_TIMEOUT_MS, DEFAULT_RETRY_MAX_ATTEMPTS } from "./constants";
import { normalizeHash } from "./crypto-utils";
import { logError, logInfo, logWarn } from "./debug/logger";
import { FingerprintMismatchError } from "./errors";
import { fetchWithTimeout } from "./fetch-utils";
import { checkExpectedModulesPresent } from "./native-compatibility";
import type { Storage } from "./storage";
import { withTimeout } from "./timeout-utils";
import type {
  BundleNudgeConfig,
  NativeModuleInterface,
  UpdateCheckResult,
  UpdateInfo,
} from "./types";
import { safeCollectDeviceInfo } from "./updater-device-info";
import {
  getStatusText,
  isNetworkError,
  validateBundleUrl,
  validateUpdateCheckResponse,
  validateUpdateMetadata,
} from "./updater-helpers";
import {
  checkDiskSpace,
  cleanupFailedDownload,
  isHermesBytecodeCompatible,
  isReleaseBlacklisted,
  reportUpdateDownloaded,
  resolveFingerprint,
} from "./updater-internals";
import { retry } from "./utils";

export interface UpdaterDependencies {
  storage: Storage;
  config: BundleNudgeConfig;
  nativeModule: NativeModuleInterface;
  circuitBreaker?: CircuitBreaker;
  onNetworkError?: (error: Error) => void;
}

export class Updater {
  private storage: Storage;
  private config: BundleNudgeConfig;
  private nativeModule: NativeModuleInterface;
  private circuitBreaker?: CircuitBreaker;
  private onNetworkError?: (error: Error) => void;

  constructor(deps: UpdaterDependencies) {
    this.storage = deps.storage;
    this.config = deps.config;
    this.nativeModule = deps.nativeModule;
    this.circuitBreaker = deps.circuitBreaker;
    this.onNetworkError = deps.onNetworkError;
  }

  async checkForUpdate(): Promise<UpdateCheckResult> {
    const currentVersion = this.storage.getCurrentVersion();
    const metadata = this.storage.getMetadata();
    logInfo("[UPDATE_CHECK] Starting update check", {
      appId: this.config.appId,
      currentVersion: currentVersion ?? "none",
      currentHash: metadata.currentVersionHash?.slice(0, 12) ?? "none",
      pendingVersion: metadata.pendingVersion ?? "none",
      pendingHash: metadata.pendingVersionHash?.slice(0, 12) ?? "none",
      allowDowngrades: String(this.config.allowDowngrades ?? false),
    });
    if (!this.config.appId || this.config.appId.trim() === "")
      throw new Error("BundleNudge: appId is required for update checks");
    const apiUrl = this.config.apiUrl ?? "https://api.bundlenudge.com";
    const deviceId = this.storage.getDeviceId();
    const accessToken = this.storage.getAccessToken();
    const appVersion = (await this.nativeModule.getConfiguration()).appVersion;
    const nativeFingerprint = resolveFingerprint(this.config, this.storage);
    const rolledBackFrom = metadata.rolledBackFromReleaseId
      ? {
          releaseId: metadata.rolledBackFromReleaseId,
          version: metadata.rolledBackFromVersion,
          hash: metadata.rolledBackFromHash,
        }
      : undefined;

    const requestPayload = {
      appId: this.config.appId,
      deviceId,
      platform: Platform.OS as "ios" | "android",
      appVersion,
      currentBundleVersion: currentVersion,
      currentBundleHash: metadata.currentVersionHash ?? undefined,
      deviceInfo: safeCollectDeviceInfo(),
      ...(nativeFingerprint && { nativeFingerprint }),
      ...(rolledBackFrom && { rolledBackFrom }),
    };

    logInfo("[UPDATE_CHECK] Request payload", {
      deviceId: deviceId.slice(0, 8),
      platform: requestPayload.platform,
      appVersion,
      currentBundleVersion: currentVersion ?? "none",
      currentBundleHash: requestPayload.currentBundleHash?.slice(0, 12) ?? "none",
      hasNativeFingerprint: String(!!nativeFingerprint),
      hasRolledBackFrom: String(!!rolledBackFrom),
      rolledBackFromVersion: rolledBackFrom?.version ?? "none",
    });

    let response: Response;
    try {
      response = await retry(() =>
        fetchWithTimeout(`${apiUrl}/v1/updates/check`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
          },
          body: JSON.stringify(requestPayload),
          timeout: API_REQUEST_TIMEOUT_MS,
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      if (isNetworkError(message)) {
        logWarn("[UPDATE_CHECK] Failed (network), treating as no update", {
          detail: message,
        });
        this.onNetworkError?.(error instanceof Error ? error : new Error(message));
        return { updateAvailable: false };
      }
      logError("[UPDATE_CHECK] Failed", { detail: message });
      throw new Error("BundleNudge: Update check failed. Check logs for details.");
    }

    if (!response.ok) {
      const statusText = getStatusText(response.status);
      logError("Update check HTTP error", {
        status: response.status,
        statusText,
      });
      throw new Error(
        `BundleNudge: Update check failed (${String(response.status)} ${statusText})`,
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive: RN fetch polyfills may not fully conform to Response type
    const contentType = response.headers?.get?.("content-type");
    if (contentType != null && !contentType.includes("application/json")) {
      logError("Unexpected Content-Type from update check", {
        contentType,
      });
      throw new Error(
        "BundleNudge: Update check returned unexpected Content-Type. " +
          "Expected application/json.",
      );
    }

    const rawData: unknown = await response.json();
    const data = validateUpdateCheckResponse(rawData);

    logInfo("[UPDATE_CHECK] API response", {
      updateAvailable: String(data.updateAvailable),
      forceUpdate: String(data.forceUpdate ?? false),
      shouldClearUpdates: String(data.shouldClearUpdates ?? false),
      requiresAppStoreUpdate: String(data.requiresAppStoreUpdate ?? false),
      releaseVersion: data.release?.version ?? "none",
      releaseHash: data.release?.bundleHash?.slice(0, 12) ?? "none",
      releaseId: data.release?.releaseId?.slice(0, 8) ?? "none",
      hasMessage: String(!!data.message),
    });

    if (rolledBackFrom) {
      logInfo("[UPDATE_CHECK] Clearing rolledBackFrom metadata", {
        releaseId: rolledBackFrom.releaseId,
        version: rolledBackFrom.version ?? "none",
      });
      await this.storage.updateMetadata({
        rolledBackFromVersion: null,
        rolledBackFromHash: null,
        rolledBackFromReleaseId: null,
      });
    }

    if (data.shouldClearUpdates) {
      logInfo("[UPDATE_CHECK] DECISION: shouldClearUpdates=true → clearing all OTA bundles");
      await this.nativeModule.clearUpdates();
      return { updateAvailable: false };
    }

    if (data.updateAvailable && data.release) {
      // Skip if this exact bundle is already downloaded and pending apply
      const pendingHash = this.storage.getMetadata().pendingVersionHash;
      if (pendingHash && pendingHash === data.release.bundleHash) {
        logInfo("[UPDATE_CHECK] DECISION: skipped — same hash already pending", {
          pendingHash: pendingHash.slice(0, 12),
          releaseHash: data.release.bundleHash.slice(0, 12),
          releaseVersion: data.release.version,
        });
        return { updateAvailable: false, message: data.message };
      }
      logInfo("[UPDATE_CHECK] Pending hash check passed", {
        pendingHash: pendingHash?.slice(0, 12) ?? "none",
        releaseHash: data.release.bundleHash.slice(0, 12),
      });

      const blacklisted = isReleaseBlacklisted(
        this.circuitBreaker,
        data.release.version,
        data.release.bundleHash,
      );
      if (!data.forceUpdate && blacklisted) {
        logInfo("[UPDATE_CHECK] DECISION: skipped — circuit breaker blacklisted", {
          version: data.release.version,
          hash: data.release.bundleHash.slice(0, 12),
          forceUpdate: "false",
        });
        return { updateAvailable: false, message: data.message };
      }
      logInfo("[UPDATE_CHECK] Circuit breaker check passed", {
        blacklisted: String(blacklisted),
        forceUpdate: String(data.forceUpdate ?? false),
        bypassed: String(data.forceUpdate && blacklisted),
      });

      if (!isHermesBytecodeCompatible(data.release.hermesBytecodeVersion)) {
        logWarn("[UPDATE_CHECK] DECISION: skipped — Hermes bytecode mismatch", {
          releaseVersion: data.release.version,
          releaseBytecodeVersion: String(data.release.hermesBytecodeVersion ?? "none"),
        });
        return { updateAvailable: false, message: data.message };
      }
      logInfo("[UPDATE_CHECK] Hermes bytecode check passed", {
        releaseBytecodeVersion: String(data.release.hermesBytecodeVersion ?? "none"),
      });

      // Store runtime fingerprint + expected modules from API response
      if (data.release.runtimeFingerprint || data.release.expectedNativeModules) {
        await this.storage.updateMetadata({
          storedRuntimeFingerprint: data.release.runtimeFingerprint ?? null,
          expectedNativeModules: data.release.expectedNativeModules ?? null,
        });
      }

      // Pre-apply check: reject if expected native modules are missing on device
      if (data.release.expectedNativeModules) {
        const missing = checkExpectedModulesPresent(data.release.expectedNativeModules);
        if (missing.length > 0) {
          logWarn("[UPDATE_CHECK] DECISION: skipped — missing native modules", {
            missing: missing.join(", "),
            releaseVersion: data.release.version,
            totalExpected: String(data.release.expectedNativeModules.length),
          });
          return { updateAvailable: false, message: data.message };
        }
        logInfo("[UPDATE_CHECK] Native modules check passed", {
          moduleCount: String(data.release.expectedNativeModules.length),
        });
      }

      logInfo("[UPDATE_CHECK] DECISION: update available → proceeding to download", {
        version: data.release.version,
        hash: data.release.bundleHash.slice(0, 12),
        size: String(data.release.bundleSize),
        forceUpdate: String(data.forceUpdate ?? false),
      });
      return {
        updateAvailable: true,
        update: {
          version: data.release.version,
          bundleUrl: data.release.bundleUrl,
          bundleSize: data.release.bundleSize,
          bundleHash: data.release.bundleHash,
          releaseId: data.release.releaseId,
          releaseNotes: data.release.releaseNotes,
          releasedAt: data.release.releasedAt,
        },
        message: data.message,
      };
    }

    if (data.requiresAppStoreUpdate) {
      logInfo("[UPDATE_CHECK] DECISION: requires app store update", {
        reason: data.reason ?? "unknown",
      });
      return {
        updateAvailable: false,
        requiresAppStoreUpdate: true,
        appStoreMessage: data.appStoreMessage,
        appStoreUrl: data.appStoreUrl,
        reason: data.reason,
        message: data.message,
      };
    }

    logInfo("[UPDATE_CHECK] DECISION: no update available from API");
    return { updateAvailable: false, message: data.message };
  }

  async downloadAndInstall(update: UpdateInfo): Promise<void> {
    logInfo("[DOWNLOAD] Starting download", {
      version: update.version,
      size: String(update.bundleSize),
      hash: update.bundleHash.slice(0, 12),
      releaseId: update.releaseId?.slice(0, 8) ?? "none",
    });
    validateUpdateMetadata(update);
    validateBundleUrl(update.bundleUrl);

    // Pre-download fingerprint guard (Defense Layer 2)
    const storedFingerprint = this.storage.getMetadata().storedRuntimeFingerprint;
    if (storedFingerprint && this.config.nativeFingerprint) {
      if (storedFingerprint !== this.config.nativeFingerprint) {
        logWarn("[DOWNLOAD] BLOCKED: runtime fingerprint mismatch", {
          configFingerprint: this.config.nativeFingerprint.slice(0, 12),
          storedFingerprint: storedFingerprint.slice(0, 12),
        });
        throw new FingerprintMismatchError("Download blocked: runtime fingerprint mismatch");
      }
    }
    logInfo("[DOWNLOAD] Fingerprint guard passed", {
      hasStoredFp: String(!!storedFingerprint),
      hasConfigFp: String(!!this.config.nativeFingerprint),
    });

    await checkDiskSpace(this.nativeModule, update.bundleSize);

    logInfo("Starting native download", {
      url: update.bundleUrl.slice(0, 80),
      version: update.version,
      size: String(update.bundleSize),
    });

    // Store update info in native module state before downloading
    await this.nativeModule.setUpdateInfo(
      JSON.stringify({
        url: update.bundleUrl,
        version: update.version,
        expectedHash: update.bundleHash,
        expectedSize: update.bundleSize,
      }),
    );

    let result: { path: string; hash: string };
    try {
      result = await retry(
        () =>
          withTimeout(
            this.nativeModule.downloadBundleToStorage(),
            API_REQUEST_TIMEOUT_MS,
            `Bundle download timed out for ${update.version}`,
          ),
        {
          maxAttempts: DEFAULT_RETRY_MAX_ATTEMPTS,
          onRetry: (attempt, err) => {
            logError("Bundle download retry", {
              version: update.version,
              attempt: String(attempt),
              detail: err.message,
            });
          },
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      logError("Download FAILED", {
        version: update.version,
        detail: message,
      });
      throw new Error(`BundleNudge: Download failed for version ${update.version}: ${message}`);
    }

    const hashMatch = normalizeHash(result.hash) === normalizeHash(update.bundleHash);
    logInfo("Download complete", {
      version: update.version,
      hashMatch: String(hashMatch),
    });

    if (!hashMatch) {
      await cleanupFailedDownload(this.nativeModule, update.version);
      logError("Bundle integrity check failed", { version: update.version });
      throw new Error(
        `BundleNudge: Bundle integrity check failed for version ${update.version}. The download may be corrupted. Please try again.`,
      );
    }

    await this.storage.setPendingUpdate(
      update.version,
      update.bundleHash,
      update.releaseNotes,
      update.releasedAt,
      update.releaseId,
    );
    reportUpdateDownloaded(this.config, this.storage, update);
  }
}
