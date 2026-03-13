/**
 * Tier preferences persistence using the settings table.
 *
 * Stores selected difficulty tiers as a JSON array in the settings table.
 * Defaults to all tiers when no preference has been saved.
 */

import { DIFFICULTY_TIER_VALUES, type DifficultyTier } from "@history-gauntlet/shared";
import { getDatabase } from "../services/local-db";

/** Settings table key for the selected tiers preference. */
const SELECTED_TIERS_KEY = "selected_tiers";

/**
 * Get the user's selected difficulty tiers.
 * Returns all tiers if no preference has been saved or if the stored
 * value is malformed.
 */
export async function getSelectedTiers(): Promise<DifficultyTier[]> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = ?",
    [SELECTED_TIERS_KEY],
  );

  if (row === null) {
    return [...DIFFICULTY_TIER_VALUES];
  }

  const parsed = parseStoredTiers(row.value);
  if (parsed.length === 0) {
    return [...DIFFICULTY_TIER_VALUES];
  }

  return parsed;
}

/**
 * Save the user's selected difficulty tiers.
 */
export async function setSelectedTiers(tiers: DifficultyTier[]): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [
    SELECTED_TIERS_KEY,
    JSON.stringify(tiers),
  ]);
}

/**
 * Safely parse stored tiers JSON. Returns an empty array if the data
 * is malformed or contains invalid tier values.
 */
function parseStoredTiers(json: string): DifficultyTier[] {
  try {
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const validTiers = new Set<string>(DIFFICULTY_TIER_VALUES);
    const result: DifficultyTier[] = [];

    for (const item of parsed) {
      if (typeof item === "string" && validTiers.has(item)) {
        result.push(item as DifficultyTier);
      }
    }

    return result;
  } catch {
    return [];
  }
}
