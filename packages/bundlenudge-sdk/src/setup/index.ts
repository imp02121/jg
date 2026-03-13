/**
 * Setup Utilities - Simplified initialization for BundleNudge SDK.
 */

import { BundleNudge } from "../bundlenudge";
import { getModuleWithFallback } from "../native-module";
import type { BundleNudgeConfig, DownloadProgress, UpdateInfo } from "../types";

export interface SetupOptions extends BundleNudgeConfig {
  /** Check for updates on start (default: true) */
  checkOnStart?: boolean;
  /** Install update on next restart (default: true) */
  installOnNextRestart?: boolean;
  /** Called when an update is available */
  onUpdateAvailable?: (update: UpdateInfo) => void;
  /** Called during download with progress percentage */
  onDownloadProgress?: (progress: number) => void;
  /** Called when an update is installed and ready */
  onUpdateInstalled?: () => void;
  /** Called when an error occurs */
  onError?: (error: Error) => void;
}

/** Current BundleNudge status for debugging */
export interface BundleNudgeDebugStatus {
  currentVersion: string | null;
  pendingVersion: string | null;
  crashCount: number;
  isNativeAvailable: boolean;
}

let isInitialized = false;
let cachedStatus: BundleNudgeDebugStatus | null = null;

/**
 * Initialize BundleNudge with sensible defaults. Call once at app startup.
 */
export async function setupBundleNudge(options: SetupOptions): Promise<void> {
  if (isInitialized) return;

  const {
    checkOnStart = true,
    installOnNextRestart = true,
    onUpdateAvailable,
    onDownloadProgress,
    onUpdateInstalled,
    onError,
    ...config
  } = options;

  try {
    const finalConfig: BundleNudgeConfig = {
      ...config,
      installMode: installOnNextRestart ? "nextLaunch" : "immediate",
      checkOnLaunch: false,
    };

    const instance = await BundleNudge.initialize(finalConfig, {
      onUpdateAvailable,
      onDownloadProgress: onDownloadProgress
        ? (progress: DownloadProgress) => {
            onDownloadProgress(progress.percentage);
          }
        : undefined,
      onError,
    });

    isInitialized = true;

    if (checkOnStart) {
      const update = await instance.checkForUpdate();
      if (update && installOnNextRestart) {
        await instance.downloadAndInstall(update);
        onUpdateInstalled?.();
      }
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    onError?.(err);
  }
}

/** Get current BundleNudge status for debugging. */
export function getBundleNudgeStatus(): BundleNudgeDebugStatus {
  if (cachedStatus && isInitialized) return cachedStatus;

  const { isNative } = getModuleWithFallback();
  const defaultStatus: BundleNudgeDebugStatus = {
    currentVersion: null,
    pendingVersion: null,
    crashCount: 0,
    isNativeAvailable: isNative,
  };

  try {
    const instance = BundleNudge.getInstance();
    cachedStatus = { ...defaultStatus, currentVersion: instance.getCurrentVersion() };
    return cachedStatus;
  } catch {
    return defaultStatus;
  }
}

/** Manually record a crash (for custom error boundaries). */
export async function recordCrash(): Promise<void> {
  try {
    const instance = BundleNudge.getInstance();
    await instance.notifyAppReady();
  } catch {
    // SDK not initialized - ignore
  }
}

// Deprecated alias for CodePush migration
export { setupBundleNudge as setupCodePush };
