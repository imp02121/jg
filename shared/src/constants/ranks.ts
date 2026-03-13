/**
 * Rank definitions for The History Gauntlet.
 *
 * Players receive a rank at game completion based on their score percentage.
 * Each rank has an SVG icon key, a title, a description, and threshold boundaries.
 */

/** A single rank tier definition. */
export interface RankDefinition {
  /** Minimum score percentage to earn this rank (inclusive, 0-100). */
  readonly minPercent: number;
  /** Maximum score percentage for this rank (inclusive, 0-100). */
  readonly maxPercent: number;
  /** Display title for the rank. */
  readonly title: string;
  /** Key mapping to an SVG icon component. */
  readonly iconKey: string;
  /** Short description of the rank. */
  readonly description: string;
  /** Sort order for display (0 = lowest rank). */
  readonly sortOrder: number;
}

/** All eight rank definitions, ordered from lowest to highest. */
export const RANKS: readonly RankDefinition[] = [
  {
    minPercent: 0,
    maxPercent: 20,
    title: "Curious Peasant",
    iconKey: "wheat",
    description: "Every journey begins with a single question.",
    sortOrder: 0,
  },
  {
    minPercent: 21,
    maxPercent: 35,
    title: "Apprentice Scribe",
    iconKey: "quill",
    description: "You have begun to record the stories of old.",
    sortOrder: 1,
  },
  {
    minPercent: 36,
    maxPercent: 50,
    title: "Travelling Scholar",
    iconKey: "backpack",
    description: "Your curiosity carries you across lands and centuries.",
    sortOrder: 2,
  },
  {
    minPercent: 51,
    maxPercent: 65,
    title: "Court Historian",
    iconKey: "crown",
    description: "Rulers seek your counsel on matters of the past.",
    sortOrder: 3,
  },
  {
    minPercent: 66,
    maxPercent: 80,
    title: "Master Chronicler",
    iconKey: "scroll",
    description: "Your chronicles are the definitive record of ages.",
    sortOrder: 4,
  },
  {
    minPercent: 81,
    maxPercent: 90,
    title: "Grand Archivist",
    iconKey: "columns",
    description: "The great library bows to your knowledge.",
    sortOrder: 5,
  },
  {
    minPercent: 91,
    maxPercent: 99,
    title: "Keeper of All Ages",
    iconKey: "lightning",
    description: "Time itself whispers its secrets to you.",
    sortOrder: 6,
  },
  {
    minPercent: 100,
    maxPercent: 100,
    title: "Immortal Oracle",
    iconKey: "crystal-ball",
    description: "Perfection. You have conquered the gauntlet.",
    sortOrder: 7,
  },
] as const satisfies readonly RankDefinition[];

/**
 * Returns the rank for a given score percentage (0-100).
 *
 * Searches from highest rank to lowest to find the first match.
 */
export function getRankForPercent(percent: number): RankDefinition {
  const clamped = Math.round(Math.max(0, Math.min(100, percent)));
  for (let i = RANKS.length - 1; i >= 0; i--) {
    const rank = RANKS[i];
    if (rank !== undefined && clamped >= rank.minPercent) {
      return rank;
    }
  }
  return RANKS[0] as RankDefinition;
}
