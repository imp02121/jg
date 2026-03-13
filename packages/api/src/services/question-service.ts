/**
 * Business logic layer for question management.
 *
 * Wraps D1 query functions with UUID generation, timestamp management,
 * validation, and error handling.
 */

import type {
  BulkImportError,
  CreateQuestionRequest,
  ListQuestionsParams,
  Question,
  UpdateQuestionRequest,
} from "@history-gauntlet/shared";
import { createQuestionSchema } from "@history-gauntlet/shared";
import { GAME_CONFIG } from "@history-gauntlet/shared";
import type { ListResult, QuestionWriteData } from "../db/queries/questions";
import {
  bulkCreateQuestions,
  createQuestion,
  deleteQuestion,
  getQuestionById,
  listQuestions,
  updateQuestion,
} from "../db/queries/questions";
import { HttpError } from "../middleware/error-handler";

/** Lists questions with pagination and optional filters. */
export const listQuestionsService = async (
  db: D1Database,
  params: ListQuestionsParams,
): Promise<ListResult> => {
  const page = params.page ?? 1;
  const limit = Math.min(params.limit ?? GAME_CONFIG.defaultPageLimit, GAME_CONFIG.maxPageLimit);

  if (page < 1) {
    throw new HttpError(400, "Page must be at least 1");
  }
  if (limit < 1) {
    throw new HttpError(400, "Limit must be at least 1");
  }

  return listQuestions(db, { ...params, page, limit });
};

/** Gets a single question by ID. Throws 404 if not found. */
export const getQuestionByIdService = async (db: D1Database, id: string): Promise<Question> => {
  const question = await getQuestionById(db, id);
  if (!question) {
    throw new HttpError(404, `Question not found: ${id}`);
  }
  return question;
};

/** Creates a new question with generated UUID and timestamps. */
export const createQuestionService = async (
  db: D1Database,
  data: CreateQuestionRequest,
): Promise<Question> => {
  const now = new Date().toISOString();
  const writeData: QuestionWriteData = {
    id: crypto.randomUUID(),
    difficulty: data.difficulty,
    iconKey: data.iconKey,
    question: data.question,
    options: data.options,
    correctIndex: data.correctIndex,
    fact: data.fact,
    category: data.category,
    createdAt: now,
    updatedAt: now,
  };

  return createQuestion(db, writeData);
};

/** Updates an existing question. Throws 404 if not found. */
export const updateQuestionService = async (
  db: D1Database,
  id: string,
  data: UpdateQuestionRequest,
): Promise<Question> => {
  const now = new Date().toISOString();
  const updated = await updateQuestion(db, id, { ...data, updatedAt: now });

  if (!updated) {
    throw new HttpError(404, `Question not found: ${id}`);
  }

  return updated;
};

/** Deletes a question. Throws 404 if not found. */
export const deleteQuestionService = async (db: D1Database, id: string): Promise<void> => {
  const deleted = await deleteQuestion(db, id);
  if (!deleted) {
    throw new HttpError(404, `Question not found: ${id}`);
  }
};

/** Result of a bulk import operation. */
export interface BulkImportResult {
  readonly imported: number;
  readonly errors: readonly BulkImportError[];
}

/** Bulk imports questions, validating each individually. */
export const bulkImportQuestionsService = async (
  db: D1Database,
  questions: readonly CreateQuestionRequest[],
): Promise<BulkImportResult> => {
  if (questions.length === 0) {
    return { imported: 0, errors: [] };
  }

  if (questions.length > GAME_CONFIG.maxBulkImportSize) {
    throw new HttpError(
      400,
      `Bulk import limited to ${String(GAME_CONFIG.maxBulkImportSize)} questions`,
    );
  }

  const errors: BulkImportError[] = [];
  const validItems: QuestionWriteData[] = [];
  const now = new Date().toISOString();

  for (let i = 0; i < questions.length; i++) {
    const item = questions[i];
    const result = createQuestionSchema.safeParse(item);

    if (!result.success) {
      const message = result.error.issues.map((issue) => issue.message).join("; ");
      errors.push({ index: i, error: message });
    } else {
      validItems.push({
        id: crypto.randomUUID(),
        difficulty: result.data.difficulty,
        iconKey: result.data.iconKey,
        question: result.data.question,
        options: result.data.options,
        correctIndex: result.data.correctIndex,
        fact: result.data.fact,
        category: result.data.category,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  if (validItems.length > 0) {
    await bulkCreateQuestions(db, validItems);
  }

  return { imported: validItems.length, errors };
};
