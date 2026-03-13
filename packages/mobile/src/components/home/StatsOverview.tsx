/**
 * Compact stats overview card for the home screen.
 *
 * Displays key all-time statistics in a grid layout.
 */

import type React from "react";
import { type StyleProp, StyleSheet, Text, View, type ViewStyle } from "react-native";

import type { AllTimeStats } from "../../services/stats-service";

import { accent, cardBgStart, cardBorder, textMuted, textPrimary } from "../../theme/colors";
import { radiusLg, spacingLg, spacingMd, spacingSm, spacingXl } from "../../theme/spacing";
import {
  fontFamilyPrimary,
  fontSizeBase,
  fontSizeLg,
  fontSizeXs,
  fontWeightBold,
  fontWeightSemibold,
  letterSpacingNormal,
  letterSpacingWide,
} from "../../theme/typography";
import { StarIcon } from "../icons";

interface StatsOverviewProps {
  /** All-time aggregate statistics. */
  stats: AllTimeStats;
  /** Optional style override for the outer container. */
  style?: StyleProp<ViewStyle>;
  /** Test identifier for testing frameworks. */
  testID?: string;
}

interface StatItemProps {
  label: string;
  value: string;
}

const StatItem: React.FC<StatItemProps> = ({ label, value }) => (
  <View style={styles.statItem}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

export const StatsOverview: React.FC<StatsOverviewProps> = ({ stats, style, testID }) => (
  <View style={[styles.container, style]} testID={testID}>
    <View style={styles.header}>
      <StarIcon size={16} color={accent} />
      <Text style={styles.headerText}>Your Stats</Text>
    </View>

    <View style={styles.grid}>
      <StatItem label="Games" value={String(stats.totalGames)} />
      <StatItem
        label="Avg Score"
        value={stats.totalGames > 0 ? stats.averageScore.toFixed(1) : "0"}
      />
      <StatItem label="Best Score" value={String(stats.bestScore)} />
      <StatItem label="Best Streak" value={String(stats.longestStreak)} />
      <StatItem label="Questions" value={String(stats.totalQuestionsAnswered)} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: cardBgStart,
    borderWidth: 1,
    borderColor: cardBorder,
    borderRadius: radiusLg,
    paddingVertical: spacingXl,
    paddingHorizontal: spacingXl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingMd,
    marginBottom: spacingLg,
  },
  headerText: {
    fontFamily: fontFamilyPrimary,
    fontSize: fontSizeLg,
    fontWeight: fontWeightSemibold,
    color: textPrimary,
    letterSpacing: letterSpacingNormal,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacingLg,
    justifyContent: "space-between",
  },
  statItem: {
    minWidth: 80,
    alignItems: "center",
  },
  statValue: {
    fontFamily: fontFamilyPrimary,
    fontSize: fontSizeBase,
    fontWeight: fontWeightBold,
    color: accent,
    marginBottom: spacingSm,
  },
  statLabel: {
    fontFamily: fontFamilyPrimary,
    fontSize: fontSizeXs,
    color: textMuted,
    letterSpacing: letterSpacingWide,
    textTransform: "uppercase",
  },
});
