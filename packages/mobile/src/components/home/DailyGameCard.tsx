/**
 * Home screen card showing today's daily game status.
 *
 * Supports three states:
 * - "ready": prompts the player to start today's challenge
 * - "in-progress": indicates a game is currently underway
 * - "completed": shows the player's score summary
 */

import type React from "react";
import { type StyleProp, StyleSheet, Text, View, type ViewStyle } from "react-native";

import { accent, correctText, textMuted, textPrimary, textSecondary } from "../../theme/colors";
import { spacingMd } from "../../theme/spacing";
import {
  fontFamilyPrimary,
  fontSizeBase,
  fontSizeLg,
  fontSizeSm,
  fontSizeXl,
  fontWeightBold,
  fontWeightSemibold,
  letterSpacingNormal,
  letterSpacingWide,
} from "../../theme/typography";
import { Card } from "../common/Card";
import { GauntletButton } from "../common/GauntletButton";
import { TrophyIcon } from "../icons";

type GameState = "ready" | "in-progress" | "completed";

interface DailyGameCardProps {
  /** Current state of today's game. */
  state: GameState;
  /** Date string for display (e.g. "March 13, 2026"). */
  date: string;
  /** Player's score, shown in completed state. */
  score?: number | undefined;
  /** Total questions, shown in completed state. */
  totalQuestions?: number | undefined;
  /** Handler invoked when the card action is pressed. */
  onPress: () => void;
  /** Optional style override for the outer container. */
  style?: StyleProp<ViewStyle>;
  /** Test identifier for testing frameworks. */
  testID?: string;
}

const ReadyContent: React.FC<{ date: string; onPress: () => void }> = ({ date, onPress }) => (
  <View style={styles.content}>
    <Text style={styles.dateLabel}>{date}</Text>
    <Text style={styles.title}>Today's Challenge</Text>
    <Text style={styles.subtitle}>Test your knowledge of history</Text>
    <GauntletButton
      title="PLAY"
      onPress={onPress}
      variant="primary"
      style={styles.button}
      testID="daily-game-play-btn"
    />
  </View>
);

const InProgressContent: React.FC<{ date: string; onPress: () => void }> = ({ date, onPress }) => (
  <View style={styles.content}>
    <Text style={styles.dateLabel}>{date}</Text>
    <Text style={styles.title}>Game In Progress</Text>
    <Text style={styles.subtitle}>Continue where you left off</Text>
    <GauntletButton
      title="CONTINUE"
      onPress={onPress}
      variant="secondary"
      style={styles.button}
      testID="daily-game-continue-btn"
    />
  </View>
);

const CompletedContent: React.FC<{
  date: string;
  score: number;
  totalQuestions: number;
  onPress: () => void;
}> = ({ date, score, totalQuestions, onPress }) => {
  const accuracy = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

  return (
    <View style={styles.content}>
      <Text style={styles.dateLabel}>{date}</Text>
      <View style={styles.completedRow}>
        <TrophyIcon size={24} color={accent} />
        <Text style={styles.completedTitle}>Completed</Text>
      </View>
      <Text style={styles.scoreText}>
        {score}/{totalQuestions} ({accuracy}%)
      </Text>
      <GauntletButton
        title="VIEW RESULTS"
        onPress={onPress}
        variant="secondary"
        style={styles.button}
        testID="daily-game-results-btn"
      />
    </View>
  );
};

export const DailyGameCard: React.FC<DailyGameCardProps> = ({
  state,
  date,
  score,
  totalQuestions,
  onPress,
  style,
  testID,
}) => (
  <Card style={style} testID={testID}>
    {state === "ready" && <ReadyContent date={date} onPress={onPress} />}
    {state === "in-progress" && <InProgressContent date={date} onPress={onPress} />}
    {state === "completed" && (
      <CompletedContent
        date={date}
        score={score ?? 0}
        totalQuestions={totalQuestions ?? 0}
        onPress={onPress}
      />
    )}
  </Card>
);

const styles = StyleSheet.create({
  content: {
    alignItems: "center",
    gap: spacingMd,
  },
  dateLabel: {
    fontFamily: fontFamilyPrimary,
    fontSize: fontSizeSm,
    color: textMuted,
    letterSpacing: letterSpacingWide,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: fontFamilyPrimary,
    fontSize: fontSizeXl,
    fontWeight: fontWeightBold,
    color: textPrimary,
    letterSpacing: letterSpacingNormal,
  },
  subtitle: {
    fontFamily: fontFamilyPrimary,
    fontSize: fontSizeBase,
    color: textSecondary,
  },
  button: {
    marginTop: spacingMd,
  },
  completedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingMd,
  },
  completedTitle: {
    fontFamily: fontFamilyPrimary,
    fontSize: fontSizeLg,
    fontWeight: fontWeightSemibold,
    color: correctText,
  },
  scoreText: {
    fontFamily: fontFamilyPrimary,
    fontSize: fontSizeXl,
    fontWeight: fontWeightBold,
    color: textPrimary,
  },
});
