/**
 * Header bar showing question counter, streak, and score.
 *
 * Layout: "QUESTION X / Y" on the left, streak (if >= 3) and score on the right.
 */

import type React from "react";
import { type StyleProp, StyleSheet, Text, View, type ViewStyle } from "react-native";

import { textMuted, textPrimary } from "../../theme/colors";
import { spacingXl } from "../../theme/spacing";
import { fontSizeSm, fontWeightBold, letterSpacingNormal } from "../../theme/typography";
import { StreakIndicator } from "./StreakIndicator";

interface ScoreHeaderProps {
  /** Current question number (1-based). */
  currentQuestion: number;
  /** Total number of questions. */
  totalQuestions: number;
  /** Player's current score. */
  score: number;
  /** Player's current streak count. */
  streak: number;
  /** Optional style override for the outer container. */
  style?: StyleProp<ViewStyle>;
  /** Test identifier for testing frameworks. */
  testID?: string;
}

export const ScoreHeader: React.FC<ScoreHeaderProps> = ({
  currentQuestion,
  totalQuestions,
  score,
  streak,
  style,
  testID,
}) => (
  <View style={[styles.container, style]} testID={testID}>
    <Text style={styles.counter}>
      QUESTION {currentQuestion} / {totalQuestions}
    </Text>
    <View style={styles.right}>
      <StreakIndicator streak={streak} />
      <Text style={styles.scoreLabel}>
        Score: <Text style={styles.scoreValue}>{score}</Text>
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  counter: {
    fontSize: fontSizeSm,
    color: textMuted,
    letterSpacing: letterSpacingNormal,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingXl,
  },
  scoreLabel: {
    fontSize: fontSizeSm,
    color: textMuted,
  },
  scoreValue: {
    color: textPrimary,
    fontWeight: fontWeightBold,
  },
});
