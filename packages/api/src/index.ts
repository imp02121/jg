/**
 * @history-gauntlet/api
 *
 * Hono API entry point for The History Gauntlet.
 * Runs on Cloudflare Workers with D1 and R2 bindings.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { errorHandler } from "./middleware/error-handler";
import { adminQuestionsRoute } from "./routes/admin-questions";
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
