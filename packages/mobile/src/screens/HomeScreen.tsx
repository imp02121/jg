/**
 * Home screen -- main hub showing daily game card, stats overview,
 * and navigation to difficulty selection and history.
 */

import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import type { LocalGameResult } from "@history-gauntlet/shared";

import { GauntletButton } from "../components/common/GauntletButton";
import { OrnamentDivider } from "../components/common/OrnamentDivider";
import { DailyGameCard } from "../components/home/DailyGameCard";
import { StatsOverview } from "../components/home/StatsOverview";
import type { HomeScreenProps } from "../navigation/types";
import { getResultByDate } from "../services/game-storage";
import { type AllTimeStats, getAllTimeStats } from "../services/stats-service";
import { backgroundPrimary } from "../theme/colors";
import { maxContentWidth, spacingXl, spacingXxl } from "../theme/spacing";

export function HomeScreen({ navigation }: HomeScreenProps): React.JSX.Element {
  const [todayResult, setTodayResult] = useState<LocalGameResult | null>(null);
  const [stats, setStats] = useState<AllTimeStats | null>(null);
  const todayStr = formatToday();
  const displayDate = formatDisplayDate(new Date());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [result, allStats] = await Promise.all([getResultByDate(todayStr), getAllTimeStats()]);
      if (cancelled) return;
      setTodayResult(result);
      setStats(allStats);
    }

    const unsubscribe = navigation.addListener("focus", () => {
      void load();
    });

    void load();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [navigation, todayStr]);

  const handleDailyGamePress = useCallback(() => {
    if (todayResult !== null) {
      navigation.navigate("Results", { resultId: todayResult.id });
    } else {
      navigation.navigate("DifficultySelect");
    }
  }, [navigation, todayResult]);

  const handleHistoryPress = useCallback(() => {
    navigation.navigate("History");
  }, [navigation]);

  const handlePlayPress = useCallback(() => {
    navigation.navigate("DifficultySelect");
  }, [navigation]);

  const gameState = todayResult !== null ? ("completed" as const) : ("ready" as const);

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
      <DailyGameCard
        state={gameState}
        date={displayDate}
        score={todayResult?.score}
        totalQuestions={todayResult?.totalQuestions}
        onPress={handleDailyGamePress}
        testID="daily-game-card"
      />

      <OrnamentDivider width={120} />

      {stats !== null && <StatsOverview stats={stats} testID="stats-overview" />}

      <View style={styles.actions}>
        <GauntletButton
          title="BEGIN THE TRIAL"
          onPress={handlePlayPress}
          variant="primary"
          testID="begin-trial-btn"
        />

        <GauntletButton
          title="PAST CONQUESTS"
          onPress={handleHistoryPress}
          variant="secondary"
          testID="history-btn"
        />
      </View>
    </ScrollView>
  );
}

function formatToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: backgroundPrimary,
  },
  content: {
    alignItems: "stretch",
    paddingHorizontal: spacingXxl,
    paddingTop: spacingXxl + spacingXl,
    paddingBottom: spacingXxl + spacingXl,
    gap: spacingXxl,
    maxWidth: maxContentWidth,
    alignSelf: "center",
    width: "100%",
  },
  actions: {
    gap: spacingXl,
    alignItems: "center",
  },
});
