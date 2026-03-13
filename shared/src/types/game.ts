/**
 * Game types for The History Gauntlet.
 *
 * Defines the daily game structure (R2 JSON), game questions,
 * and local result/answer types stored on the device.
 */

import type { CorrectIndex, DifficultyTier, OptionsTuple } from "./question";

/**
 * A question as it appears in the daily game JSON (R2 storage).
 *
 * This is a subset of the full Question — administrative fields
 * like usedCount and timestamps are stripped for the public game.
 */
export interface GameQuestion {
  /** Unique identifier for the question. */
  readonly id: string;
  /** Difficulty tier this question belongs to. */
  readonly difficulty: DifficultyTier;
  /** Key mapping to an SVG icon component for the question category. */
  readonly iconKey: string;
  /** The question text. */
  readonly question: string;
  /** Exactly four answer options. */
  readonly options: OptionsTuple;
  /** Index of the correct answer within options (0-3). */
  readonly correctIndex: CorrectIndex;
  /** Educational fact revealed after answering. */
  readonly fact: string;
}

/**
 * The daily game JSON stored in R2.
 *
 * Questions are grouped by tier in a Record so the mobile app can
 * trivially filter by the user's selected tiers without parsing a flat array.
 */
export interface DailyGame {
  /** The date this game is for, in YYYY-MM-DD format. */
  readonly date: string;
  /** Schema version for forward compatibility. */
  readonly version: number;
  /** Display title for the daily game. */
  readonly title: string;
  /** Questions grouped by difficulty tier. */
  readonly questionsByTier: Record<DifficultyTier, GameQuestion[]>;
  /** Metadata about the generated game. */
  readonly metadata: DailyGameMetadata;
}

/** Metadata embedded in the DailyGame JSON. */
export interface DailyGameMetadata {
  /** Total number of questions across all tiers. */
  readonly totalQuestions: number;
  /** Count of questions per difficulty tier. */
  readonly questionsByDifficulty: Record<DifficultyTier, number>;
  /** ISO 8601 timestamp when this game was generated. */
  readonly generatedAt: string;
}

/**
 * A completed game result stored locally on the device (SQLite).
 *
 * Contains enough detail for the history and stats screens.
 */
export interface LocalGameResult {
  /** Unique identifier for this result. */
  readonly id: string;
  /** The date of the daily game, in YYYY-MM-DD format. */
  readonly date: string;
  /** Which tiers the user selected for this session. */
  readonly selectedTiers: DifficultyTier[];
  /** Number of correct answers. */
  readonly score: number;
  /** Total number of questions attempted. */
  readonly totalQuestions: number;
  /** Longest consecutive streak of correct answers. */
  readonly bestStreak: number;
  /** Per-question answer details. */
  readonly answers: LocalAnswer[];
  /** ISO 8601 timestamp when the game was completed. */
  readonly completedAt: string;
  /** Total time spent on the game in seconds. */
  readonly durationSeconds: number;
}

/**
 * A single answer recorded during gameplay.
 *
 * Stored as part of LocalGameResult.answers.
 */
export interface LocalAnswer {
  /** The question this answer is for. */
  readonly questionId: string;
  /** Difficulty tier of the answered question. */
  readonly difficulty: DifficultyTier;
  /** Index of the option the user selected (0-3). */
  readonly selectedIndex: number;
  /** Whether the selected answer was correct. */
  readonly correct: boolean;
  /** Time spent on this question in milliseconds. */
  readonly timeSpentMs: number;
}
