/**
 * Zod validation schemas for Game-related types.
 *
 * Validates the DailyGame JSON structure (from R2) and GameQuestion shape.
 * Kept in sync with the TypeScript types in types/game.ts.
 */

import { z } from "zod";
import { correctIndexSchema, difficultyTierSchema, optionsTupleSchema } from "./question";

/** Zod schema for GameQuestion (public game shape, no admin metadata). */
export const gameQuestionSchema = z.object({
  id: z.string().min(1),
  difficulty: difficultyTierSchema,
  iconKey: z.string().min(1),
  question: z.string().min(1),
  options: optionsTupleSchema,
  correctIndex: correctIndexSchema,
  fact: z.string().min(1),
});

/** Zod schema for the questionsByTier record. */
const questionsByTierSchema = z.object({
  Novice: z.array(gameQuestionSchema),
  Apprentice: z.array(gameQuestionSchema),
  Journeyman: z.array(gameQuestionSchema),
  Scholar: z.array(gameQuestionSchema),
  Master: z.array(gameQuestionSchema),
  Grandmaster: z.array(gameQuestionSchema),
});

/** Zod schema for the questionsByDifficulty count record. */
const questionsByDifficultySchema = z.object({
  Novice: z.number().int().min(0),
  Apprentice: z.number().int().min(0),
  Journeyman: z.number().int().min(0),
  Scholar: z.number().int().min(0),
  Master: z.number().int().min(0),
  Grandmaster: z.number().int().min(0),
});

/** Zod schema for DailyGameMetadata. */
const dailyGameMetadataSchema = z.object({
  totalQuestions: z.number().int().min(0),
  questionsByDifficulty: questionsByDifficultySchema,
  generatedAt: z.string().min(1),
});

/** Zod schema for the full DailyGame JSON (R2 storage format). */
export const dailyGameSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
  version: z.number().int().min(1),
  title: z.string().min(1),
  questionsByTier: questionsByTierSchema,
  metadata: dailyGameMetadataSchema,
});

/** Zod schema for LocalAnswer (device-stored answer detail). */
export const localAnswerSchema = z.object({
  questionId: z.string().min(1),
  difficulty: difficultyTierSchema,
  selectedIndex: z.number().int().min(0).max(3),
  correct: z.boolean(),
  timeSpentMs: z.number().int().min(0),
});

/** Zod schema for LocalGameResult (device-stored game result). */
export const localGameResultSchema = z.object({
  id: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
  selectedTiers: z.array(difficultyTierSchema).min(1),
  score: z.number().int().min(0),
  totalQuestions: z.number().int().min(1),
  bestStreak: z.number().int().min(0),
  answers: z.array(localAnswerSchema),
  completedAt: z.string().min(1),
  durationSeconds: z.number().int().min(0),
});
