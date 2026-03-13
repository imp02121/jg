/**
 * Question types for The History Gauntlet.
 *
 * Defines the core question data model, difficulty tiers, and tier configuration.
 */

/** The six difficulty tiers, ordered from easiest to hardest. */
export type DifficultyTier =
  | "Novice"
  | "Apprentice"
  | "Journeyman"
  | "Scholar"
  | "Master"
  | "Grandmaster";

/** All valid difficulty tier values as a readonly array. */
export const DIFFICULTY_TIER_VALUES: readonly DifficultyTier[] = [
  "Novice",
  "Apprentice",
  "Journeyman",
  "Scholar",
  "Master",
  "Grandmaster",
] as const;

/** Valid answer index — exactly one of the four options. */
export type CorrectIndex = 0 | 1 | 2 | 3;

/** A fixed-length tuple of exactly four answer option strings. */
export type OptionsTuple = [string, string, string, string];

/** Definition of a difficulty tier including display properties. */
export interface TierDefinition {
  /** The tier key used in data models. */
  readonly key: DifficultyTier;
  /** Human-readable label for the tier. */
  readonly label: string;
  /** Background color for the tier badge. */
  readonly bgColor: string;
  /** Text color for the tier badge. */
  readonly textColor: string;
  /** Key mapping to an SVG icon component (e.g. "shield-green"). */
  readonly iconKey: string;
  /** Number of questions drawn from this tier per daily game. */
  readonly questionsPerDay: number;
  /** Sort order for display (lower = easier, higher = harder). */
  readonly sortOrder: number;
}

/**
 * A question in the question bank (D1 storage shape).
 *
 * Includes administrative metadata such as usage tracking fields.
 */
export interface Question {
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
  /** Category label (e.g. "Ancient", "Medieval", "Modern"). */
  readonly category: string;
  /** ISO 8601 timestamp when the question was created. */
  readonly createdAt: string;
  /** ISO 8601 timestamp when the question was last updated. */
  readonly updatedAt: string;
  /** Number of times this question has been used in a daily game. */
  readonly usedCount: number;
  /** ISO 8601 timestamp of last usage, or null if never used. */
  readonly lastUsedAt: string | null;
}
