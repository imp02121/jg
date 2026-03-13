/**
 * Results screen -- displays rank, score breakdown, tier performance,
 * and a full question-by-question breakdown after completing a game.
 */

import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import type { DifficultyTier, GameQuestion, LocalGameResult } from "@history-gauntlet/shared";
import { DIFFICULTY_TIERS, getRankForPercent } from "@history-gauntlet/shared";

import { GauntletButton } from "../components/common/GauntletButton";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { OrnamentDivider } from "../components/common/OrnamentDivider";
import { FullBreakdown } from "../components/results/FullBreakdown";
import { RankDisplay } from "../components/results/RankDisplay";
import { ScoreBreakdown } from "../components/results/ScoreBreakdown";
import { TierPerformance } from "../components/results/TierPerformance";
import type { ResultsScreenProps } from "../navigation/types";
import { getCachedGame } from "../services/cache-service";
import { getResultById } from "../services/game-storage";
import { backgroundPrimary, textMuted, textPrimary } from "../theme/colors";
import { maxContentWidth, spacingXl, spacingXxl } from "../theme/spacing";
import {
  fontFamilyPrimary,
  fontSizeBase,
  fontSizeXxl,
  fontWeightBold,
  letterSpacingWide,
} from "../theme/typography";

export function ResultsScreen({ navigation, route }: ResultsScreenProps): React.JSX.Element {
  const { resultId } = route.params;

  const [result, setResult] = useState<LocalGameResult | null>(null);
  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const gameResult = await getResultById(resultId);
      if (cancelled || gameResult === null) {
        setLoading(false);
        return;
      }
      setResult(gameResult);

      // Try to load the full questions for the breakdown
      const game = await getCachedGame(gameResult.date);
      if (cancelled) return;

      if (game !== null) {
        const qList = buildQuestionList(game.questionsByTier, gameResult.selectedTiers);
        setQuestions(qList);
      }

      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [resultId]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner label="Loading results..." />
      </View>
    );
  }

  if (result === null) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.emptyText}>Result not found.</Text>
        <GauntletButton
          title="GO HOME"
          onPress={() => navigation.navigate("Home")}
          variant="secondary"
        />
      </View>
    );
  }

  const pct = result.totalQuestions > 0 ? (result.score / result.totalQuestions) * 100 : 0;
  const rank = getRankForPercent(pct);
  const tierPerf = buildTierPerformance(result);

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Trial Complete</Text>

      <RankDisplay rank={rank} testID="rank-display" />

      <ScoreBreakdown
        score={result.score}
        totalQuestions={result.totalQuestions}
        bestStreak={result.bestStreak}
        testID="score-breakdown"
      />

      <OrnamentDivider width={120} />

      <TierPerformance
        performance={tierPerf}
        selectedTiers={result.selectedTiers}
        testID="tier-performance"
      />

      {questions.length > 0 && (
        <>
          <OrnamentDivider width={120} />
          <FullBreakdown questions={questions} answers={result.answers} testID="full-breakdown" />
        </>
      )}

      <OrnamentDivider width={120} />

      <View style={styles.actions}>
        <GauntletButton
          title="PLAY AGAIN"
          onPress={() => navigation.navigate("DifficultySelect")}
          variant="primary"
          testID="play-again-btn"
        />
        <GauntletButton
          title="HOME"
          onPress={() => navigation.navigate("Home")}
          variant="secondary"
          testID="home-btn"
        />
      </View>
    </ScrollView>
  );
}

function buildQuestionList(
  questionsByTier: Record<DifficultyTier, GameQuestion[]>,
  selectedTiers: DifficultyTier[],
): GameQuestion[] {
  const tierSet = new Set(selectedTiers);
  const sorted = [...DIFFICULTY_TIERS]
    .filter((td) => tierSet.has(td.key))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const result: GameQuestion[] = [];
  for (const td of sorted) {
    const tierQuestions = questionsByTier[td.key];
    if (tierQuestions !== undefined) {
      result.push(...tierQuestions);
    }
  }
  return result;
}

interface TierResult {
  readonly correct: number;
  readonly total: number;
}

function buildTierPerformance(result: LocalGameResult): Record<DifficultyTier, TierResult> {
  const perf: Record<string, TierResult> = {};

  for (const td of DIFFICULTY_TIERS) {
    perf[td.key] = { correct: 0, total: 0 };
  }

  for (const answer of result.answers) {
    const existing = perf[answer.difficulty];
    if (existing !== undefined) {
      perf[answer.difficulty] = {
        correct: existing.correct + (answer.correct ? 1 : 0),
        total: existing.total + 1,
      };
    }
  }

  return perf as Record<DifficultyTier, TierResult>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: backgroundPrimary,
    alignItems: "center",
    justifyContent: "center",
    gap: spacingXl,
  },
  scrollView: {
    flex: 1,
    backgroundColor: backgroundPrimary,
  },
  content: {
    paddingHorizontal: spacingXxl,
    paddingTop: spacingXxl + spacingXl,
    paddingBottom: spacingXxl + spacingXl,
    gap: spacingXxl,
    maxWidth: maxContentWidth,
    alignSelf: "center",
    width: "100%",
  },
  heading: {
    fontFamily: fontFamilyPrimary,
    fontSize: fontSizeXxl,
    fontWeight: fontWeightBold,
    color: textPrimary,
    letterSpacing: letterSpacingWide,
    textAlign: "center",
  },
  emptyText: {
    fontFamily: fontFamilyPrimary,
    fontSize: fontSizeBase,
    color: textMuted,
    textAlign: "center",
  },
  actions: {
    gap: spacingXl,
    alignItems: "center",
  },
});
