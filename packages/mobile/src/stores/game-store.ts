/**
 * Zustand store managing all in-flight game state.
 *
 * Tracks current question index, selected answer, reveal state,
 * score, streak, per-question timing, and the built question list.
 */

import type {
  DailyGame,
  DifficultyTier,
  GameQuestion,
  LocalAnswer,
} from "@history-gauntlet/shared";
import { DIFFICULTY_TIERS } from "@history-gauntlet/shared";
import { create } from "zustand";

/** Snapshot of an answered question used to build LocalAnswer[] on completion. */
interface AnswerRecord {
  readonly questionId: string;
  readonly difficulty: DifficultyTier;
  readonly selectedIndex: number;
  readonly correct: boolean;
  readonly timeSpentMs: number;
}

interface GameState {
  /** The daily game being played (null before start). */
  dailyGame: DailyGame | null;
  /** Flat, ordered list of questions derived from selected tiers. */
  questions: GameQuestion[];
  /** Which tiers the player selected for this session. */
  selectedTiers: DifficultyTier[];

  /** Index into `questions` for the current question. */
  currentQuestionIndex: number;
  /** Index of the answer the player selected, or null if unanswered. */
  selectedAnswer: number | null;
  /** Whether the correct/incorrect state has been revealed. */
  isRevealed: boolean;

  /** Running score (correct answers). */
  score: number;
  /** Current consecutive-correct streak. */
  streak: number;
  /** Best streak achieved during this game. */
  bestStreak: number;

  /** Per-question answer records accumulated during play. */
  answers: AnswerRecord[];

  /** Epoch ms when the game was started. */
  startTime: number;
  /** Epoch ms when the current question was first shown. */
  questionStartTime: number;
}

interface GameActions {
  /** Initialise a new game session from a DailyGame and tier selection. */
  startGame: (game: DailyGame, tiers: DifficultyTier[]) => void;
  /** Record the player's answer choice and reveal correctness. */
  selectAnswer: (index: number) => void;
  /** Advance to the next question (or mark game complete). */
  nextQuestion: () => void;
  /** Reset all game state back to initial values. */
  resetGame: () => void;
}

/** Derived / computed helpers that read from state. */
interface GameComputed {
  currentQuestion: () => GameQuestion | null;
  totalQuestions: () => number;
  isLastQuestion: () => boolean;
  isGameComplete: () => boolean;
  buildAnswers: () => LocalAnswer[];
  elapsedSeconds: () => number;
}

export type GameStore = GameState & GameActions & GameComputed;

const INITIAL_STATE: GameState = {
  dailyGame: null,
  questions: [],
  selectedTiers: [],
  currentQuestionIndex: 0,
  selectedAnswer: null,
  isRevealed: false,
  score: 0,
  streak: 0,
  bestStreak: 0,
  answers: [],
  startTime: 0,
  questionStartTime: 0,
};

/**
 * Build an ordered question list from a DailyGame, filtered to selected tiers.
 * Questions are ordered by tier sort order (Novice first, Grandmaster last).
 */
function buildQuestionList(game: DailyGame, tiers: DifficultyTier[]): GameQuestion[] {
  const tierSet = new Set(tiers);
  const sorted = [...DIFFICULTY_TIERS]
    .filter((td) => tierSet.has(td.key))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const result: GameQuestion[] = [];
  for (const td of sorted) {
    const tierQuestions = game.questionsByTier[td.key];
    if (tierQuestions !== undefined) {
      result.push(...tierQuestions);
    }
  }
  return result;
}

export const useGameStore = create<GameStore>()((set, get) => ({
  ...INITIAL_STATE,

  startGame(game, tiers) {
    const questions = buildQuestionList(game, tiers);
    const now = Date.now();
    set({
      ...INITIAL_STATE,
      dailyGame: game,
      questions,
      selectedTiers: tiers,
      startTime: now,
      questionStartTime: now,
    });
  },

  selectAnswer(index: number) {
    const state = get();
    // Prevent double-tap / answering after reveal
    if (state.isRevealed || state.selectedAnswer !== null) return;
    const question = state.questions[state.currentQuestionIndex];
    if (question === undefined) return;

    const correct = index === question.correctIndex;
    const timeSpentMs = Date.now() - state.questionStartTime;
    const newStreak = correct ? state.streak + 1 : 0;
    const newBestStreak = Math.max(state.bestStreak, newStreak);

    const answer: AnswerRecord = {
      questionId: question.id,
      difficulty: question.difficulty,
      selectedIndex: index,
      correct,
      timeSpentMs,
    };

    set({
      selectedAnswer: index,
      isRevealed: true,
      score: correct ? state.score + 1 : state.score,
      streak: newStreak,
      bestStreak: newBestStreak,
      answers: [...state.answers, answer],
    });
  },

  nextQuestion() {
    const state = get();
    const nextIdx = state.currentQuestionIndex + 1;
    set({
      currentQuestionIndex: nextIdx,
      selectedAnswer: null,
      isRevealed: false,
      questionStartTime: Date.now(),
    });
  },

  resetGame() {
    set({ ...INITIAL_STATE });
  },

  // Computed getters
  currentQuestion(): GameQuestion | null {
    const { questions, currentQuestionIndex } = get();
    return questions[currentQuestionIndex] ?? null;
  },

  totalQuestions(): number {
    return get().questions.length;
  },

  isLastQuestion(): boolean {
    const { questions, currentQuestionIndex } = get();
    return currentQuestionIndex >= questions.length - 1;
  },

  isGameComplete(): boolean {
    const { questions, answers } = get();
    return answers.length >= questions.length && questions.length > 0;
  },

  buildAnswers(): LocalAnswer[] {
    return get().answers.map((a) => ({
      questionId: a.questionId,
      difficulty: a.difficulty,
      selectedIndex: a.selectedIndex,
      correct: a.correct,
      timeSpentMs: a.timeSpentMs,
    }));
  },

  elapsedSeconds(): number {
    const { startTime } = get();
    if (startTime === 0) return 0;
    return Math.round((Date.now() - startTime) / 1000);
  },
}));
