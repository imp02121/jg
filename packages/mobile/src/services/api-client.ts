/**
 * Typed HTTP client for the History Gauntlet game API.
 *
 * All methods use shared types for return values. The base URL
 * is configurable and must not be hardcoded.
 */

import type { ApiErrorResponse, DailyGameResponse, HealthResponse } from "@history-gauntlet/shared";

/** Configuration for the API client. */
export interface ApiClientConfig {
  /** Base URL of the game API (e.g. "https://api.historygauntlet.com"). */
  readonly baseUrl: string;
}

/** Error thrown when an API request fails. */
export class ApiError extends Error {
  readonly statusCode: number;
  readonly details: unknown;

  constructor(message: string, statusCode: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Parse a response from the API, throwing an ApiError on non-OK status.
 */
async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorBody: ApiErrorResponse | undefined;
    try {
      errorBody = (await response.json()) as ApiErrorResponse;
    } catch {
      // Response body was not valid JSON; fall through to generic error.
    }

    throw new ApiError(
      errorBody?.error ?? `Request failed with status ${String(response.status)}`,
      response.status,
      errorBody?.details,
    );
  }

  return (await response.json()) as T;
}

/**
 * Create a typed API client for the History Gauntlet game API.
 *
 * @param config - Client configuration including the base URL.
 * @returns An object with methods for each public API endpoint.
 */
export function createApiClient(config: ApiClientConfig) {
  const { baseUrl } = config;

  /**
   * Build a full URL for the given API path.
   */
  function buildUrl(path: string): string {
    // Strip trailing slash from base and leading slash from path to avoid doubles
    const base = baseUrl.replace(/\/+$/, "");
    const cleanPath = path.replace(/^\/+/, "");
    return `${base}/${cleanPath}`;
  }

  return {
    /**
     * Fetch today's daily game.
     *
     * GET /api/games/daily
     */
    async fetchDailyGame(): Promise<DailyGameResponse> {
      const url = buildUrl("/api/games/daily");
      const response = await fetch(url);
      return parseResponse<DailyGameResponse>(response);
    },

    /**
     * Fetch the game for a specific date.
     *
     * GET /api/games/:date
     *
     * @param date - The date in YYYY-MM-DD format.
     */
    async fetchGameByDate(date: string): Promise<DailyGameResponse> {
      const url = buildUrl(`/api/games/${date}`);
      const response = await fetch(url);
      return parseResponse<DailyGameResponse>(response);
    },

    /**
     * Check that the API is reachable and healthy.
     *
     * GET /api/health
     */
    async healthCheck(): Promise<HealthResponse> {
      const url = buildUrl("/api/health");
      const response = await fetch(url);
      return parseResponse<HealthResponse>(response);
    },
  };
}

/** Type of the object returned by createApiClient. */
export type ApiClient = ReturnType<typeof createApiClient>;
