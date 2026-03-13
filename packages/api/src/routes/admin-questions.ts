/**
 * Admin question CRUD routes for The History Gauntlet.
 *
 * Mounted at /api/admin/questions in the main app.
 */

import type {
  BulkImportQuestionsResponse,
  CreateQuestionRequest,
  DifficultyTier,
  ListQuestionsParams,
  ListQuestionsResponse,
  UpdateQuestionRequest,
} from "@history-gauntlet/shared";
import { DIFFICULTY_TIER_VALUES } from "@history-gauntlet/shared";
import { createQuestionSchema, updateQuestionSchema } from "@history-gauntlet/shared";
import { Hono } from "hono";
import { z } from "zod";
import { HttpError } from "../middleware/error-handler";
import { getValidatedBody, validateBody } from "../middleware/validation";
import {
  bulkImportQuestionsService,
  createQuestionService,
  deleteQuestionService,
  getQuestionByIdService,
  listQuestionsService,
  updateQuestionService,
} from "../services/question-service";
import type { Env } from "../types/env";

/** Zod schema for bulk import request body. */
const bulkImportSchema = z.object({
  questions: z.array(createQuestionSchema),
});

/** Admin question routes. */
export const adminQuestionsRoute = new Hono<{ Bindings: Env }>();

/** GET / — Paginated list with optional filters. */
adminQuestionsRoute.get("/", async (c) => {
  const pageRaw = c.req.query("page");
  const limitRaw = c.req.query("limit");
  const difficulty = c.req.query("difficulty");
  const category = c.req.query("category");
  const search = c.req.query("search");

  if (difficulty && !DIFFICULTY_TIER_VALUES.includes(difficulty as DifficultyTier)) {
    throw new HttpError(400, `Invalid difficulty: ${difficulty}`);
  }

  const parsedPage = pageRaw ? Number.parseInt(pageRaw, 10) : undefined;
  const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;

  if (parsedPage !== undefined && Number.isNaN(parsedPage)) {
    throw new HttpError(400, "Invalid page parameter");
  }
  if (parsedLimit !== undefined && Number.isNaN(parsedLimit)) {
    throw new HttpError(400, "Invalid limit parameter");
  }

  const params: ListQuestionsParams = {
    ...(parsedPage !== undefined ? { page: parsedPage } : {}),
    ...(parsedLimit !== undefined ? { limit: parsedLimit } : {}),
    ...(difficulty ? { difficulty: difficulty as DifficultyTier } : {}),
    ...(category ? { category } : {}),
    ...(search ? { search } : {}),
  };

  const result = await listQuestionsService(c.env.DB, params);

  const response: ListQuestionsResponse = {
    data: result.data,
    total: result.total,
    page: parsedPage ?? 1,
    limit: parsedLimit ?? 20,
  };

  return c.json(response, 200);
});

/** POST / — Create a single question. */
adminQuestionsRoute.post("/", validateBody(createQuestionSchema), async (c) => {
  const body = getValidatedBody<CreateQuestionRequest>(c);
  const question = await createQuestionService(c.env.DB, body);
  return c.json(question, 201);
});

/** POST /bulk — Bulk import questions. */
adminQuestionsRoute.post("/bulk", validateBody(bulkImportSchema), async (c) => {
  const body = getValidatedBody<{ questions: readonly CreateQuestionRequest[] }>(c);
  const result = await bulkImportQuestionsService(c.env.DB, body.questions);

  const response: BulkImportQuestionsResponse = {
    imported: result.imported,
    errors: result.errors,
  };

  return c.json(response, 200);
});

/** Extracts a required route parameter, throwing 400 if missing. */
const requireParam = (
  c: { req: { param: (name: string) => string | undefined } },
  name: string,
): string => {
  const value = c.req.param(name);
  if (!value) {
    throw new HttpError(400, `Missing route parameter: ${name}`);
  }
  return value;
};

/** PUT /:id — Update a question. */
adminQuestionsRoute.put("/:id", validateBody(updateQuestionSchema), async (c) => {
  const id = requireParam(c, "id");
  const body = getValidatedBody<UpdateQuestionRequest>(c);
  const question = await updateQuestionService(c.env.DB, id, body);
  return c.json(question, 200);
});

/** DELETE /:id — Delete a question. */
adminQuestionsRoute.delete("/:id", async (c) => {
  const id = requireParam(c, "id");
  await deleteQuestionService(c.env.DB, id);
  return c.body(null, 204);
});

/** GET /:id — Get a single question. */
adminQuestionsRoute.get("/:id", async (c) => {
  const id = requireParam(c, "id");
  const question = await getQuestionByIdService(c.env.DB, id);
  return c.json(question, 200);
});
