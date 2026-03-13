/**
 * Barrel export for all shared constants.
 */

export {
  DIFFICULTY_TIERS,
  TIER_BY_KEY,
  TOTAL_QUESTIONS_PER_DAY,
} from "./difficulties";

export { RANKS, getRankForPercent } from "./ranks";
export type { RankDefinition } from "./ranks";

export { GAME_CONFIG } from "./game-config";
