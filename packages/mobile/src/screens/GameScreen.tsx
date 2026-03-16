/**
 * Game screen -- the main gameplay loop.
 *
 * Shows questions sequentially with score tracking, answer reveal,
 * fact display, and progress indication. Uses the game-store for
 * all state management.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DifficultyBadge } from "../components/common/DifficultyBadge";
import { GauntletButton } from "../components/common/GauntletButton";
import { LeaveGameModal } from "../components/common/LeaveGameModal";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { FactReveal } from "../components/game/FactReveal";
import { OptionButton } from "../components/game/OptionButton";
import { ProgressBar } from "../components/game/ProgressBar";
import { QuestionCard } from "../components/game/QuestionCard";
import { ScoreHeader } from "../components/game/ScoreHeader";
import { CrossIcon } from "../components/icons";
import { useGameLogic } from "../hooks/use-game-logic";
import type { GameScreenProps } from "../navigation/types";
import { useGameStore } from "../stores/game-store";
import { backgroundPrimary, textMuted } from "../theme/colors";
import { maxContentWidth, spacingMd, spacingSection, spacingXl, spacingXxl } from "../theme/spacing";

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

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const pendingNavAction = useRef<Readonly<{ type: string; payload?: object; source?: string; target?: string }> | null>(null);

  const handleQuit = useCallback(() => {
    pendingNavAction.current = null;
    setShowLeaveModal(true);
  }, []);

  const handleStay = useCallback(() => {
    pendingNavAction.current = null;
    setShowLeaveModal(false);
  }, []);

  const handleLeave = useCallback(() => {
    setShowLeaveModal(false);
    resetGame();

    if (pendingNavAction.current !== null) {
      navigation.dispatch(pendingNavAction.current);
      pendingNavAction.current = null;
    } else {
      navigation.navigate("Home");
    }
  }, [navigation, resetGame]);

  const { loading, error, handleSelectAnswer, handleNext } = useGameLogic({
    date,
    selectedTiers,
    onComplete,
  });

  // Warn on back navigation during an active game
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (loading) return;

      e.preventDefault();
      pendingNavAction.current = e.data.action;
      setShowLeaveModal(true);
    });

    return unsubscribe;
  }, [navigation, loading]);

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
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.outer}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacingXl }]}
      >
        <Pressable
          onPress={handleQuit}
          style={styles.quitButton}
          hitSlop={12}
          testID="quit-btn"
        >
          <CrossIcon size={20} color={textMuted} />
        </Pressable>

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
      </ScrollView>

      {revealed && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacingXl }]}>
          <GauntletButton
            title={last ? "SEE RESULTS" : "NEXT QUESTION"}
            onPress={handleNext}
            variant="primary"
            testID="next-btn"
          />
        </View>
      )}

      <LeaveGameModal visible={showLeaveModal} onStay={handleStay} onLeave={handleLeave} />
    </View>
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
  outer: {
    flex: 1,
    backgroundColor: backgroundPrimary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacingXxl,
    paddingBottom: spacingXl,
    gap: spacingXl,
    maxWidth: maxContentWidth,
    alignSelf: "center",
    width: "100%",
  },
  quitButton: {
    alignSelf: "flex-start",
    padding: spacingMd,
  },
  options: {
    gap: spacingMd,
  },
  footer: {
    paddingHorizontal: spacingXxl,
    paddingTop: spacingXl,
    alignItems: "center",
    maxWidth: maxContentWidth,
    alignSelf: "center",
    width: "100%",
  },
});
