/**
 * Game screen -- the main gameplay loop.
 *
 * Shows questions sequentially with score tracking, answer reveal,
 * fact display, and progress indication. Uses the game-store for
 * all state management.
 */

import { useCallback, useEffect } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";

import { DifficultyBadge } from "../components/common/DifficultyBadge";
import { GauntletButton } from "../components/common/GauntletButton";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { FactReveal } from "../components/game/FactReveal";
import { OptionButton } from "../components/game/OptionButton";
import { ProgressBar } from "../components/game/ProgressBar";
import { QuestionCard } from "../components/game/QuestionCard";
import { ScoreHeader } from "../components/game/ScoreHeader";
import { useGameLogic } from "../hooks/use-game-logic";
import type { GameScreenProps } from "../navigation/types";
import { useGameStore } from "../stores/game-store";
import { backgroundPrimary } from "../theme/colors";
import { maxContentWidth, spacingMd, spacingXl, spacingXxl } from "../theme/spacing";

export function GameScreen({ navigation, route }: GameScreenProps): React.JSX.Element {
  const { date, selectedTiers } = route.params;

  const currentQuestion = useGameStore((s) => s.currentQuestion);
  const currentQuestionIndex = useGameStore((s) => s.currentQuestionIndex);
  const selectedAnswer = useGameStore((s) => s.selectedAnswer);
  const isRevealed = useGameStore((s) => s.isRevealed);
  const score = useGameStore((s) => s.score);
  const streak = useGameStore((s) => s.streak);
  const totalQuestions = useGameStore((s) => s.totalQuestions);
  const isLastQuestion = useGameStore((s) => s.isLastQuestion);
  const resetGame = useGameStore((s) => s.resetGame);

  const onComplete = useCallback(
    (resultId: string) => {
      resetGame();
      navigation.replace("Results", { resultId });
    },
    [navigation, resetGame],
  );

  const { loading, error, handleSelectAnswer, handleNext } = useGameLogic({
    date,
    selectedTiers,
    onComplete,
  });

  // Warn on back navigation during an active game
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      // Allow navigation after game completion
      if (loading) return;

      e.preventDefault();

      Alert.alert("Leave Game?", "Your progress will be lost if you leave now.", [
        { text: "Stay", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: () => {
            resetGame();
            navigation.dispatch(e.data.action);
          },
        },
      ]);
    });

    return unsubscribe;
  }, [navigation, loading, resetGame]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner label="Preparing questions..." />
      </View>
    );
  }

  if (error !== null) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner label={error} />
      </View>
    );
  }

  const question = currentQuestion();
  if (question === null) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner label="No questions available." />
      </View>
    );
  }

  const total = totalQuestions();
  const revealed = isRevealed;
  const last = isLastQuestion();

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
      <ScoreHeader
        currentQuestion={currentQuestionIndex + 1}
        totalQuestions={total}
        score={score}
        streak={streak}
        testID="score-header"
      />

      <ProgressBar current={currentQuestionIndex} total={total} testID="progress-bar" />

      <DifficultyBadge tier={question.difficulty} testID="difficulty-badge" />

      <QuestionCard question={question.question} testID="question-card" />

      <View style={styles.options}>
        {question.options.map((option, idx) => (
          <OptionButton
            key={`opt-${String(idx)}`}
            label={option}
            index={idx}
            state={getOptionState(idx, selectedAnswer, question.correctIndex, revealed)}
            onPress={handleSelectAnswer}
            disabled={revealed}
            testID={`option-${String(idx)}`}
          />
        ))}
      </View>

      <FactReveal fact={question.fact} visible={revealed} testID="fact-reveal" />

      {revealed && (
        <GauntletButton
          title={last ? "SEE RESULTS" : "NEXT QUESTION"}
          onPress={handleNext}
          variant="primary"
          testID="next-btn"
        />
      )}
    </ScrollView>
  );
}

function getOptionState(
  idx: number,
  selectedAnswer: number | null,
  correctIndex: number,
  revealed: boolean,
): "neutral" | "selected-correct" | "selected-wrong" | "revealed-correct" {
  if (!revealed) return "neutral";
  if (idx === selectedAnswer && selectedAnswer === correctIndex) return "selected-correct";
  if (idx === selectedAnswer && selectedAnswer !== correctIndex) return "selected-wrong";
  if (idx === correctIndex) return "revealed-correct";
  return "neutral";
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: backgroundPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
    backgroundColor: backgroundPrimary,
  },
  content: {
    paddingHorizontal: spacingXxl,
    paddingTop: spacingXxl + spacingXl,
    paddingBottom: spacingXxl + spacingXl,
    gap: spacingXl,
    maxWidth: maxContentWidth,
    alignSelf: "center",
    width: "100%",
  },
  options: {
    gap: spacingMd,
  },
});
