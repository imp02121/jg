/**
 * Typed D1 query functions for the game_metadata table.
 *
 * Tracks which daily games have been generated, their dates,
 * question counts, and R2 storage keys.
 */

import type { DifficultyTier, GameMetadataItem } from "@history-gauntlet/shared";
import { GAME_CONFIG } from "@history-gauntlet/shared";

/** Shape of a raw game_metadata row returned by D1. */
interface GameMetadataRow {
  readonly date: string;
  readonly total_questions: number;
  readonly questions_by_difficulty: string;
  readonly generated_at: string;
  readonly r2_key: string;
}

/** Maps a raw D1 row to the typed GameMetadataItem interface. */
const mapRow = (row: GameMetadataRow): GameMetadataItem => ({
  date: row.date,
  totalQuestions: row.total_questions,
  questionsByDifficulty: JSON.parse(row.questions_by_difficulty) as Record<DifficultyTier, number>,
  generatedAt: row.generated_at,
  r2Key: row.r2_key,
});

/** Data required to insert a game_metadata row. */
export interface GameMetadataWriteData {
  readonly date: string;
  readonly totalQuestions: number;
  readonly questionsByDifficulty: Record<DifficultyTier, number>;
  readonly generatedAt: string;
  readonly r2Key: string;
}

/** Result of a paginated game metadata list query. */
export interface GameMetadataListResult {
  readonly data: readonly GameMetadataItem[];
  readonly total: number;
}

/** Pagination parameters for listing game metadata. */
export interface ListGameMetadataParams {
  readonly page?: number | undefined;
  readonly limit?: number | undefined;
}

/**
 * Inserts or replaces a game_metadata row.
 *
 * Uses INSERT OR REPLACE so that re-generating a game for the same
 * date overwrites the previous metadata row (idempotent).
 */
export const insertGameMetadata = async (
  db: D1Database,
  data: GameMetadataWriteData,
): Promise<GameMetadataItem> => {
  const sql = `INSERT OR REPLACE INTO game_metadata (date, total_questions, questions_by_difficulty, generated_at, r2_key)
    VALUES (?, ?, ?, ?, ?)`;

  await db
    .prepare(sql)
    .bind(
      data.date,
      data.totalQuestions,
      JSON.stringify(data.questionsByDifficulty),
      data.generatedAt,
      data.r2Key,
    )
    .run();

  const row = await db
    .prepare("SELECT * FROM game_metadata WHERE date = ?")
    .bind(data.date)
    .first<GameMetadataRow>();

  if (!row) {
    throw new Error("Failed to retrieve inserted game metadata");
  }

  return mapRow(row);
};

/**
 * Gets game metadata for a specific date.
 *
 * @returns The metadata item, or null if no game exists for the date.
 */
export const getGameMetadata = async (
  db: D1Database,
  date: string,
): Promise<GameMetadataItem | null> => {
  const row = await db
    .prepare("SELECT * FROM game_metadata WHERE date = ?")
    .bind(date)
    .first<GameMetadataRow>();

  return row ? mapRow(row) : null;
};

/**
 * Lists game metadata with pagination, ordered by date descending.
 */
export const listGameMetadata = async (
  db: D1Database,
  params: ListGameMetadataParams,
): Promise<GameMetadataListResult> => {
  const page = params.page ?? 1;
  const limit = Math.min(params.limit ?? GAME_CONFIG.defaultPageLimit, GAME_CONFIG.maxPageLimit);
  const offset = (page - 1) * limit;

  const countResult = await db
    .prepare("SELECT COUNT(*) as count FROM game_metadata")
    .first<{ count: number }>();
  const total = countResult?.count ?? 0;

  const rows = await db
    .prepare("SELECT * FROM game_metadata ORDER BY date DESC LIMIT ? OFFSET ?")
    .bind(limit, offset)
    .all<GameMetadataRow>();

  const data = (rows.results ?? []).map(mapRow);
  return { data, total };
};
