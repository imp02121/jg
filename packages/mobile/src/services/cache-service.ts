/**
 * Daily game caching service.
 *
 * Stores and retrieves DailyGame JSON in the settings table,
 * using keys of the form "cached_game_YYYY-MM-DD".
 */

import type { DailyGame } from "@history-gauntlet/shared";
import { getDatabase } from "./local-db";

/** Key prefix for cached game entries in the settings table. */
const CACHE_KEY_PREFIX = "cached_game_";

/**
 * Build the settings key for a given date.
 */
function cacheKey(date: string): string {
  return `${CACHE_KEY_PREFIX}${date}`;
}

/**
 * Cache a daily game locally for offline use.
 * Overwrites any existing cache for the same date.
 */
export async function cacheDailyGame(game: DailyGame): Promise<void> {
  const db = await getDatabase();
  const key = cacheKey(game.date);
  const value = JSON.stringify(game);

  await db.runAsync("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [key, value]);
}

/**
 * Retrieve a cached daily game for the given date.
 * Returns null if no cache entry exists or if the stored JSON is malformed.
 */
export async function getCachedGame(date: string): Promise<DailyGame | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = ?",
    [cacheKey(date)],
  );

  if (row === null) {
    return null;
  }

  return parseDailyGame(row.value);
}

/**
 * Remove cached game entries older than the specified number of days.
 *
 * Compares the date portion of each cache key against the cutoff date.
 */
export async function clearOldCache(keepDays: number): Promise<void> {
  const db = await getDatabase();

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - keepDays);
  const cutoffStr = formatDate(cutoff);

  // Fetch all cache keys, then delete those with dates before the cutoff.
  const rows = await db.getAllAsync<{ key: string }>("SELECT key FROM settings WHERE key LIKE ?", [
    `${CACHE_KEY_PREFIX}%`,
  ]);

  for (const row of rows) {
    const date = row.key.slice(CACHE_KEY_PREFIX.length);
    if (date < cutoffStr) {
      await db.runAsync("DELETE FROM settings WHERE key = ?", [row.key]);
    }
  }
}

/**
 * Safely parse a JSON string as a DailyGame.
 * Returns null if the JSON is malformed or not an object.
 */
function parseDailyGame(json: string): DailyGame | null {
  try {
    const parsed: unknown = JSON.parse(json);
    if (typeof parsed === "object" && parsed !== null && "date" in parsed) {
      return parsed as DailyGame;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Format a Date as YYYY-MM-DD string.
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
