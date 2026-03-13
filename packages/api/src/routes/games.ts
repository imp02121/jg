/**
 * Public game routes for The History Gauntlet.
 *
 * Mounted at /api/games in the main app.
 * Serves daily games from R2 for mobile and web consumers.
 */

import { Hono } from "hono";
import { HttpError } from "../middleware/error-handler";
import { getGame } from "../services/r2-client";
import type { Env } from "../types/env";

/** Regex pattern for YYYY-MM-DD date format. */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Returns today's date in UTC as YYYY-MM-DD. */
const getUtcDateString = (): string => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return `${String(year)}-${month}-${day}`;
};

/** Public game routes. */
export const gamesRoute = new Hono<{ Bindings: Env }>();

/** GET /daily -- Return today's game from R2 (UTC date). */
gamesRoute.get("/daily", async (c) => {
  const today = getUtcDateString();
  const game = await getGame(c.env.GAME_BUCKET, today);

  if (!game) {
    throw new HttpError(404, `No game available for today (${today})`);
  }

  return c.json(game, 200);
});

/** GET /:date -- Return a specific date's game from R2. */
gamesRoute.get("/:date", async (c) => {
  const date = c.req.param("date");

  if (!date || !DATE_PATTERN.test(date)) {
    throw new HttpError(400, "Invalid date format. Use YYYY-MM-DD (e.g. 2025-03-01).");
  }

  const game = await getGame(c.env.GAME_BUCKET, date);

  if (!game) {
    throw new HttpError(404, `No game found for date: ${date}`);
  }

  return c.json(game, 200);
});
