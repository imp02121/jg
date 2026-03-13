/**
 * Seed script — generates the first daily game for today's date.
 *
 * Must be run after seed-questions.ts has populated the question bank.
 * Run with:  npx tsx packages/api/src/scripts/seed-daily-game.ts
 */

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:8787";

interface GenerateResponse {
  readonly date: string;
}

interface ErrorResponse {
  readonly error: string;
}

/**
 * Return today's date in YYYY-MM-DD format (UTC).
 */
function todayUTC(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return `${String(year)}-${month}-${day}`;
}

async function main(): Promise<void> {
  const date = process.env.GAME_DATE ?? todayUTC();

  process.stdout.write(`Generating daily game for ${date} at ${API_BASE}...\n`);

  const res = await fetch(`${API_BASE}/api/admin/games/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date }),
  });

  if (!res.ok) {
    let detail = "";
    try {
      const body = (await res.json()) as ErrorResponse;
      detail = body.error;
    } catch {
      detail = await res.text();
    }
    throw new Error(`Game generation failed (${String(res.status)}): ${detail}`);
  }

  const body = (await res.json()) as GenerateResponse;
  process.stdout.write(`Daily game generated for ${body.date}.\n`);
  process.stdout.write("Done.\n");
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Seed failed: ${message}\n`);
  process.exit(1);
});
