/**
 * Typed D1 query functions for the questions table.
 *
 * All functions use parameterized queries and map raw D1 results
 * to the shared Question interface.
 */

import type {
  CorrectIndex,
  DifficultyTier,
  ListQuestionsParams,
  OptionsTuple,
  Question,
} from "@history-gauntlet/shared";

/** Shape of a raw question row returned by D1. */
interface QuestionRow {
  readonly id: string;
  readonly difficulty: string;
  readonly icon_key: string;
  readonly question: string;
  readonly options: string;
  readonly correct_index: number;
  readonly fact: string;
  readonly category: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly used_count: number;
  readonly last_used_at: string | null;
}

/** Maps a raw D1 row to the typed Question interface. */
const mapRow = (row: QuestionRow): Question => ({
  id: row.id,
  difficulty: row.difficulty as DifficultyTier,
  iconKey: row.icon_key,
  question: row.question,
  options: JSON.parse(row.options) as OptionsTuple,
  correctIndex: row.correct_index as CorrectIndex,
  fact: row.fact,
  category: row.category,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  usedCount: row.used_count,
  lastUsedAt: row.last_used_at,
});

/** Fields that can be inserted or updated on a question. */
export interface QuestionWriteData {
  readonly id: string;
  readonly difficulty: DifficultyTier;
  readonly iconKey: string;
  readonly question: string;
  readonly options: OptionsTuple;
  readonly correctIndex: CorrectIndex;
  readonly fact: string;
  readonly category: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Result of a paginated list query. */
export interface ListResult {
  readonly data: readonly Question[];
  readonly total: number;
}

/** Lists questions with pagination and optional filters. */
export const listQuestions = async (
  db: D1Database,
  params: ListQuestionsParams,
): Promise<ListResult> => {
  const { page = 1, limit = 20, difficulty, category, search } = params;
  const conditions: string[] = [];
  const bindings: unknown[] = [];

  if (difficulty) {
    conditions.push("difficulty = ?");
    bindings.push(difficulty);
  }
  if (category) {
    conditions.push("category = ?");
    bindings.push(category);
  }
  if (search) {
    conditions.push("(question LIKE ? OR fact LIKE ?)");
    bindings.push(`%${search}%`, `%${search}%`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const offset = (page - 1) * limit;

  const countSql = `SELECT COUNT(*) as count FROM questions ${where}`;
  const countResult = await db
    .prepare(countSql)
    .bind(...bindings)
    .first<{ count: number }>();
  const total = countResult?.count ?? 0;

  const dataSql = `SELECT * FROM questions ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  const dataResult = await db
    .prepare(dataSql)
    .bind(...bindings, limit, offset)
    .all<QuestionRow>();

  const data = (dataResult.results ?? []).map(mapRow);
  return { data, total };
};

/** Gets a single question by ID. Returns null if not found. */
export const getQuestionById = async (db: D1Database, id: string): Promise<Question | null> => {
  const row = await db
    .prepare("SELECT * FROM questions WHERE id = ?")
    .bind(id)
    .first<QuestionRow>();
  return row ? mapRow(row) : null;
};

/** Inserts a new question and returns the created row. */
export const createQuestion = async (
  db: D1Database,
  data: QuestionWriteData,
): Promise<Question> => {
  const sql = `INSERT INTO questions (id, difficulty, icon_key, question, options, correct_index, fact, category, created_at, updated_at, used_count, last_used_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL)`;

  await db
    .prepare(sql)
    .bind(
      data.id,
      data.difficulty,
      data.iconKey,
      data.question,
      JSON.stringify(data.options),
      data.correctIndex,
      data.fact,
      data.category,
      data.createdAt,
      data.updatedAt,
    )
    .run();

  const created = await getQuestionById(db, data.id);
  if (!created) {
    throw new Error("Failed to retrieve created question");
  }
  return created;
};

/** Column mapping from camelCase data keys to snake_case DB columns. */
const UPDATE_COLUMN_MAP: ReadonlyArray<readonly [string, string]> = [
  ["difficulty", "difficulty"],
  ["iconKey", "icon_key"],
  ["question", "question"],
  ["options", "options"],
  ["correctIndex", "correct_index"],
  ["fact", "fact"],
  ["category", "category"],
  ["updatedAt", "updated_at"],
];

/** Updates an existing question and returns the updated row. Returns null if not found. */
export const updateQuestion = async (
  db: D1Database,
  id: string,
  data: Partial<Omit<QuestionWriteData, "id" | "createdAt">>,
): Promise<Question | null> => {
  const existing = await getQuestionById(db, id);
  if (!existing) {
    return null;
  }
  const setClauses: string[] = [];
  const bindings: unknown[] = [];
  for (const [key, col] of UPDATE_COLUMN_MAP) {
    const value = (data as Record<string, unknown>)[key];
    if (value !== undefined) {
      setClauses.push(`${col} = ?`);
      bindings.push(key === "options" ? JSON.stringify(value) : value);
    }
  }
  if (setClauses.length === 0) {
    return existing;
  }
  const sql = `UPDATE questions SET ${setClauses.join(", ")} WHERE id = ?`;
  await db
    .prepare(sql)
    .bind(...bindings, id)
    .run();
  return getQuestionById(db, id);
};

/** Deletes a question by ID. Returns true if the row existed. */
export const deleteQuestion = async (db: D1Database, id: string): Promise<boolean> => {
  const existing = await getQuestionById(db, id);
  if (!existing) {
    return false;
  }
  await db.prepare("DELETE FROM questions WHERE id = ?").bind(id).run();
  return true;
};

/** Inserts multiple questions in a batch. Returns the list of created questions. */
export const bulkCreateQuestions = async (
  db: D1Database,
  questions: readonly QuestionWriteData[],
): Promise<readonly Question[]> => {
  const sql = `INSERT INTO questions (id, difficulty, icon_key, question, options, correct_index, fact, category, created_at, updated_at, used_count, last_used_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL)`;

  const stmts = questions.map((q) =>
    db
      .prepare(sql)
      .bind(
        q.id,
        q.difficulty,
        q.iconKey,
        q.question,
        JSON.stringify(q.options),
        q.correctIndex,
        q.fact,
        q.category,
        q.createdAt,
        q.updatedAt,
      ),
  );

  await db.batch(stmts);

  const ids = questions.map((q) => q.id);
  const placeholders = ids.map(() => "?").join(", ");
  const selectSql = `SELECT * FROM questions WHERE id IN (${placeholders}) ORDER BY created_at DESC`;
  const result = await db
    .prepare(selectSql)
    .bind(...ids)
    .all<QuestionRow>();

  return (result.results ?? []).map(mapRow);
};
