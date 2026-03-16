/**
 * Computed statistics derived from stored game results.
 *
 * All functions return sensible defaults (zeros) when no data exists.
 */

import type { DifficultyTier, LocalGameResult } from "@history-gauntlet/shared";
import { getAllResults } from "./game-storage";

/** Aggregate stats across all games ever played. */
export interface AllTimeStats {
  readonly totalGames: number;
  /** Average accuracy as a percentage (0-100). */
  readonly averageAccuracy: number;
  /** Best single-game accuracy as a percentage (0-100). */
  readonly bestAccuracy: number;
  readonly longestStreak: number;
  readonly totalQuestionsAnswered: number;
  /** Current daily streak (consecutive days played). */
  readonly dailyStreak: number;
}

/** Per-tier accuracy statistics. */
export interface TierStats {
  readonly tier: DifficultyTier;
  readonly totalQuestions: number;
  readonly correctAnswers: number;
  readonly accuracy: number;
}

/**
 * Calculate all-time aggregate statistics.
 * Returns zeros for all fields when no games have been played.
 */
export async function getAllTimeStats(): Promise<AllTimeStats> {
  const results = await getAllResults();

  if (results.length === 0) {
    return {
      totalGames: 0,
      averageAccuracy: 0,
      bestAccuracy: 0,
      longestStreak: 0,
      totalQuestionsAnswered: 0,
      dailyStreak: 0,
    };
  }

  let totalAccuracy = 0;
  let bestAccuracy = 0;
  let longestStreak = 0;
  let totalQuestionsAnswered = 0;

  for (const result of results) {
    const accuracy = result.totalQuestions > 0 ? (result.score / result.totalQuestions) * 100 : 0;
    totalAccuracy += accuracy;
    if (accuracy > bestAccuracy) {
      bestAccuracy = accuracy;
    }
    if (result.bestStreak > longestStreak) {
      longestStreak = result.bestStreak;
    }
    totalQuestionsAnswered += result.totalQuestions;
  }

  const dailyStreak = computeDailyStreak(results);

  return {
    totalGames: results.length,
    averageAccuracy: totalAccuracy / results.length,
    bestAccuracy,
    longestStreak,
    totalQuestionsAnswered,
    dailyStreak,
  };
}

/**
 * Compute current daily streak from results without an extra DB query.
 */
function computeDailyStreak(results: LocalGameResult[]): number {
  const playedDates = new Set<string>();
  for (const result of results) {
    playedDates.add(result.date);
  }

  const today = new Date();
  let streak = 0;
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  while (playedDates.has(formatDate(current))) {
    streak += 1;
    current.setDate(current.getDate() - 1);
  }

  return streak;
}

/**
 * Calculate accuracy statistics for a specific difficulty tier.
 * Examines the answers array of every game result.
 */
export async function getStatsByTier(tier: DifficultyTier): Promise<TierStats> {
  const results = await getAllResults();

  let totalQuestions = 0;
  let correctAnswers = 0;

  for (const result of results) {
    for (const answer of result.answers) {
      if (answer.difficulty === tier) {
        totalQuestions += 1;
        if (answer.correct) {
          correctAnswers += 1;
        }
      }
    }
  }

  return {
    tier,
    totalQuestions,
    correctAnswers,
    accuracy: totalQuestions > 0 ? correctAnswers / totalQuestions : 0,
  };
}

/**
 * Get the best game result by score.
 * When multiple games share the highest score, the most recently completed wins.
 * Returns null if no games have been played.
 */
export async function getBestGame(): Promise<LocalGameResult | null> {
  const results = await getAllResults();

  if (results.length === 0) {
    return null;
  }

  const firstResult = results[0];
  if (firstResult === undefined) {
    return null;
  }
  let best: LocalGameResult = firstResult;
  for (const result of results) {
    if (
      result.score > best.score ||
      (result.score === best.score && result.completedAt > best.completedAt)
    ) {
      best = result;
    }
  }

  return best;
}

/**
 * Calculate the current daily streak -- the number of consecutive days
 * going backwards from today where the player completed at least one game.
 *
 * A gap of even one day resets the streak.
 */
export async function getCurrentDailyStreak(): Promise<number> {
  const results = await getAllResults();

  if (results.length === 0) {
    return 0;
  }

  // Collect unique dates the player has played.
  const playedDates = new Set<string>();
  for (const result of results) {
    playedDates.add(result.date);
  }

  // Walk backwards from today, counting consecutive days.
  const today = new Date();
  let streak = 0;
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  while (true) {
    const dateStr = formatDate(current);
    if (!playedDates.has(dateStr)) {
      break;
    }
    streak += 1;
    current.setDate(current.getDate() - 1);
  }

  return streak;
}

/**
 * Format a Date as YYYY-MM-DD string.
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
