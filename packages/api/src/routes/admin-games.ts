/**
 * Admin game management routes for The History Gauntlet.
 *
 * Mounted at /api/admin/games in the main app.
 * Provides endpoints for generating daily games, listing generated games,
 * and previewing game content.
 */

import type {
  DifficultyTier,
  GenerateGameRequest,
  ListGamesResponse,
} from "@history-gauntlet/shared";
import { GAME_CONFIG } from "@history-gauntlet/shared";
import { Hono } from "hono";
import { z } from "zod";
import { listGameMetadata } from "../db/queries/game-metadata";
import { HttpError } from "../middleware/error-handler";
import { getValidatedBody, validateBody } from "../middleware/validation";
import { generateGame } from "../services/game-generator";
import { getGame } from "../services/r2-client";
import type { Env } from "../types/env";

/** Regex pattern for YYYY-MM-DD date format. */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Zod schema for the tier distribution override (optional). */
const tierDistributionSchema = z
  .record(
    z.enum(["Novice", "Apprentice", "Journeyman", "Scholar", "Master", "Grandmaster"]),
    z.number().int().min(0),
  )
  .optional();

/** Zod schema for the generate game request body. */
const generateGameSchema = z.object({
  date: z.string().regex(DATE_PATTERN, "Date must be in YYYY-MM-DD format"),
  tierDistribution: tierDistributionSchema,
});

/** Admin game routes. */
export const adminGamesRoute = new Hono<{ Bindings: Env }>();

/** POST /generate -- Generate a game for a specific date. */
adminGamesRoute.post("/generate", validateBody(generateGameSchema), async (c) => {
  const body = getValidatedBody<GenerateGameRequest>(c);
  const game = await generateGame(c.env.DB, c.env.GAME_BUCKET, {
    date: body.date,
    tierDistribution: body.tierDistribution as Partial<Record<DifficultyTier, number>> | undefined,
  });
  return c.json(game, 201);
});

/** GET / -- List generated games with pagination. */
adminGamesRoute.get("/", async (c) => {
  const pageRaw = c.req.query("page");
  const limitRaw = c.req.query("limit");

  const parsedPage = pageRaw ? Number.parseInt(pageRaw, 10) : undefined;
  const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;

  if (parsedPage !== undefined && Number.isNaN(parsedPage)) {
    throw new HttpError(400, "Invalid page parameter");
  }
  if (parsedLimit !== undefined && Number.isNaN(parsedLimit)) {
    throw new HttpError(400, "Invalid limit parameter");
  }

  const result = await listGameMetadata(c.env.DB, {
    page: parsedPage,
    limit: parsedLimit,
  });

  const response: ListGamesResponse = {
    data: result.data,
    total: result.total,
    page: parsedPage ?? 1,
    limit: Math.min(parsedLimit ?? GAME_CONFIG.defaultPageLimit, GAME_CONFIG.maxPageLimit),
  };

  return c.json(response, 200);
});

/** GET /:date/preview -- Preview a generated game by reading from R2. */
adminGamesRoute.get("/:date/preview", async (c) => {
  const date = c.req.param("date");
  if (!date || !DATE_PATTERN.test(date)) {
    throw new HttpError(400, "Invalid date format. Use YYYY-MM-DD.");
  }

  const game = await getGame(c.env.GAME_BUCKET, date);
  if (!game) {
    throw new HttpError(404, `No game found for date: ${date}`);
  }

  return c.json(game, 200);
});
