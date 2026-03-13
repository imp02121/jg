/**
 * Typed API client for the History Gauntlet admin dashboard.
 *
 * All functions use shared types for request/response shapes.
 * The base URL is read from the VITE_API_URL environment variable.
 */

import type {
  BulkImportQuestionsRequest,
  BulkImportQuestionsResponse,
  CreateQuestionRequest,
  CreateQuestionResponse,
  DailyGameResponse,
  DeleteQuestionResponse,
  GenerateGameRequest,
  GenerateGameResponse,
  HealthResponse,
  ListGamesResponse,
  ListQuestionsParams,
  ListQuestionsResponse,
  PreviewGameResponse,
  UpdateQuestionRequest,
  UpdateQuestionResponse,
} from "@history-gauntlet/shared";

/** Error thrown when an API request fails. */
export class ApiError extends Error {
  readonly status: number;
  readonly details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

function getBaseUrl(): string {
  const url = import.meta.env.VITE_API_URL;
  if (typeof url !== "string" || url.length === 0) {
    throw new Error("VITE_API_URL environment variable is not set");
  }
  return url.replace(/\/+$/, "");
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const message = typeof body.error === "string" ? body.error : response.statusText;
    throw new ApiError(message, response.status, body.details);
  }

  return response.json() as Promise<T>;
}

function buildQueryString(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(
    (pair): pair is [string, string | number] => pair[1] !== undefined,
  );
  if (entries.length === 0) return "";
  const searchParams = new URLSearchParams();
  for (const [key, value] of entries) {
    searchParams.set(key, String(value));
  }
  return `?${searchParams.toString()}`;
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export function checkHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/api/health");
}

// ---------------------------------------------------------------------------
// Admin -- Questions
// ---------------------------------------------------------------------------

export function listQuestions(params?: ListQuestionsParams): Promise<ListQuestionsResponse> {
  const qs = buildQueryString({
    page: params?.page,
    limit: params?.limit,
    difficulty: params?.difficulty,
    category: params?.category,
    search: params?.search,
  });
  return request<ListQuestionsResponse>(`/api/admin/questions${qs}`);
}

export function createQuestion(body: CreateQuestionRequest): Promise<CreateQuestionResponse> {
  return request<CreateQuestionResponse>("/api/admin/questions", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateQuestion(
  id: string,
  body: UpdateQuestionRequest,
): Promise<UpdateQuestionResponse> {
  return request<UpdateQuestionResponse>(`/api/admin/questions/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteQuestion(id: string): Promise<DeleteQuestionResponse> {
  return request<DeleteQuestionResponse>(`/api/admin/questions/${id}`, {
    method: "DELETE",
  });
}

export function bulkImportQuestions(
  body: BulkImportQuestionsRequest,
): Promise<BulkImportQuestionsResponse> {
  return request<BulkImportQuestionsResponse>("/api/admin/questions/bulk", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Admin -- Games
// ---------------------------------------------------------------------------

export function listGames(params?: { page?: number; limit?: number }): Promise<ListGamesResponse> {
  const qs = buildQueryString({ page: params?.page, limit: params?.limit });
  return request<ListGamesResponse>(`/api/admin/games${qs}`);
}

export function generateGame(body: GenerateGameRequest): Promise<GenerateGameResponse> {
  return request<GenerateGameResponse>("/api/admin/games/generate", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function previewGame(date: string): Promise<PreviewGameResponse> {
  return request<PreviewGameResponse>(`/api/admin/games/${date}/preview`);
}

// ---------------------------------------------------------------------------
// Public -- Games
// ---------------------------------------------------------------------------

export function getDailyGame(): Promise<DailyGameResponse> {
  return request<DailyGameResponse>("/api/games/daily");
}

export function getGameByDate(date: string): Promise<DailyGameResponse> {
  return request<DailyGameResponse>(`/api/games/${date}`);
}
