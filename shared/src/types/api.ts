/**
 * API request and response types for The History Gauntlet.
 *
 * Covers both public (mobile) and admin (dashboard) endpoints.
 */

import type { DailyGame } from "./game";
import type { DifficultyTier, Question } from "./question";

// ---------------------------------------------------------------------------
// Common
// ---------------------------------------------------------------------------

/** Standard error response shape returned by all endpoints. */
export interface ApiErrorResponse {
  readonly error: string;
  readonly details?: unknown;
}

/** Standard paginated response wrapper. */
export interface PaginatedResponse<T> {
  readonly data: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
}

// ---------------------------------------------------------------------------
// Public — GET /api/games/daily, GET /api/games/:date
// ---------------------------------------------------------------------------

/** Response for GET /api/games/daily and GET /api/games/:date */
export type DailyGameResponse = DailyGame;

// ---------------------------------------------------------------------------
// Public — GET /api/health
// ---------------------------------------------------------------------------

/** Response for GET /api/health */
export interface HealthResponse {
  readonly status: "ok";
  readonly timestamp: string;
}

// ---------------------------------------------------------------------------
// Admin — Questions
// ---------------------------------------------------------------------------

/** Query parameters for GET /api/admin/questions */
export interface ListQuestionsParams {
  readonly page?: number;
  readonly limit?: number;
  readonly difficulty?: DifficultyTier;
  readonly category?: string;
  readonly search?: string;
}

/** Response for GET /api/admin/questions */
export type ListQuestionsResponse = PaginatedResponse<Question>;

/** Request body for POST /api/admin/questions */
export interface CreateQuestionRequest {
  readonly difficulty: DifficultyTier;
  readonly iconKey: string;
  readonly question: string;
  readonly options: [string, string, string, string];
  readonly correctIndex: 0 | 1 | 2 | 3;
  readonly fact: string;
  readonly category: string;
}

/** Response for POST /api/admin/questions */
export type CreateQuestionResponse = Question;

/** Request body for PUT /api/admin/questions/:id */
export interface UpdateQuestionRequest {
  readonly difficulty?: DifficultyTier;
  readonly iconKey?: string;
  readonly question?: string;
  readonly options?: [string, string, string, string];
  readonly correctIndex?: 0 | 1 | 2 | 3;
  readonly fact?: string;
  readonly category?: string;
}

/** Response for PUT /api/admin/questions/:id */
export type UpdateQuestionResponse = Question;

/** Response for DELETE /api/admin/questions/:id */
export interface DeleteQuestionResponse {
  readonly success: true;
  readonly id: string;
}

/** Request body for POST /api/admin/questions/bulk */
export interface BulkImportQuestionsRequest {
  readonly questions: readonly CreateQuestionRequest[];
}

/** Error detail for a single question in a bulk import. */
export interface BulkImportError {
  readonly index: number;
  readonly error: string;
}

/** Response for POST /api/admin/questions/bulk */
export interface BulkImportQuestionsResponse {
  readonly imported: number;
  readonly errors: readonly BulkImportError[];
}

// ---------------------------------------------------------------------------
// Admin — Games
// ---------------------------------------------------------------------------

/** Request body for POST /api/admin/games/generate */
export interface GenerateGameRequest {
  readonly date: string;
  readonly tierDistribution?: Partial<Record<DifficultyTier, number>>;
}

/** Response for POST /api/admin/games/generate */
export type GenerateGameResponse = DailyGame;

/** Metadata for a generated game as returned by the list endpoint. */
export interface GameMetadataItem {
  readonly date: string;
  readonly totalQuestions: number;
  readonly questionsByDifficulty: Record<DifficultyTier, number>;
  readonly generatedAt: string;
  readonly r2Key: string;
}

/** Response for GET /api/admin/games */
export type ListGamesResponse = PaginatedResponse<GameMetadataItem>;

/** Response for GET /api/admin/games/:date/preview */
export type PreviewGameResponse = DailyGame;
