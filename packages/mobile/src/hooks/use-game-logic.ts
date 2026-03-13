/**
 * Hook encapsulating the game lifecycle: init, answer, advance, complete.
 *
 * Reads the cached DailyGame from the cache service, initialises the
 * game store, and provides handlers for answer selection, advancing,
 * and completing the game (saving to SQLite and navigating to results).
 */

import { useCallback, useEffect, useRef, useState } from "react";

import type { DifficultyTier, LocalGameResult } from "@history-gauntlet/shared";

import { getCachedGame } from "../services/cache-service";
import { saveResult } from "../services/game-storage";
import { useGameStore } from "../stores/game-store";

/** Debounce window in ms to prevent double-tap on answer. */
const ANSWER_DEBOUNCE_MS = 300;

interface UseGameLogicParams {
  date: string;
  selectedTiers: DifficultyTier[];
  onComplete: (resultId: string) => void;
}

interface UseGameLogicReturn {
  loading: boolean;
  error: string | null;
  handleSelectAnswer: (index: number) => void;
  handleNext: () => void;
}

export function useGameLogic({
  date,
  selectedTiers,
  onComplete,
}: UseGameLogicParams): UseGameLogicReturn {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastAnswerTime = useRef(0);
  const completingRef = useRef(false);

  const startGame = useGameStore((s) => s.startGame);
  const selectAnswer = useGameStore((s) => s.selectAnswer);
  const nextQuestion = useGameStore((s) => s.nextQuestion);
  const isLastQuestionFn = useGameStore((s) => s.isLastQuestion);
  const isRevealed = useGameStore((s) => s.isRevealed);
  const score = useGameStore((s) => s.score);
  const bestStreak = useGameStore((s) => s.bestStreak);
  const buildAnswersFn = useGameStore((s) => s.buildAnswers);
  const elapsedSecondsFn = useGameStore((s) => s.elapsedSeconds);
  const totalQuestionsFn = useGameStore((s) => s.totalQuestions);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const game = await getCachedGame(date);
      if (cancelled) return;

      if (game === null) {
        setError("Game not found. Please go back and try again.");
        setLoading(false);
        return;
      }

      startGame(game, selectedTiers);
      setLoading(false);
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [date, selectedTiers, startGame]);

  const handleSelectAnswer = useCallback(
    (index: number) => {
      const now = Date.now();
      if (now - lastAnswerTime.current < ANSWER_DEBOUNCE_MS) return;
      lastAnswerTime.current = now;
      selectAnswer(index);
    },
    [selectAnswer],
  );

  const handleNext = useCallback(() => {
    if (!isRevealed) return;

    if (isLastQuestionFn()) {
      if (completingRef.current) return;
      completingRef.current = true;
      void completeGame();
    } else {
      nextQuestion();
    }
  }, [isRevealed, isLastQuestionFn, nextQuestion]);

  async function completeGame() {
    const answers = buildAnswersFn();
    const total = totalQuestionsFn();
    const resultId = `${date}-${String(Date.now())}`;

    const result: LocalGameResult = {
      id: resultId,
      date,
      selectedTiers,
      score,
      totalQuestions: total,
      bestStreak,
      answers,
      completedAt: new Date().toISOString(),
      durationSeconds: elapsedSecondsFn(),
    };

    await saveResult(result);
    onComplete(resultId);
  }

  return { loading, error, handleSelectAnswer, handleNext };
}
