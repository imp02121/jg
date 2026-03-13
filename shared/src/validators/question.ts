/**
 * Zod validation schemas for Question-related types.
 *
 * These schemas validate data at runtime (e.g. API request bodies,
 * D1 query results) and are kept in sync with the TypeScript types
 * defined in types/question.ts.
 */

import { z } from "zod";

/** Zod schema for DifficultyTier union type. */
export const difficultyTierSchema = z.union([
  z.literal("Novice"),
  z.literal("Apprentice"),
  z.literal("Journeyman"),
  z.literal("Scholar"),
  z.literal("Master"),
  z.literal("Grandmaster"),
]);

/** Zod schema for CorrectIndex (0 | 1 | 2 | 3). */
export const correctIndexSchema = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]);

/** Zod schema for OptionsTuple — exactly four non-empty strings. */
export const optionsTupleSchema = z.tuple([
  z.string().min(1),
  z.string().min(1),
  z.string().min(1),
  z.string().min(1),
]);

/** Zod schema for a Question (full D1 shape with admin metadata). */
export const questionSchema = z.object({
  id: z.string().min(1),
  difficulty: difficultyTierSchema,
  iconKey: z.string().min(1),
  question: z.string().min(1),
  options: optionsTupleSchema,
  correctIndex: correctIndexSchema,
  fact: z.string().min(1),
  category: z.string().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  usedCount: z.number().int().min(0),
  lastUsedAt: z.string().nullable(),
});

/** Zod schema for creating a question (no id, timestamps, or usage tracking). */
export const createQuestionSchema = z.object({
  difficulty: difficultyTierSchema,
  iconKey: z.string().min(1),
  question: z.string().min(1),
  options: optionsTupleSchema,
  correctIndex: correctIndexSchema,
  fact: z.string().min(1),
  category: z.string().min(1),
});

/** Zod schema for updating a question (all fields optional). */
export const updateQuestionSchema = z.object({
  difficulty: difficultyTierSchema.optional(),
  iconKey: z.string().min(1).optional(),
  question: z.string().min(1).optional(),
  options: optionsTupleSchema.optional(),
  correctIndex: correctIndexSchema.optional(),
  fact: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
});
