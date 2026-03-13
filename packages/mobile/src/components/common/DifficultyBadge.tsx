/**
 * Pill-shaped badge displaying a difficulty tier name with tier colors.
 *
 * Uses TIER_BY_KEY from shared constants to resolve colors by tier key.
 */

import type React from "react";
import { type StyleProp, StyleSheet, Text, View, type ViewStyle } from "react-native";

import type { DifficultyTier } from "@history-gauntlet/shared";
import { TIER_BY_KEY } from "@history-gauntlet/shared";

import { radiusPill, spacingLg, spacingXs } from "../../theme/spacing";
import { fontSizeXs, fontWeightBold, letterSpacingWide } from "../../theme/typography";

interface DifficultyBadgeProps {
  /** The difficulty tier to display. */
  tier: DifficultyTier;
  /** Badge size variant. */
  size?: "sm" | "md";
  /** Optional style override for the outer container. */
  style?: StyleProp<ViewStyle>;
  /** Test identifier for testing frameworks. */
  testID?: string;
}

export const DifficultyBadge: React.FC<DifficultyBadgeProps> = ({
  tier,
  size = "md",
  style,
  testID,
}) => {
  const tierDef = TIER_BY_KEY[tier];
  const isSmall = size === "sm";

  return (
    <View
      style={[
        styles.badge,
        isSmall ? styles.badgeSm : styles.badgeMd,
        { backgroundColor: tierDef.bgColor },
        style,
      ]}
      testID={testID}
    >
      <Text
        style={[
          styles.label,
          isSmall ? styles.labelSm : styles.labelMd,
          { color: tierDef.textColor },
        ]}
      >
        {tierDef.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: radiusPill,
    alignSelf: "flex-start",
  },
  badgeSm: {
    paddingVertical: spacingXs,
    paddingHorizontal: spacingLg - 2,
  },
  badgeMd: {
    paddingVertical: spacingXs + 2,
    paddingHorizontal: spacingLg + 2,
  },
  label: {
    fontWeight: fontWeightBold,
    letterSpacing: letterSpacingWide,
    textTransform: "uppercase",
  },
  labelSm: {
    fontSize: fontSizeXs - 2,
  },
  labelMd: {
    fontSize: fontSizeXs,
  },
});
