/**
 * @history-gauntlet/api
 *
 * Hono API entry point for The History Gauntlet.
 * Runs on Cloudflare Workers with D1 and R2 bindings.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { errorHandler } from "./middleware/error-handler";
import { adminGamesRoute } from "./routes/admin-games";
import { adminQuestionsRoute } from "./routes/admin-questions";
import { gamesRoute } from "./routes/games";
import { healthRoute } from "./routes/health";
import type { Env } from "./types/env";

/** Main Hono application with typed Cloudflare bindings. */
const app = new Hono<{ Bindings: Env }>();

/* ------------------------------------------------------------------ */
/* Middleware                                                          */
/* ------------------------------------------------------------------ */

app.use("*", cors());

/* ------------------------------------------------------------------ */
/* Routes                                                             */
/* ------------------------------------------------------------------ */

app.route("/api/health", healthRoute);
app.route("/api/admin/questions", adminQuestionsRoute);
app.route("/api/admin/games", adminGamesRoute);
app.route("/api/games", gamesRoute);

/* ------------------------------------------------------------------ */
/* Error handling                                                     */
/* ------------------------------------------------------------------ */

app.onError(errorHandler);

/* ------------------------------------------------------------------ */
/* 404 fallback                                                       */
/* ------------------------------------------------------------------ */

app.notFound((c) => {
  return c.json({ error: "Not Found" }, 404);
});

// biome-ignore lint/style/noDefaultExport: Cloudflare Workers requires a default export
export default app;
