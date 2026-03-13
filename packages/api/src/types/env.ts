/**
 * Typed Cloudflare Worker bindings for The History Gauntlet API.
 *
 * Used as the generic parameter for `Hono<{ Bindings: Env }>` to provide
 * type-safe access to D1, R2, and any future bindings.
 */

/** Cloudflare Worker environment bindings. */
export interface Env {
  /** D1 database containing the question bank and game metadata. */
  readonly DB: D1Database;
  /** R2 bucket storing generated daily game JSON files. */
  readonly GAME_BUCKET: R2Bucket;
}
