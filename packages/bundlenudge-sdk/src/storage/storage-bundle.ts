/**
 * Bundle Hash Operations
 *
 * Handles bundle hash storage and retrieval for version tracking and integrity.
 * These operations are used to verify downloaded bundles match expected hashes.
 */

import type { Storage } from "./storage";
import type { StoredMetadata } from "./types";

/**
 * Get the stored hash for a bundle version.
 *
 * @param storage - The storage instance
 * @param version - The version identifier
 * @returns The hash string or null if not found
 */
export function getBundleHash(storage: Storage, version: string): string | null {
  if (!version) return null;
  return storage.getMetadata().bundleHashes[version] ?? null;
}

/**
 * Store the hash for a bundle version.
 *
 * @param storage - The storage instance
 * @param version - The version identifier
 * @param hash - The SHA-256 hash of the bundle
 * @throws Error if version or hash is empty
 */
export async function setBundleHash(
  storage: Storage,
  version: string,
  hash: string,
): Promise<void> {
  if (!version || version.trim() === "") {
    throw new Error("BundleNudge: Bundle version cannot be empty");
  }
  if (!hash || hash.trim() === "") {
    throw new Error("BundleNudge: Bundle hash cannot be empty");
  }
  const hashes = { ...storage.getMetadata().bundleHashes, [version]: hash };
  await storage.updateMetadata({ bundleHashes: hashes });
}

/**
 * Remove a bundle version from storage.
 *
 * Clears the hash and any references if this version was current/previous/pending.
 *
 * @param storage - The storage instance
 * @param version - The version identifier to remove
 */
export async function removeBundleVersion(storage: Storage, version: string): Promise<void> {
  if (!version) return;
  const metadata = storage.getMetadata();
  const updates: Partial<StoredMetadata> = {};
  updates.bundleHashes = Object.fromEntries(
    Object.entries(metadata.bundleHashes).filter(([key]) => key !== version),
  );
  if (metadata.currentVersion === version) updates.currentVersion = null;
  if (metadata.previousVersion === version) updates.previousVersion = null;
  if (metadata.pendingVersion === version) updates.pendingVersion = null;
  await storage.updateMetadata(updates);
}

/**
 * Clear all bundle data.
 *
 * Used when a native app update is detected to ensure
 * compatibility with new native code.
 *
 * @param storage - The storage instance
 */
export async function clearAllBundles(storage: Storage): Promise<void> {
  await storage.updateMetadata({
    currentVersion: null,
    currentVersionHash: null,
    previousVersion: null,
    pendingVersion: null,
    pendingUpdateFlag: false,
    bundleHashes: {},
    storedRuntimeFingerprint: null,
    expectedNativeModules: null,
  });
}
