/**
 * Rank display component showing the earned rank icon, title, and description.
 *
 * Renders the rank SVG icon at 48px with the rank title in xxl text,
 * the description below in base size, and OrnamentDividers above and below.
 */

import type React from "react";
import { type StyleProp, StyleSheet, Text, View, type ViewStyle } from "react-native";

import type { RankDefinition } from "@history-gauntlet/shared";

import { textPrimary, textSecondary } from "../../theme/colors";
import { spacingLg, spacingMd } from "../../theme/spacing";
import {
  fontFamilyPrimary,
  fontSizeBase,
  fontSizeXxl,
  fontWeightBold,
  letterSpacingWide,
  lineHeightNormal,
} from "../../theme/typography";
import { OrnamentDivider } from "../common/OrnamentDivider";
import { ICON_REGISTRY } from "../icons";

interface RankDisplayProps {
  /** The rank earned by the player. */
  rank: RankDefinition;
  /** Optional style override for the outer container. */
  style?: StyleProp<ViewStyle>;
  /** Test identifier for testing frameworks. */
  testID?: string;
}

export const RankDisplay: React.FC<RankDisplayProps> = ({ rank, style, testID }) => {
  const IconComponent = ICON_REGISTRY[rank.iconKey];

  return (
    <View style={[styles.container, style]} testID={testID}>
      <OrnamentDivider width={120} style={styles.divider} />

      {IconComponent != null && (
        <View style={styles.iconWrapper}>
          <IconComponent size={48} color={textPrimary} />
        </View>
      )}

      <Text style={styles.title}>{rank.title}</Text>
      <Text style={styles.description}>{rank.description}</Text>

      <OrnamentDivider width={120} style={styles.divider} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  iconWrapper: {
    marginBottom: spacingMd,
  },
  title: {
    fontFamily: fontFamilyPrimary,
    fontSize: fontSizeXxl,
    fontWeight: fontWeightBold,
    color: textPrimary,
    letterSpacing: letterSpacingWide,
    textAlign: "center",
    marginBottom: spacingMd,
  },
  description: {
    fontFamily: fontFamilyPrimary,
    fontSize: fontSizeBase,
    color: textSecondary,
    textAlign: "center",
    lineHeight: fontSizeBase * lineHeightNormal,
  },
  divider: {
    marginVertical: spacingLg,
  },
});
