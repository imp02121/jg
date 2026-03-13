/**
 * Per-tier performance bars showing correct/total for each played tier.
 *
 * Only displays tiers that were selected for the game session.
 * Each row shows a DifficultyBadge on the left, "X/Y" on the right,
 * and a progress bar below colored with the tier's background color.
 */

import type React from "react";
import { type StyleProp, StyleSheet, Text, View, type ViewStyle } from "react-native";

import type { DifficultyTier } from "@history-gauntlet/shared";
import { TIER_BY_KEY } from "@history-gauntlet/shared";

import { progressTrack, textPrimary } from "../../theme/colors";
import { radiusSm, spacingLg, spacingSm, tierProgressHeight } from "../../theme/spacing";
import { fontFamilyPrimary, fontSizeSm, fontWeightBold } from "../../theme/typography";
import { DifficultyBadge } from "../common/DifficultyBadge";

/** Correct/total counts for a single tier. */
interface TierResult {
  readonly correct: number;
  readonly total: number;
}

interface TierPerformanceProps {
  /** Per-tier results keyed by DifficultyTier. */
  performance: Record<DifficultyTier, TierResult>;
  /** Only these tiers will be displayed. */
  selectedTiers: DifficultyTier[];
  /** Optional style override for the outer container. */
  style?: StyleProp<ViewStyle>;
  /** Test identifier for testing frameworks. */
  testID?: string;
}

interface TierRowProps {
  tier: DifficultyTier;
  correct: number;
  total: number;
  testID?: string | undefined;
}

const TierRow: React.FC<TierRowProps> = ({ tier, correct, total, testID }) => {
  const tierDef = TIER_BY_KEY[tier];
  const pct = total > 0 ? (correct / total) * 100 : 0;

  return (
    <View style={styles.row} testID={testID}>
      <View style={styles.rowHeader}>
        <DifficultyBadge tier={tier} size="sm" />
        <Text style={styles.fraction}>
          {correct}/{total}
        </Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              width: `${pct}%`,
              backgroundColor: tierDef.bgColor,
            },
          ]}
        />
      </View>
    </View>
  );
};

export const TierPerformance: React.FC<TierPerformanceProps> = ({
  performance,
  selectedTiers,
  style,
  testID,
}) => (
  <View style={[styles.container, style]} testID={testID}>
    {selectedTiers.map((tier) => {
      const result = performance[tier];
      return (
        <TierRow
          key={tier}
          tier={tier}
          correct={result.correct}
          total={result.total}
          testID={testID != null ? `${testID}-${tier}` : undefined}
        />
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  container: {
    gap: spacingLg,
  },
  row: {
    gap: spacingSm,
  },
  rowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fraction: {
    fontFamily: fontFamilyPrimary,
    fontSize: fontSizeSm,
    fontWeight: fontWeightBold,
    color: textPrimary,
  },
  track: {
    height: tierProgressHeight,
    backgroundColor: progressTrack,
    borderRadius: radiusSm,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: radiusSm,
  },
});
