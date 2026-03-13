/**
 * Scrollable list of all questions with correct/incorrect indicators.
 *
 * Each row shows a check or cross icon, the question text (truncated),
 * and a DifficultyBadge. Constrained to a max height with scrolling.
 */

import type React from "react";
import { ScrollView, type StyleProp, StyleSheet, Text, View, type ViewStyle } from "react-native";

import type { GameQuestion, LocalAnswer } from "@history-gauntlet/shared";

import { cardBgStart, cardBorder, correctText, textPrimary, wrongText } from "../../theme/colors";
import { radiusLg, spacingLg, spacingMd } from "../../theme/spacing";
import { fontFamilyPrimary, fontSizeSm } from "../../theme/typography";
import { DifficultyBadge } from "../common/DifficultyBadge";
import { CheckIcon, CrossIcon } from "../icons";

interface FullBreakdownProps {
  /** All questions from the game. */
  questions: GameQuestion[];
  /** Player's answers in the same order. */
  answers: LocalAnswer[];
  /** Optional style override for the outer container. */
  style?: StyleProp<ViewStyle>;
  /** Test identifier for testing frameworks. */
  testID?: string;
}

/** Maximum visible height before scrolling kicks in. */
const MAX_HEIGHT = 400;

interface QuestionRowProps {
  question: GameQuestion;
  answer: LocalAnswer;
  testID?: string | undefined;
}

const QuestionRow: React.FC<QuestionRowProps> = ({ question, answer, testID }) => {
  const isCorrect = answer.correct;
  const iconColor = isCorrect ? correctText : wrongText;

  return (
    <View style={styles.row} testID={testID}>
      <View style={styles.iconWrapper}>
        {isCorrect ? (
          <CheckIcon size={16} color={iconColor} />
        ) : (
          <CrossIcon size={16} color={iconColor} />
        )}
      </View>
      <Text style={styles.questionText} numberOfLines={1} ellipsizeMode="tail">
        {question.question}
      </Text>
      <DifficultyBadge tier={question.difficulty} size="sm" />
    </View>
  );
};

export const FullBreakdown: React.FC<FullBreakdownProps> = ({
  questions,
  answers,
  style,
  testID,
}) => {
  /** Build a lookup from question ID to its answer. */
  const answerByQuestionId = new Map<string, LocalAnswer>();
  for (const answer of answers) {
    answerByQuestionId.set(answer.questionId, answer);
  }

  return (
    <View style={[styles.container, style]} testID={testID}>
      <ScrollView style={styles.scrollArea} nestedScrollEnabled>
        {questions.map((question) => {
          const answer = answerByQuestionId.get(question.id);
          if (answer == null) return null;

          return (
            <QuestionRow
              key={question.id}
              question={question}
              answer={answer}
              testID={testID != null ? `${testID}-${question.id}` : undefined}
            />
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    maxHeight: MAX_HEIGHT,
    backgroundColor: cardBgStart,
    borderWidth: 1,
    borderColor: cardBorder,
    borderRadius: radiusLg,
    overflow: "hidden",
  },
  scrollArea: {
    paddingVertical: spacingMd,
    paddingHorizontal: spacingLg,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacingMd,
    gap: spacingMd,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: cardBorder,
  },
  iconWrapper: {
    width: 24,
    alignItems: "center",
  },
  questionText: {
    flex: 1,
    fontFamily: fontFamilyPrimary,
    fontSize: fontSizeSm,
    color: textPrimary,
  },
});
