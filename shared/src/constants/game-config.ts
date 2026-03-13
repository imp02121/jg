/**
 * Game configuration constants for The History Gauntlet.
 *
 * Centralises configurable values used by the API, mobile app, and dashboard.
 * All values are plain constants — no runtime logic.
 */

/** Game configuration values. */
export const GAME_CONFIG = {
  /**
   * Number of days a question must rest after being used before it can
   * be selected again for a daily game.
   */
  questionCooldownDays: 30,

  /**
   * Maximum number of questions the admin can import in a single bulk request.
   */
  maxBulkImportSize: 500,

  /**
   * Default pagination limit for list endpoints.
   */
  defaultPageLimit: 20,

  /**
   * Maximum pagination limit for list endpoints.
   */
  maxPageLimit: 100,

  /**
   * Current schema version for the DailyGame JSON format.
   * Increment when the R2 JSON structure changes.
   */
  currentGameVersion: 1,

  /**
   * R2 key prefix for daily game JSON files.
   * Full key format: `${r2GamePrefix}YYYY-MM-DD.json`
   */
  r2GamePrefix: "games/",

  /**
   * Number of days of cached games to keep on the device.
   */
  localCacheRetentionDays: 7,

  /**
   * Number of recent game results shown on the history screen.
   */
  recentHistoryLimit: 30,
} as const;
