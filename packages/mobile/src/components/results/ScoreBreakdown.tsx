/**
 * Score breakdown showing score, best streak, and accuracy as side-by-side cards.
 *
 * Three metric cards in a flex row that wrap on small screens.
 * Each shows a large stat number in display size with a label below in xs uppercase.
 */

import type React from "react";
import { type StyleProp, StyleSheet, Text, View, type ViewStyle } from "react-native";

import { accent, cardBgStart, cardBorder, textMuted } from "../../theme/colors";
import { radiusLg, spacingLg, spacingMd, spacingXl } from "../../theme/spacing";
import {
  fontFamilyPrimary,
  fontSizeDisplay,
  fontSizeXs,
  fontWeightBold,
  letterSpacingWide,
} from "../../theme/typography";

interface ScoreBreakdownProps {
  /** Number of correct answers. */
  score: number;
  /** Total number of questions attempted. */
  totalQuestions: number;
  /** Longest consecutive correct answer streak. */
  bestStreak: number;
  /** Optional style override for the outer container. */
  style?: StyleProp<ViewStyle>;
  /** Test identifier for testing frameworks. */
  testID?: string;
}

function computeAccuracy(score: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((score / total) * 100);
}

interface StatCardProps {
  value: string;
  label: string;
  testID?: string | undefined;
}

const StatCard: React.FC<StatCardProps> = ({ value, label, testID }) => (
  <View style={styles.card} testID={testID}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

export const ScoreBreakdown: React.FC<ScoreBreakdownProps> = ({
  score,
  totalQuestions,
  bestStreak,
  style,
  testID,
}) => {
  const accuracy = computeAccuracy(score, totalQuestions);

  return (
    <View style={[styles.container, style]} testID={testID}>
      <StatCard
        value={`${score}/${totalQuestions}`}
        label="SCORE"
        testID={testID != null ? `${testID}-score` : undefined}
      />
      <StatCard
        value={String(bestStreak)}
        label="BEST STREAK"
        testID={testID != null ? `${testID}-streak` : undefined}
      />
      <StatCard
        value={`${accuracy}%`}
        label="ACCURACY"
        testID={testID != null ? `${testID}-accuracy` : undefined}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacingMd,
  },
  card: {
    flex: 1,
    minWidth: 90,
    backgroundColor: cardBgStart,
    borderWidth: 1,
    borderColor: cardBorder,
    borderRadius: radiusLg,
    paddingVertical: spacingXl,
    paddingHorizontal: spacingLg,
    alignItems: "center",
  },
  statValue: {
    fontFamily: fontFamilyPrimary,
    fontSize: fontSizeDisplay,
    fontWeight: fontWeightBold,
    color: accent,
    marginBottom: spacingMd,
  },
  statLabel: {
    fontFamily: fontFamilyPrimary,
    fontSize: fontSizeXs,
    fontWeight: fontWeightBold,
    color: textMuted,
    letterSpacing: letterSpacingWide,
    textTransform: "uppercase",
  },
});
