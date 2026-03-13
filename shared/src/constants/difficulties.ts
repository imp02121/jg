/**
 * Difficulty tier definitions for The History Gauntlet.
 *
 * Each tier has display properties (colors, icon key, label) and
 * gameplay configuration (questions per day, sort order).
 */

import type { DifficultyTier, TierDefinition } from "../types/question";

/** All six difficulty tier definitions, ordered from easiest to hardest. */
export const DIFFICULTY_TIERS: readonly TierDefinition[] = [
  {
    key: "Novice",
    label: "Novice",
    bgColor: "#4a7c59",
    textColor: "#e8f5e9",
    iconKey: "shield-green",
    questionsPerDay: 6,
    sortOrder: 0,
  },
  {
    key: "Apprentice",
    label: "Apprentice",
    bgColor: "#5c6d3f",
    textColor: "#f1f8e9",
    iconKey: "shield-olive",
    questionsPerDay: 6,
    sortOrder: 1,
  },
  {
    key: "Journeyman",
    label: "Journeyman",
    bgColor: "#8d6e3f",
    textColor: "#fff8e1",
    iconKey: "shield-amber",
    questionsPerDay: 7,
    sortOrder: 2,
  },
  {
    key: "Scholar",
    label: "Scholar",
    bgColor: "#8b4513",
    textColor: "#fbe9e7",
    iconKey: "shield-brown",
    questionsPerDay: 7,
    sortOrder: 3,
  },
  {
    key: "Master",
    label: "Master",
    bgColor: "#6a1b3a",
    textColor: "#fce4ec",
    iconKey: "shield-crimson",
    questionsPerDay: 6,
    sortOrder: 4,
  },
  {
    key: "Grandmaster",
    label: "Grandmaster",
    bgColor: "#1a1a2e",
    textColor: "#e8eaf6",
    iconKey: "shield-navy",
    questionsPerDay: 3,
    sortOrder: 5,
  },
] as const satisfies readonly TierDefinition[];

/** Lookup map from DifficultyTier key to its TierDefinition. */
export const TIER_BY_KEY = Object.fromEntries(
  DIFFICULTY_TIERS.map((tier) => [tier.key, tier]),
) as Readonly<Record<DifficultyTier, TierDefinition>>;

/**
 * Total number of questions in a full daily game (all tiers).
 * Derived from the tier definitions to stay in sync.
 */
export const TOTAL_QUESTIONS_PER_DAY: number = DIFFICULTY_TIERS.reduce(
  (sum, tier) => sum + tier.questionsPerDay,
  0,
);
