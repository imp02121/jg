/**
 * Navigation type definitions for The History Gauntlet.
 *
 * Defines the root stack parameter list and typed screen props
 * for all six screens in the app.
 */

import type { DifficultyTier } from "@history-gauntlet/shared";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

/**
 * Root stack parameter list.
 *
 * Each key corresponds to a screen name, and the value is either
 * `undefined` (no params) or an object describing required params.
 */
export type RootStackParamList = {
  Splash: undefined;
  Home: undefined;
  DifficultySelect: undefined;
  Game: {
    /** The date of the daily game in YYYY-MM-DD format. */
    date: string;
    /** The difficulty tiers the user selected to play. */
    selectedTiers: DifficultyTier[];
  };
  Results: {
    /** The ID of the completed game result stored in local DB. */
    resultId: string;
  };
  History: undefined;
};

/** Typed navigation props for the Splash screen. */
export type SplashScreenProps = NativeStackScreenProps<RootStackParamList, "Splash">;

/** Typed navigation props for the Home screen. */
export type HomeScreenProps = NativeStackScreenProps<RootStackParamList, "Home">;

/** Typed navigation props for the DifficultySelect screen. */
export type DifficultySelectScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "DifficultySelect"
>;

/** Typed navigation props for the Game screen. */
export type GameScreenProps = NativeStackScreenProps<RootStackParamList, "Game">;

/** Typed navigation props for the Results screen. */
export type ResultsScreenProps = NativeStackScreenProps<RootStackParamList, "Results">;

/** Typed navigation props for the History screen. */
export type HistoryScreenProps = NativeStackScreenProps<RootStackParamList, "History">;
