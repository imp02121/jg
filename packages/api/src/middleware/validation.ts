/**
 * Zod-based request validation middleware for the History Gauntlet API.
 *
 * Provides a reusable middleware factory that validates JSON request bodies
 * against a Zod schema and returns 400 with structured errors on failure.
 */

import type { Context, Next } from "hono";
import type { z } from "zod";

/** Key used to store the validated body on the Hono context. */
const VALIDATED_BODY_KEY = "validatedBody";

/**
 * Creates a middleware that validates the JSON request body against the given Zod schema.
 *
 * On success, the parsed value is stored on `c.set("validatedBody", ...)`.
 * On failure, returns a 400 response with the Zod error details.
 */
export const validateBody = (schema: z.ZodType) => {
  return async (c: Context, next: Next) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    const result = schema.safeParse(body);

    if (!result.success) {
      return c.json(
        {
          error: "Validation failed",
          details: result.error.issues,
        },
        400,
      );
    }

    c.set(VALIDATED_BODY_KEY, result.data);
    await next();
    return undefined;
  };
};

/**
 * Retrieves the validated request body from the Hono context.
 *
 * Must be called after the `validateBody` middleware has run.
 */
export const getValidatedBody = <T>(c: Context): T => {
  return c.get(VALIDATED_BODY_KEY) as T;
};
