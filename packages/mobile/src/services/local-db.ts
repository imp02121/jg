/**
 * SQLite database initialization and migration for The History Gauntlet.
 *
 * Opens/creates the local database, creates tables on first run,
 * and tracks schema versions for future migrations.
 */

import { type SQLiteDatabase, openDatabaseAsync } from "expo-sqlite";

/** Current schema version. Increment when adding migrations. */
const CURRENT_SCHEMA_VERSION = 1;

/** Database file name. */
const DATABASE_NAME = "history-gauntlet.db";

/** Singleton database instance. */
let dbInstance: SQLiteDatabase | null = null;

/**
 * Get the database instance, initializing it on first call.
 *
 * This is the single entry point for all database access. It ensures
 * tables and indexes exist before returning the connection.
 */
export async function getDatabase(): Promise<SQLiteDatabase> {
  if (dbInstance !== null) {
    return dbInstance;
  }

  const db = await openDatabaseAsync(DATABASE_NAME);
  await runMigrations(db);
  dbInstance = db;
  return db;
}

/**
 * Run all necessary migrations to bring the database up to CURRENT_SCHEMA_VERSION.
 */
async function runMigrations(db: SQLiteDatabase): Promise<void> {
  const currentVersion = await getSchemaVersion(db);

  if (currentVersion < 1) {
    await migrateToV1(db);
  }

  // Future migrations go here:
  // if (currentVersion < 2) { await migrateToV2(db); }

  await setSchemaVersion(db, CURRENT_SCHEMA_VERSION);
}

/**
 * V1 migration: create the initial tables and indexes.
 */
async function migrateToV1(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS game_results (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      selected_tiers TEXT NOT NULL,
      score INTEGER NOT NULL,
      total_questions INTEGER NOT NULL,
      best_streak INTEGER NOT NULL,
      answers TEXT NOT NULL,
      completed_at TEXT NOT NULL,
      duration_seconds INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_game_results_date ON game_results(date);
  `);
}

/**
 * Read the current schema version from the settings table.
 * Returns 0 if the settings table does not exist yet.
 */
async function getSchemaVersion(db: SQLiteDatabase): Promise<number> {
  try {
    const row = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = ?",
      ["schema_version"],
    );
    if (row === null) {
      return 0;
    }
    const parsed = Number(row.value);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    // Table doesn't exist yet — this is a fresh database.
    return 0;
  }
}

/**
 * Write the schema version to the settings table.
 */
async function setSchemaVersion(db: SQLiteDatabase, version: number): Promise<void> {
  await db.runAsync("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [
    "schema_version",
    String(version),
  ]);
}

/**
 * Close the database connection and clear the singleton.
 * Primarily useful for testing.
 */
export async function closeDatabase(): Promise<void> {
  if (dbInstance !== null) {
    await dbInstance.closeAsync();
    dbInstance = null;
  }
}
