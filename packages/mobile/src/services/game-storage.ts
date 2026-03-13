/**
 * CRUD operations for LocalGameResult records in SQLite.
 *
 * Handles serialization of arrays (selectedTiers, answers) to/from
 * JSON strings for storage in the game_results table.
 */

import type { DifficultyTier, LocalAnswer, LocalGameResult } from "@history-gauntlet/shared";
import { getDatabase } from "./local-db";

/** Raw row shape as stored in SQLite (JSON strings for array columns). */
interface GameResultRow {
  readonly id: string;
  readonly date: string;
  readonly selected_tiers: string;
  readonly score: number;
  readonly total_questions: number;
  readonly best_streak: number;
  readonly answers: string;
  readonly completed_at: string;
  readonly duration_seconds: number;
}

/**
 * Save a game result to the database.
 * Uses INSERT OR REPLACE so re-saving the same id overwrites.
 */
export async function saveResult(result: LocalGameResult): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO game_results
       (id, date, selected_tiers, score, total_questions, best_streak, answers, completed_at, duration_seconds)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      result.id,
      result.date,
      JSON.stringify(result.selectedTiers),
      result.score,
      result.totalQuestions,
      result.bestStreak,
      JSON.stringify(result.answers),
      result.completedAt,
      result.durationSeconds,
    ],
  );
}

/**
 * Get a game result by its unique id.
 * Returns null if no result exists with that id.
 */
export async function getResultById(id: string): Promise<LocalGameResult | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<GameResultRow>("SELECT * FROM game_results WHERE id = ?", [
    id,
  ]);
  if (row === null) {
    return null;
  }
  return mapRowToResult(row);
}

/**
 * Get a game result for a specific date.
 * Returns null if no result exists for that date.
 */
export async function getResultByDate(date: string): Promise<LocalGameResult | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<GameResultRow>("SELECT * FROM game_results WHERE date = ?", [
    date,
  ]);
  if (row === null) {
    return null;
  }
  return mapRowToResult(row);
}

/**
 * Get all game results, ordered by completed_at descending.
 */
export async function getAllResults(): Promise<LocalGameResult[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<GameResultRow>(
    "SELECT * FROM game_results ORDER BY completed_at DESC",
  );
  return rows.map(mapRowToResult);
}

/**
 * Get the most recent game results, up to the given limit.
 * Results are ordered by completed_at descending (most recent first).
 */
export async function getRecentResults(limit: number): Promise<LocalGameResult[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<GameResultRow>(
    "SELECT * FROM game_results ORDER BY completed_at DESC LIMIT ?",
    [limit],
  );
  return rows.map(mapRowToResult);
}

/**
 * Map a raw SQLite row to a typed LocalGameResult.
 * Handles JSON parsing of array columns with safe fallbacks.
 */
function mapRowToResult(row: GameResultRow): LocalGameResult {
  return {
    id: row.id,
    date: row.date,
    selectedTiers: parseJsonArray<DifficultyTier>(row.selected_tiers),
    score: row.score,
    totalQuestions: row.total_questions,
    bestStreak: row.best_streak,
    answers: parseJsonArray<LocalAnswer>(row.answers),
    completedAt: row.completed_at,
    durationSeconds: row.duration_seconds,
  };
}

/**
 * Safely parse a JSON string as an array. Returns an empty array
 * if the string is malformed or does not contain an array.
 */
function parseJsonArray<T>(json: string): T[] {
  try {
    const parsed: unknown = JSON.parse(json);
    if (Array.isArray(parsed)) {
      return parsed as T[];
    }
    return [];
  } catch {
    return [];
  }
}
