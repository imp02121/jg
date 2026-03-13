/**
 * Color palette for The History Gauntlet.
 *
 * All colors are derived from the jsx.md prototype and the shared
 * tier constants. Components must reference these semantic names
 * instead of raw hex values.
 */

/** Background gradient stops, from top-left to bottom-right. */
export const backgroundPrimary = "#1a1410";
export const backgroundSecondary = "#2c2218";
export const backgroundTertiary = "#1e1a14";
export const backgroundDeep = "#0f0d0a";

/** Primary text tones, from brightest to most muted. */
export const textPrimary = "#e8d9b8";
export const textSecondary = "#d4c5a9";
export const textTertiary = "#b0a48a";
export const textMuted = "#887a62";
export const textSubtle = "#665d4d";

/** Accent / interactive gold. */
export const accent = "#8b7355";
export const accentHover = "rgba(139,115,85,0.15)";
export const accentSoft = "rgba(139,115,85,0.1)";
export const accentBorder = "rgba(139,115,85,0.2)";

/** Correct-answer feedback. */
export const correctBg = "rgba(74,124,89,0.3)";
export const correctBorder = "#4a7c59";
export const correctText = "#a8e6b0";

/** Wrong-answer feedback. */
export const wrongBg = "rgba(139,45,45,0.3)";
export const wrongBorder = "#8b2d2d";
export const wrongText = "#e6a8a8";

/** Streak indicator. */
export const streak = "#e8a849";

/** Card surfaces. */
export const cardBgStart = "rgba(58,46,30,0.6)";
export const cardBgEnd = "rgba(30,26,20,0.8)";
export const cardBorder = "#3d3225";

/** Neutral option / button surface. */
export const optionBg = "rgba(42,32,22,0.6)";
export const optionBorder = "#3d3225";

/** Fact reveal surface. */
export const factBg = "rgba(139,115,85,0.1)";
export const factBorder = "#5a4a35";

/** Progress bar track. */
export const progressTrack = "#2a2016";

/** Scrollbar colors. */
export const scrollbarTrack = "#1a1410";
export const scrollbarThumb = "#3d3225";
export const scrollbarThumbHover = "#8b7355";

/** Button surfaces. */
export const buttonBgStart = "#3a2e1e";
export const buttonBgEnd = "#2a2016";

/** White used in check/cross indicators. */
export const white = "#ffffff";

/** Tier colors (mirrored from shared constants for convenience). */
export const tierNoviceBg = "#4a7c59";
export const tierNoviceText = "#e8f5e9";

export const tierApprenticeBg = "#5c6d3f";
export const tierApprenticeText = "#f1f8e9";

export const tierJourneymanBg = "#8d6e3f";
export const tierJourneymanText = "#fff8e1";

export const tierScholarBg = "#8b4513";
export const tierScholarText = "#fbe9e7";

export const tierMasterBg = "#6a1b3a";
export const tierMasterText = "#fce4ec";

export const tierGrandmasterBg = "#1a1a2e";
export const tierGrandmasterText = "#e8eaf6";

/** Convenience record keyed by tier name. */
export const tierColors = {
  Novice: { bg: tierNoviceBg, text: tierNoviceText },
  Apprentice: { bg: tierApprenticeBg, text: tierApprenticeText },
  Journeyman: { bg: tierJourneymanBg, text: tierJourneymanText },
  Scholar: { bg: tierScholarBg, text: tierScholarText },
  Master: { bg: tierMasterBg, text: tierMasterText },
  Grandmaster: { bg: tierGrandmasterBg, text: tierGrandmasterText },
} as const;
