/**
 * Icon registry and barrel export for The History Gauntlet.
 *
 * Every SVG icon component is exported by name and also registered
 * in `ICON_REGISTRY` under its string key.  The registry enables
 * lookup by the `iconKey` strings defined in shared constants.
 */

import type React from "react";
import type { IconProps } from "./types";

export type { IconProps } from "./types";

/* ── Rank icons ────────────────────────────────────────────────── */

export { WheatIcon } from "./WheatIcon";
export { QuillIcon } from "./QuillIcon";
export { BackpackIcon } from "./BackpackIcon";
export { CrownIcon } from "./CrownIcon";
export { ScrollIcon } from "./ScrollIcon";
export { ColumnsIcon } from "./ColumnsIcon";
export { LightningIcon } from "./LightningIcon";
export { CrystalBallIcon } from "./CrystalBallIcon";

/* ── UI icons ──────────────────────────────────────────────────── */

export { CheckIcon } from "./CheckIcon";
export { CrossIcon } from "./CrossIcon";
export { ChevronRightIcon } from "./ChevronRightIcon";
export { ClockIcon } from "./ClockIcon";
export { TrophyIcon } from "./TrophyIcon";
export { StarIcon } from "./StarIcon";

/* ── Category / question icons ─────────────────────────────────── */

export { SwordIcon } from "./SwordIcon";
export { ShieldIcon } from "./ShieldIcon";
export { BookIcon } from "./BookIcon";
export { AnchorIcon } from "./AnchorIcon";
export { GlobeIcon } from "./GlobeIcon";
export { BellIcon } from "./BellIcon";
export { CastleIcon } from "./CastleIcon";
export { MountainIcon } from "./MountainIcon";
export { FlameIcon } from "./FlameIcon";

/* ── Tier shield icons ─────────────────────────────────────────── */

export { ShieldGreenIcon } from "./ShieldGreenIcon";
export { ShieldOliveIcon } from "./ShieldOliveIcon";
export { ShieldAmberIcon } from "./ShieldAmberIcon";
export { ShieldBrownIcon } from "./ShieldBrownIcon";
export { ShieldCrimsonIcon } from "./ShieldCrimsonIcon";
export { ShieldNavyIcon } from "./ShieldNavyIcon";

/* ── Import all for registry ───────────────────────────────────── */

import { BackpackIcon } from "./BackpackIcon";
import { ColumnsIcon } from "./ColumnsIcon";
import { CrownIcon } from "./CrownIcon";
import { CrystalBallIcon } from "./CrystalBallIcon";
import { LightningIcon } from "./LightningIcon";
import { QuillIcon } from "./QuillIcon";
import { ScrollIcon } from "./ScrollIcon";
import { WheatIcon } from "./WheatIcon";

import { CheckIcon } from "./CheckIcon";
import { ChevronRightIcon } from "./ChevronRightIcon";
import { ClockIcon } from "./ClockIcon";
import { CrossIcon } from "./CrossIcon";
import { StarIcon } from "./StarIcon";
import { TrophyIcon } from "./TrophyIcon";

import { AnchorIcon } from "./AnchorIcon";
import { BellIcon } from "./BellIcon";
import { BookIcon } from "./BookIcon";
import { CastleIcon } from "./CastleIcon";
import { FlameIcon } from "./FlameIcon";
import { GlobeIcon } from "./GlobeIcon";
import { MountainIcon } from "./MountainIcon";
import { ShieldIcon } from "./ShieldIcon";
import { SwordIcon } from "./SwordIcon";

import { ShieldAmberIcon } from "./ShieldAmberIcon";
import { ShieldBrownIcon } from "./ShieldBrownIcon";
import { ShieldCrimsonIcon } from "./ShieldCrimsonIcon";
import { ShieldGreenIcon } from "./ShieldGreenIcon";
import { ShieldNavyIcon } from "./ShieldNavyIcon";
import { ShieldOliveIcon } from "./ShieldOliveIcon";

/**
 * Registry mapping `iconKey` strings to their icon components.
 *
 * Keys match those used in `shared/constants/ranks.ts` (rank icons)
 * and `shared/constants/difficulties.ts` (tier shield icons).
 */
export const ICON_REGISTRY: Record<string, React.ComponentType<IconProps>> = {
  /* Rank icon keys */
  wheat: WheatIcon,
  quill: QuillIcon,
  backpack: BackpackIcon,
  crown: CrownIcon,
  scroll: ScrollIcon,
  columns: ColumnsIcon,
  lightning: LightningIcon,
  "crystal-ball": CrystalBallIcon,

  /* UI icon keys */
  check: CheckIcon,
  cross: CrossIcon,
  "chevron-right": ChevronRightIcon,
  clock: ClockIcon,
  trophy: TrophyIcon,
  star: StarIcon,

  /* Category / question icon keys */
  sword: SwordIcon,
  shield: ShieldIcon,
  book: BookIcon,
  anchor: AnchorIcon,
  globe: GlobeIcon,
  bell: BellIcon,
  castle: CastleIcon,
  mountain: MountainIcon,
  flame: FlameIcon,

  /* Tier shield icon keys */
  "shield-green": ShieldGreenIcon,
  "shield-olive": ShieldOliveIcon,
  "shield-amber": ShieldAmberIcon,
  "shield-brown": ShieldBrownIcon,
  "shield-crimson": ShieldCrimsonIcon,
  "shield-navy": ShieldNavyIcon,
};
