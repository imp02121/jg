/**
 * Barrel export for the History Gauntlet theme system.
 *
 * Import individual tokens or the combined `theme` object:
 *
 *   import { theme } from '../theme';
 *   import { accent, fontSizeXl } from '../theme';
 */

export * from "./colors";
export * from "./typography";
export * from "./spacing";

import * as colors from "./colors";
import * as spacing from "./spacing";
import * as typography from "./typography";

/** Combined theme object for convenience. */
export const theme = {
  colors,
  typography,
  spacing,
} as const;
