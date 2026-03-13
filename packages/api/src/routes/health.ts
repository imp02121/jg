/**
 * Health check route for the History Gauntlet API.
 *
 * Returns a simple status response confirming the API is running.
 */

import type { HealthResponse } from "@history-gauntlet/shared";
import { Hono } from "hono";
import type { Env } from "../types/env";

/** Health check router. */
export const healthRoute = new Hono<{ Bindings: Env }>();

healthRoute.get("/", (c) => {
  const response: HealthResponse = {
    status: "ok",
    timestamp: new Date().toISOString(),
  };
  return c.json(response, 200);
});
