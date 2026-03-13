/**
 * R2 read/write abstraction for daily game JSON storage.
 *
 * Provides typed helpers for uploading, reading, and listing
 * daily game files in the R2 bucket.
 */

import type { DailyGame } from "@history-gauntlet/shared";
import { GAME_CONFIG } from "@history-gauntlet/shared";

/**
 * Builds the R2 object key for a given date.
 *
 * @param date - Date string in YYYY-MM-DD format
 * @returns Key like `games/2025-03-01.json`
 */
export const buildR2Key = (date: string): string => `${GAME_CONFIG.r2GamePrefix}${date}.json`;

/**
 * Uploads a DailyGame JSON object to R2.
 *
 * Overwrites any existing object at the same key, making
 * generation idempotent for a given date.
 */
export const uploadGame = async (
  bucket: R2Bucket,
  date: string,
  game: DailyGame,
): Promise<void> => {
  const key = buildR2Key(date);
  const body = JSON.stringify(game);
  await bucket.put(key, body, {
    httpMetadata: { contentType: "application/json" },
  });
};

/**
 * Reads a DailyGame JSON from R2 by date.
 *
 * @returns The parsed DailyGame, or null if no game exists for the date.
 */
export const getGame = async (bucket: R2Bucket, date: string): Promise<DailyGame | null> => {
  const key = buildR2Key(date);
  const object = await bucket.get(key);

  if (!object) {
    return null;
  }

  const text = await object.text();
  return JSON.parse(text) as DailyGame;
};

/**
 * Lists game object keys in R2, optionally filtered by a prefix.
 *
 * @param prefix - Optional prefix to filter keys (defaults to the game prefix).
 * @returns Array of R2 object keys.
 */
export const listGames = async (bucket: R2Bucket, prefix?: string): Promise<string[]> => {
  const listPrefix = prefix ?? GAME_CONFIG.r2GamePrefix;
  const keys: string[] = [];
  let cursor: string | undefined;

  /* R2 list is paginated; loop until all keys are collected. */
  for (;;) {
    const listOptions: R2ListOptions = { prefix: listPrefix };
    if (cursor !== undefined) {
      listOptions.cursor = cursor;
    }
    const result = await bucket.list(listOptions);

    for (const obj of result.objects) {
      keys.push(obj.key);
    }

    if (result.truncated) {
      cursor = result.cursor;
    } else {
      break;
    }
  }

  return keys;
};
