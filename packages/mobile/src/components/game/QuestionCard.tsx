/**
 * Question text displayed inside a styled card.
 *
 * Matches the question display from jsx.md: dark semi-transparent
 * background, cream text at xl size, generous padding.
 */

import type React from "react";
import { type StyleProp, StyleSheet, Text, type ViewStyle } from "react-native";

import { textPrimary } from "../../theme/colors";
import { fontSizeXl, fontWeightSemibold, lineHeightNormal } from "../../theme/typography";
import { Card } from "../common/Card";

interface QuestionCardProps {
  /** The question text to display. */
  question: string;
  /** Optional style override for the card container. */
  style?: StyleProp<ViewStyle>;
  /** Test identifier for testing frameworks. */
  testID?: string;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({ question, style, testID }) => (
  <Card style={style} testID={testID}>
    <Text style={styles.question}>{question}</Text>
  </Card>
);

const styles = StyleSheet.create({
  question: {
    fontSize: fontSizeXl,
    fontWeight: fontWeightSemibold,
    lineHeight: fontSizeXl * lineHeightNormal,
    color: textPrimary,
  },
});
