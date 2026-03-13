-- 001_initial.sql
--
-- Initial D1 migration for The History Gauntlet.
-- Creates the questions table, game_metadata table, and supporting indexes.

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  difficulty TEXT NOT NULL,
  icon_key TEXT NOT NULL,
  question TEXT NOT NULL,
  options TEXT NOT NULL,          -- JSON array of 4 strings
  correct_index INTEGER NOT NULL,
  fact TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  used_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TEXT
);

CREATE TABLE IF NOT EXISTS game_metadata (
  date TEXT PRIMARY KEY,          -- YYYY-MM-DD
  total_questions INTEGER NOT NULL,
  questions_by_difficulty TEXT NOT NULL, -- JSON object
  generated_at TEXT NOT NULL,
  r2_key TEXT NOT NULL
);

-- Indexes for efficient question selection during game generation
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_used_count ON questions(used_count);
CREATE INDEX IF NOT EXISTS idx_questions_last_used ON questions(last_used_at);
