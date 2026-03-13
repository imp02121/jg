/**
 * CircuitBreaker - Prevents re-applying rolled-back updates.
 *
 * When an OTA update causes crashes and gets rolled back, the circuit breaker
 * remembers the version+hash combination. On subsequent update checks, if the
 * same version+hash is offered again, it is rejected — preventing an infinite
 * crash-rollback loop.
 *
 * Key design decisions:
 * - Keyed by version+hash (not just version), so a re-published fix with
 *   a different hash for the same version is allowed through.
 * - Persisted in AsyncStorage so it survives app restarts.
 * - Errors in the circuit breaker never break the update flow.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { logInfo, logWarn } from "./debug/logger";

const BLACKLIST_STORAGE_KEY = "@bundlenudge/blacklist";

/** Maximum number of blacklist entries to prevent unbounded growth. */
const MAX_BLACKLIST_ENTRIES = 50;

/** Blacklist entries expire after 7 days to allow retrying releases. */
const BLACKLIST_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface BlacklistedRelease {
  version: string;
  bundleHash: string;
  rolledBackAt: number;
}

/**
 * Build a composite key from version and hash.
 * This allows the same version with a different hash (re-published fix)
 * to pass through the blacklist.
 */
function buildKey(version: string, bundleHash: string): string {
  return `${version}::${bundleHash}`;
}

export class CircuitBreaker {
  private entries = new Map<string, BlacklistedRelease>();
  private loaded = false;

  /**
   * Check if a release is blacklisted.
   *
   * @param version - The release version string
   * @param bundleHash - The bundle's SHA-256 hash
   * @returns true if this version+hash was previously rolled back
   */
  isBlacklisted(version: string, bundleHash: string): boolean {
    if (!version || !bundleHash) return false;
    const key = buildKey(version, bundleHash);
    const entry = this.entries.get(key);
    if (!entry) return false;

    // Expire entries older than TTL so releases can be retried
    if (Date.now() - entry.rolledBackAt > BLACKLIST_TTL_MS) {
      this.entries.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Add a release to the blacklist after a rollback.
   *
   * @param version - The version that caused the rollback
   * @param bundleHash - The hash of the bad bundle
   */
  blacklist(version: string, bundleHash: string): void {
    if (!version || !bundleHash) return;

    const key = buildKey(version, bundleHash);
    this.entries.set(key, {
      version,
      bundleHash,
      rolledBackAt: Date.now(),
    });

    this.enforceMaxEntries();

    logInfo("Circuit breaker: blacklisted release", {
      version,
      bundleHash: bundleHash.slice(0, 8),
    });
  }

  /**
   * Remove blacklist entries for versions older than the given version.
   *
   * When a newer version is successfully applied, old blacklist entries
   * become irrelevant and can be pruned to prevent unbounded growth.
   *
   * @param currentVersion - The successfully applied version
   */
  pruneOlderThan(currentVersion: string): void {
    if (!currentVersion) return;

    const toDelete: string[] = [];
    for (const [key, entry] of this.entries) {
      if (entry.version !== currentVersion) {
        toDelete.push(key);
      }
    }

    for (const key of toDelete) {
      this.entries.delete(key);
    }

    if (toDelete.length > 0) {
      logInfo("Circuit breaker: pruned old entries", {
        pruned: String(toDelete.length),
        remaining: String(this.entries.size),
      });
    }
  }

  /**
   * Load the blacklist from persistent storage.
   * Errors are caught and logged — a failed load means an empty blacklist,
   * which is safe (worst case: one more crash-rollback cycle).
   */
  async load(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(BLACKLIST_STORAGE_KEY);
      if (!raw) {
        this.loaded = true;
        return;
      }

      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        this.loaded = true;
        return;
      }

      this.entries.clear();
      for (const item of parsed) {
        if (isValidEntry(item)) {
          const key = buildKey(item.version, item.bundleHash);
          this.entries.set(key, item);
        }
      }
      this.loaded = true;
    } catch {
      logWarn("Circuit breaker: failed to load blacklist, starting empty");
      this.entries.clear();
      this.loaded = true;
    }
  }

  /**
   * Save the blacklist to persistent storage.
   * Errors are caught and logged — a failed save means the blacklist
   * won't survive an app restart, but the update flow is not broken.
   */
  async save(): Promise<void> {
    try {
      const data = Array.from(this.entries.values());
      await AsyncStorage.setItem(BLACKLIST_STORAGE_KEY, JSON.stringify(data));
    } catch {
      logWarn("Circuit breaker: failed to save blacklist");
    }
  }

  /**
   * Clear all blacklist entries and remove from storage.
   * Used when the user explicitly clears all updates.
   */
  async clear(): Promise<void> {
    this.entries.clear();
    try {
      await AsyncStorage.removeItem(BLACKLIST_STORAGE_KEY);
      logInfo("Circuit breaker: cleared all entries");
    } catch {
      logWarn("Circuit breaker: failed to clear storage");
    }
  }

  /** Return the number of blacklisted entries (for testing/debugging). */
  get size(): number {
    return this.entries.size;
  }

  /** Check if the blacklist has been loaded from storage. */
  isLoaded(): boolean {
    return this.loaded;
  }

  /** Enforce the maximum entry limit by removing oldest entries first. */
  private enforceMaxEntries(): void {
    if (this.entries.size <= MAX_BLACKLIST_ENTRIES) return;

    const sorted = Array.from(this.entries.entries()).sort(
      (a, b) => a[1].rolledBackAt - b[1].rolledBackAt,
    );

    const excess = sorted.length - MAX_BLACKLIST_ENTRIES;
    for (let i = 0; i < excess; i++) {
      this.entries.delete(sorted[i][0]);
    }
  }
}

/** Type guard for validating blacklist entries loaded from storage. */
function isValidEntry(item: unknown): item is BlacklistedRelease {
  if (typeof item !== "object" || item === null) return false;
  const obj = item as Record<string, unknown>;
  return (
    typeof obj.version === "string" &&
    obj.version.length > 0 &&
    typeof obj.bundleHash === "string" &&
    obj.bundleHash.length > 0 &&
    typeof obj.rolledBackAt === "number" &&
    obj.rolledBackAt > 0
  );
}
