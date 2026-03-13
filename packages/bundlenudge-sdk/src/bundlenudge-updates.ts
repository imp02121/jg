/**
 * BundleNudge Update Operations
 *
 * Update checking and installation logic for the BundleNudge SDK.
 */

import type { BundleNudgeCallbacks } from "./bundlenudge-helpers";
import { logInfo, logWarn } from "./debug/logger";
import { FingerprintMismatchError } from "./errors";
import { markBundleLoading } from "./native-crash-guard";
import type { Storage } from "./storage";
import type { BundleNudgeConfig, UpdateCheckResult, UpdateInfo, UpdateStatus } from "./types";
import type { Updater } from "./updater";
import { type NetworkErrorType, classifyNetworkError } from "./updater-helpers";

/** Error type classification for SDK error callbacks. */
export type SdkErrorType = "timeout" | "network" | "server" | "unknown";

/** Extended error with type classification. */
export class ClassifiedError extends Error {
  readonly errorType: SdkErrorType;

  constructor(original: Error, errorType: SdkErrorType) {
    super(original.message);
    this.name = "ClassifiedError";
    this.errorType = errorType;
    this.stack = original.stack;
  }
}

/** Classify an error for callback consumers. */
export function classifyError(error: Error): ClassifiedError {
  const msg = error.message;
  const netType: NetworkErrorType = classifyNetworkError(msg);
  if (netType === "timeout") return new ClassifiedError(error, "timeout");
  if (netType !== null) return new ClassifiedError(error, "network");
  if (/\b(4\d{2}|5\d{2})\b/.test(msg)) return new ClassifiedError(error, "server");
  return new ClassifiedError(error, "unknown");
}

/**
 * Context for update operations.
 */
export interface UpdateContext {
  config: BundleNudgeConfig;
  callbacks: BundleNudgeCallbacks;
  updater: Updater;
  storage: Storage;
  setStatus: (status: UpdateStatus) => void;
  setLastCheckResult: (result: UpdateCheckResult) => void;
  restartApp: () => Promise<void>;
}

/** Trigger source for update checks. */
export type CheckTrigger = "init" | "background" | "foreground" | "manual";

/**
 * Check for available updates.
 */
export async function checkForUpdate(
  ctx: UpdateContext,
  trigger: CheckTrigger = "manual",
): Promise<UpdateInfo | null> {
  // Only throttle foreground checks (rapid app-switch scenarios).
  // Background, manual, and init checks always proceed.
  if (trigger === "foreground") {
    const lastCheck = ctx.storage.getMetadata().lastCheckTime;
    const minIntervalMs = (ctx.config.minimumCheckInterval ?? 60) * 1000;
    if (lastCheck && Date.now() - lastCheck < minIntervalMs) {
      logInfo("[SYNC] Update check THROTTLED", {
        trigger,
        secondsSinceLastCheck: String(Math.round((Date.now() - lastCheck) / 1000)),
        minimumInterval: String(ctx.config.minimumCheckInterval ?? 60),
      });
      return null;
    }
  }
  logInfo("[SYNC] Update check proceeding", {
    trigger,
    currentVersion: ctx.storage.getCurrentVersion() ?? "none",
  });

  ctx.setStatus("checking");
  try {
    const result = await ctx.updater.checkForUpdate();
    ctx.setLastCheckResult(result);
    await ctx.storage.updateMetadata({ lastCheckTime: Date.now() });
    if (result.updateAvailable && result.update) {
      ctx.setStatus("update-available");
      ctx.callbacks.onUpdateAvailable?.(result.update);
      return result.update;
    }
    ctx.setStatus("up-to-date");
    return null;
  } catch (error) {
    ctx.setStatus("error");
    const classified = classifyError(error instanceof Error ? error : new Error(String(error)));
    ctx.callbacks.onError?.(classified);
    throw classified;
  }
}

/**
 * Download and install an update.
 */
export async function downloadAndInstall(ctx: UpdateContext, update: UpdateInfo): Promise<void> {
  logInfo("[SYNC] Starting download+install", {
    version: update.version,
    installMode: ctx.config.installMode ?? "nextLaunch",
  });
  ctx.setStatus("downloading");
  try {
    await ctx.updater.downloadAndInstall(update);
    ctx.setStatus("installing");
    // Mark crash guard BEFORE applying the bundle
    await markBundleLoading(update.version, update.bundleHash);
    logInfo("[SYNC] Download complete, bundle pending", {
      version: update.version,
      installMode: ctx.config.installMode ?? "nextLaunch",
    });
    if (ctx.config.installMode === "immediate") {
      logInfo("[SYNC] Restarting app (immediate mode)");
      await ctx.restartApp();
    } else {
      logInfo("[SYNC] Update will apply on next launch (nextLaunch mode)");
      ctx.setStatus("idle");
    }
  } catch (error) {
    if (error instanceof FingerprintMismatchError) {
      logWarn("Fingerprint mismatch — download skipped, returning to idle");
      ctx.setStatus("idle");
      ctx.callbacks.onError?.(error);
      return;
    }
    ctx.setStatus("error");
    const classified = classifyError(error instanceof Error ? error : new Error(String(error)));
    ctx.callbacks.onError?.(classified);
    throw classified;
  }
}
