/** Updater internals - Standalone helper functions extracted from the Updater class. */

import type { CircuitBreaker } from "./circuit-breaker";
import { DISK_SPACE_BUFFER_BYTES } from "./constants";
import { logError, logWarn } from "./debug/logger";
import type { Storage } from "./storage";
import { sendTelemetry } from "./telemetry";
import type { BundleNudgeConfig, NativeModuleInterface, UpdateInfo } from "./types";

/** HermesInternal global exposed by the Hermes engine */
declare const HermesInternal:
  | {
      getRuntimeProperties?: () => Record<string, unknown>;
    }
  | undefined;

/**
 * Read the device's Hermes bytecode version from HermesInternal.
 * Returns null if Hermes is not the active JS engine.
 */
export function getDeviceHermesBytecodeVersion(): number | null {
  try {
    if (typeof HermesInternal === "undefined") return null;
    const props = HermesInternal.getRuntimeProperties?.();
    if (!props) return null;
    const version = props["Bytecode Version"];
    return typeof version === "number" ? version : null;
  } catch {
    return null;
  }
}

/**
 * Check if a release's Hermes bytecode version is compatible with
 * the device's running Hermes engine.
 *
 * Returns true (compatible) when:
 * - The release has no bytecode version (non-Hermes or old build)
 * - The device has no HermesInternal (JSC engine, no version to check)
 * - The versions match
 *
 * Returns false only when both versions are known and they differ.
 */
export function isHermesBytecodeCompatible(releaseBytecodeVersion: number | undefined): boolean {
  if (releaseBytecodeVersion == null) return true;

  const deviceVersion = getDeviceHermesBytecodeVersion();
  if (deviceVersion == null) return true;

  return deviceVersion === releaseBytecodeVersion;
}

export function isReleaseBlacklisted(
  circuitBreaker: CircuitBreaker | undefined,
  version: string,
  bundleHash: string,
): boolean {
  if (!circuitBreaker) return false;
  try {
    const blocked = circuitBreaker.isBlacklisted(version, bundleHash);
    if (blocked) {
      logWarn("Update skipped: release is blacklisted by circuit breaker", {
        version,
        bundleHash: bundleHash.slice(0, 8),
      });
    }
    return blocked;
  } catch {
    return false;
  }
}

export async function checkDiskSpace(
  nativeModule: NativeModuleInterface,
  bundleSize: number,
): Promise<void> {
  try {
    const freeBytes = await nativeModule.getFreeDiskSpace();
    // -1 means platform does not support disk space check
    if (freeBytes < 0) return;
    const required = bundleSize + DISK_SPACE_BUFFER_BYTES;
    if (freeBytes < required) {
      const freeMB = Math.round(freeBytes / (1024 * 1024));
      const requiredMB = Math.round(required / (1024 * 1024));
      throw new Error(
        `INSUFFICIENT_STORAGE: Not enough disk space to download bundle. Available: ${String(freeMB)}MB, Required: ${String(requiredMB)}MB`,
      );
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("INSUFFICIENT_STORAGE")) {
      throw error;
    }
    logWarn("Disk space check failed, proceeding with download");
  }
}

export async function cleanupFailedDownload(
  nativeModule: NativeModuleInterface,
  version: string,
): Promise<void> {
  try {
    await nativeModule.deleteBundleVersion(version);
  } catch {
    logError("Failed to clean up corrupted download", { version });
  }
}

export function reportUpdateDownloaded(
  config: BundleNudgeConfig,
  storage: Storage,
  update: UpdateInfo,
): void {
  const apiUrl = config.apiUrl ?? "https://api.bundlenudge.com";
  sendTelemetry(
    apiUrl,
    {
      deviceId: storage.getDeviceId(),
      appId: config.appId,
      eventType: "update_downloaded",
      releaseId: update.releaseId,
      bundleVersion: update.version,
      timestamp: Date.now(),
    },
    storage.getAccessToken(),
  );
}

/**
 * Resolve the device's native fingerprint.
 * Only returns a value when explicitly set via config.nativeFingerprint.
 *
 * Previously fell back to storedRuntimeFingerprint, but that is a
 * RUNTIME fingerprint (JS deps hash) — sending it as nativeFingerprint
 * poisons the API's fingerprint safety checks (known_mismatch and
 * ceiling comparisons use native fingerprint sets, not runtime).
 */
export function resolveFingerprint(config: BundleNudgeConfig, _storage: Storage): string | null {
  if (config.nativeFingerprint) {
    return config.nativeFingerprint;
  }
  return null;
}
