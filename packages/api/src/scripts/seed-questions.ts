/**
 * Seed script — imports all 35 original questions into the API via the
 * admin bulk import endpoint.
 *
 * Idempotent: checks existing question count before importing.
 * Run with:  npx tsx packages/api/src/scripts/seed-questions.ts
 */

import type { CreateQuestionRequest } from "@history-gauntlet/shared";
import { SEED_QUESTIONS as SEED_QUESTIONS_BASIC } from "./question-data";
import { SEED_QUESTIONS_ADVANCED } from "./question-data-advanced";

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:8787";

/** Combined list of all 35 seed questions. */
const ALL_QUESTIONS: readonly CreateQuestionRequest[] = [
  ...SEED_QUESTIONS_BASIC,
  ...SEED_QUESTIONS_ADVANCED,
];

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

interface ListResponse {
  readonly total: number;
}

interface BulkResponse {
  readonly imported: number;
  readonly errors: readonly { readonly index: number; readonly error: string }[];
}

async function fetchExistingCount(): Promise<number> {
  const res = await fetch(`${API_BASE}/api/admin/questions?limit=1`);
  if (!res.ok) {
    throw new Error(`Failed to list questions: ${String(res.status)}`);
  }
  const body = (await res.json()) as ListResponse;
  return body.total;
}

async function importQuestions(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/admin/questions/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questions: ALL_QUESTIONS }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bulk import failed (${String(res.status)}): ${text}`);
  }

  const body = (await res.json()) as BulkResponse;

  if (body.errors.length > 0) {
    for (const err of body.errors) {
      const q = ALL_QUESTIONS[err.index];
      const label = q ? q.question.slice(0, 40) : `index ${String(err.index)}`;
      process.stderr.write(`  Error at "${label}": ${err.error}\n`);
    }
  }

  process.stdout.write(
    `Imported ${String(body.imported)} questions (${String(body.errors.length)} errors).\n`,
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  process.stdout.write(`Seeding questions to ${API_BASE}...\n`);

  const existingCount = await fetchExistingCount();
  if (existingCount >= ALL_QUESTIONS.length) {
    process.stdout.write(
      `Already ${String(existingCount)} questions in the database (>= ${String(ALL_QUESTIONS.length)}). Skipping import.\n`,
    );
    return;
  }

  await importQuestions();
  process.stdout.write("Done.\n");
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Seed failed: ${message}\n`);
  process.exit(1);
});
