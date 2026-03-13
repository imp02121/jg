/**
 * Crash and Rollback Operations
 *
 * Handles crash counting and rollback functionality for safe updates.
 * Used to detect problematic updates and automatically roll back.
 */

import type { Storage } from "./storage";
import type { StoredMetadata } from "./types";

/** Maximum crash count to prevent unbounded growth. */
const MAX_CRASH_COUNT = 100;

/**
 * Record a crash occurrence for rollback detection.
 *
 * @param storage - The storage instance
 * @returns The new crash count after incrementing
 */
export async function recordCrash(storage: Storage): Promise<number> {
  const currentCount = storage.getMetadata().crashCount;
  const newCount = Math.min(currentCount + 1, MAX_CRASH_COUNT);
  await storage.updateMetadata({
    crashCount: newCount,
    lastCrashTime: Date.now(),
  });
  return newCount;
}

/**
 * Clear the crash count after successful verification.
 *
 * @param storage - The storage instance
 */
export async function clearCrashCount(storage: Storage): Promise<void> {
  await storage.updateMetadata({ crashCount: 0, lastCrashTime: null });
}

/**
 * Perform a rollback to the previous version.
 *
 * This swaps current and previous versions, clearing crash data.
 * If no previous version exists, this is a no-op.
 *
 * @param storage - The storage instance
 */
export async function rollback(storage: Storage): Promise<void> {
  const metadata = storage.getMetadata();
  if (!metadata.previousVersion) return;

  // "__embedded__" means "fall back to the app's built-in bundle"
  const rollbackVersion =
    metadata.previousVersion === "__embedded__" ? null : metadata.previousVersion;

  const updates: Partial<StoredMetadata> = {
    rolledBackFromVersion: metadata.currentVersion ?? null,
    rolledBackFromHash: metadata.currentVersionHash ?? null,
    rolledBackFromReleaseId: metadata.currentReleaseId ?? null,
    currentVersion: rollbackVersion,
    currentVersionHash: null,
    currentReleaseId: null,
    previousVersion: null,
    pendingVersion: null,
    pendingVersionHash: null,
    pendingUpdateFlag: false,
    crashCount: 0,
    lastCrashTime: null,
    currentReleaseNotes: null,
    currentReleasedAt: null,
  };
  await storage.updateMetadata(updates);
}

/**
 * Clear the previous version after successful verification.
 *
 * This disables rollback capability for the current version.
 *
 * @param storage - The storage instance
 */
export async function clearPreviousVersion(storage: Storage): Promise<void> {
  await storage.updateMetadata({ previousVersion: null });
}
