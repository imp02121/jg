/**
 * useBundleNudge React Hook
 *
 * React hook for managing OTA updates with BundleNudge.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { BundleNudge } from "../bundlenudge";
import type { UpdateInfo } from "../types";

export type BundleNudgeStatus =
  | "idle"
  | "checking"
  | "downloading"
  | "installing"
  | "installed"
  | "error";

export interface UseBundleNudgeResult {
  status: BundleNudgeStatus;
  updateAvailable: boolean;
  updateInfo: UpdateInfo | null;
  downloadProgress: number;
  error: Error | null;
  currentVersion: string | null;
  checkForUpdate: () => Promise<void>;
  downloadAndApply: () => Promise<void>;
  sync: () => Promise<void>;
}

/**
 * React hook for managing OTA updates with BundleNudge.
 *
 * Provides reactive state for update status, download progress, and error handling.
 * The SDK must be initialized via `BundleNudge.initialize()` before this hook is used.
 *
 * @returns Object with update state and control methods
 *
 * @example
 * ```tsx
 * function UpdateBanner() {
 *   const { updateAvailable, updateInfo, downloadAndApply } = useBundleNudge();
 *   if (!updateAvailable) return null;
 *   return <Button title={`Update to ${updateInfo?.version}`} onPress={downloadAndApply} />;
 * }
 * ```
 */
export function useBundleNudge(): UseBundleNudgeResult {
  const [status, setStatus] = useState<BundleNudgeStatus>("idle");
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);

  const instanceRef = useRef<BundleNudge | null>(null);

  useEffect(() => {
    try {
      instanceRef.current = BundleNudge.getInstance();
      setCurrentVersion(instanceRef.current.getCurrentVersion());
    } catch {
      // SDK not initialized yet - will be set when methods are called
    }
  }, []);

  const checkForUpdate = useCallback(async () => {
    setError(null);
    setStatus("checking");

    try {
      const instance = BundleNudge.getInstance();
      instanceRef.current = instance;
      setCurrentVersion(instance.getCurrentVersion());

      const update = await instance.checkForUpdate();

      if (update) {
        setUpdateAvailable(true);
        setUpdateInfo(update);
      } else {
        setUpdateAvailable(false);
        setUpdateInfo(null);
      }
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, []);

  const downloadAndApply = useCallback(async () => {
    if (!updateInfo) {
      setError(new Error("No update available to download"));
      return;
    }

    setError(null);
    setStatus("downloading");
    setDownloadProgress(0);

    try {
      const instance = BundleNudge.getInstance();

      // Progress is tracked via callbacks set during SDK initialization
      // Here we just track start (0%) and completion (100%)
      await instance.downloadAndInstall(updateInfo);

      setDownloadProgress(100);
      setStatus("installed");
      setUpdateAvailable(false);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [updateInfo]);

  const sync = useCallback(async () => {
    setError(null);
    setStatus("checking");

    try {
      const instance = BundleNudge.getInstance();
      instanceRef.current = instance;
      setCurrentVersion(instance.getCurrentVersion());

      await instance.sync();

      setStatus("idle");
      setUpdateAvailable(false);
      setUpdateInfo(null);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, []);

  return {
    status,
    updateAvailable,
    updateInfo,
    downloadProgress,
    error,
    currentVersion,
    checkForUpdate,
    downloadAndApply,
    sync,
  };
}
