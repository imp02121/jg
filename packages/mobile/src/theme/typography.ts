/**
 * Typography constants for The History Gauntlet.
 *
 * Uses system serif fonts matching the antique aesthetic from jsx.md.
 * React Native resolves the first available family in the fallback list.
 */

/**
 * Primary font family stack.
 *
 * On iOS this resolves to a system serif; on Android to Georgia or
 * the closest available serif.  React Native only uses the first
 * matching family, but we keep the list as documentation of the
 * intended rendering cascade.
 */
export const fontFamilySerif = "Palatino Linotype, Book Antiqua, Palatino, Georgia, serif";

/** Individual families for platform-specific StyleSheet usage. */
export const fontFamilyPrimary = "Georgia";
export const fontFamilyFallback = "serif";

/** Named font sizes in logical pixels. */
export const fontSizeXs = 11;
export const fontSizeSm = 12;
export const fontSizeBase = 14;
export const fontSizeMd = 15;
export const fontSizeLg = 16;
export const fontSizeXl = 19;
export const fontSizeXxl = 26;
export const fontSizeXxxl = 30;
export const fontSizeDisplay = 40;
export const fontSizeHero = 48;
export const fontSizeStat = 56;

/** Named font weights. */
export const fontWeightNormal = "400" as const;
export const fontWeightSemibold = "600" as const;
export const fontWeightBold = "700" as const;

/** Letter spacing values used in the prototype. */
export const letterSpacingTight = 0.5;
export const letterSpacingNormal = 1;
export const letterSpacingWide = 1.5;
export const letterSpacingExtraWide = 2;

/** Line height multipliers. */
export const lineHeightTight = 1.3;
export const lineHeightNormal = 1.55;
export const lineHeightRelaxed = 1.6;
export const lineHeightLoose = 1.7;
