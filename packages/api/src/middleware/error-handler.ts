/**
 * Global error handling middleware for the History Gauntlet API.
 *
 * Catches unhandled errors and returns a consistent JSON error shape
 * matching the shared ApiErrorResponse type.
 */

import type { Context } from "hono";
import type { Env } from "../types/env";

/** Error response shape matching ApiErrorResponse from shared types. */
interface ErrorBody {
  readonly error: string;
  readonly details?: unknown;
}

/**
 * Hono error handler that converts thrown errors into structured JSON responses.
 *
 * - Known errors with a `status` property use that status code.
 * - Unknown errors return 500 Internal Server Error.
 */
export const errorHandler = (err: Error, c: Context<{ Bindings: Env }>): Response => {
  const status = "status" in err && typeof err.status === "number" ? err.status : 500;

  const body: ErrorBody = {
    error: err.message || "Internal Server Error",
    ...(status !== 500 && "details" in err ? { details: err.details } : {}),
  };

  return c.json(body, status as 400);
};

/**
 * Custom HTTP error class with a status code and optional details.
 *
 * Throw this from route handlers or services to return a typed error response.
 */
export class HttpError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.details = details;
  }
}
