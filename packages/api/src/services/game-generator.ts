/**
 * Game generation service for The History Gauntlet.
 *
 * Selects questions from D1 based on tier distribution, cooldown rules,
 * and usage counts, builds a DailyGame, uploads to R2, and updates D1.
 */

import type {
  DailyGame,
  DailyGameMetadata,
  DifficultyTier,
  GameQuestion,
} from "@history-gauntlet/shared";
import { DIFFICULTY_TIERS, GAME_CONFIG } from "@history-gauntlet/shared";
import type { GameMetadataWriteData } from "../db/queries/game-metadata";
import { insertGameMetadata } from "../db/queries/game-metadata";
import { HttpError } from "../middleware/error-handler";
import { buildR2Key, uploadGame } from "./r2-client";

/** Shape of a raw question row returned by the selection query. */
interface SelectionRow {
  readonly id: string;
  readonly difficulty: string;
  readonly icon_key: string;
  readonly question: string;
  readonly options: string;
  readonly correct_index: number;
  readonly fact: string;
  readonly category: string;
  readonly used_count: number;
}

/** Options for game generation. */
export interface GenerateGameOptions {
  readonly date: string;
  readonly tierDistribution?: Partial<Record<DifficultyTier, number>> | undefined;
}

/** Converts a raw selection row into a GameQuestion for the R2 JSON. */
const toGameQuestion = (row: SelectionRow): GameQuestion => ({
  id: row.id,
  difficulty: row.difficulty as DifficultyTier,
  iconKey: row.icon_key,
  question: row.question,
  options: JSON.parse(row.options) as [string, string, string, string],
  correctIndex: row.correct_index as 0 | 1 | 2 | 3,
  fact: row.fact,
});

/**
 * Queries D1 for eligible questions in a tier, respecting the cooldown window.
 * Sorts by usedCount ASC then random within equal counts.
 */
const selectQuestionsForTier = async (
  db: D1Database,
  tier: DifficultyTier,
  count: number,
  cooldownDate: string,
): Promise<SelectionRow[]> => {
  const sql = `SELECT id, difficulty, icon_key, question, options, correct_index, fact, category, used_count
    FROM questions
    WHERE difficulty = ?
      AND (last_used_at IS NULL OR last_used_at < ?)
    ORDER BY used_count ASC, RANDOM()
    LIMIT ?`;

  const result = await db.prepare(sql).bind(tier, cooldownDate, count).all<SelectionRow>();

  return result.results ?? [];
};

/** Computes the cooldown cutoff date (ISO string) from today. */
const getCooldownDate = (): string => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - GAME_CONFIG.questionCooldownDays);
  return d.toISOString();
};

/**
 * Resolves the number of questions required per tier, applying any overrides.
 */
const resolveTierCounts = (
  overrides?: Partial<Record<DifficultyTier, number>>,
): Record<DifficultyTier, number> => {
  const counts = {} as Record<DifficultyTier, number>;
  for (const tier of DIFFICULTY_TIERS) {
    const override = overrides?.[tier.key];
    counts[tier.key] = override ?? tier.questionsPerDay;
  }
  return counts;
};

/**
 * Updates usedCount and lastUsedAt on all selected questions.
 * Uses D1 batch for atomic updates.
 */
const updateQuestionUsage = async (
  db: D1Database,
  questionIds: readonly string[],
  now: string,
): Promise<void> => {
  if (questionIds.length === 0) return;

  const sql = "UPDATE questions SET used_count = used_count + 1, last_used_at = ? WHERE id = ?";
  const stmts = questionIds.map((id) => db.prepare(sql).bind(now, id));
  await db.batch(stmts);
};

/**
 * Generates a daily game for the given date.
 *
 * 1. Resolves tier distribution (defaults or overrides)
 * 2. Selects questions per tier from D1 (cooldown + usage sort)
 * 3. Builds a DailyGame matching the shared type
 * 4. Uploads JSON to R2
 * 5. Inserts game_metadata row in D1
 * 6. Updates usedCount/lastUsedAt on selected questions
 * 7. Returns the generated game
 */
export const generateGame = async (
  db: D1Database,
  bucket: R2Bucket,
  options: GenerateGameOptions,
): Promise<DailyGame> => {
  const { date } = options;
  const now = new Date().toISOString();
  const cooldownDate = getCooldownDate();
  const tierCounts = resolveTierCounts(options.tierDistribution);

  /* Select questions per tier. */
  const questionsByTier = {} as Record<DifficultyTier, GameQuestion[]>;
  const allQuestionIds: string[] = [];
  const questionsByDifficulty = {} as Record<DifficultyTier, number>;

  for (const tier of DIFFICULTY_TIERS) {
    const required = tierCounts[tier.key];
    if (required === undefined || required <= 0) {
      questionsByTier[tier.key] = [];
      questionsByDifficulty[tier.key] = 0;
      continue;
    }

    const rows = await selectQuestionsForTier(db, tier.key, required, cooldownDate);

    if (rows.length < required) {
      throw new HttpError(
        400,
        `Insufficient questions for tier "${tier.key}": need ${String(required)}, available ${String(rows.length)}`,
      );
    }

    const gameQuestions = rows.map(toGameQuestion);
    questionsByTier[tier.key] = gameQuestions;
    questionsByDifficulty[tier.key] = gameQuestions.length;

    for (const row of rows) {
      allQuestionIds.push(row.id);
    }
  }

  const totalQuestions = allQuestionIds.length;

  const metadata: DailyGameMetadata = {
    totalQuestions,
    questionsByDifficulty,
    generatedAt: now,
  };

  const game: DailyGame = {
    date,
    version: GAME_CONFIG.currentGameVersion,
    title: `Daily History Gauntlet - ${date}`,
    questionsByTier,
    metadata,
  };

  /* Upload to R2 (idempotent — overwrites if exists). */
  await uploadGame(bucket, date, game);

  /* Insert game metadata into D1. */
  const metadataWrite: GameMetadataWriteData = {
    date,
    totalQuestions,
    questionsByDifficulty,
    generatedAt: now,
    r2Key: buildR2Key(date),
  };
  await insertGameMetadata(db, metadataWrite);

  /* Update usage tracking on selected questions. */
  await updateQuestionUsage(db, allQuestionIds, now);

  return game;
};
