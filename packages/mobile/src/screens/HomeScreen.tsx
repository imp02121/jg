/**
 * Home screen -- main hub showing daily game card, stats overview,
 * and navigation to difficulty selection and history.
 */

import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { LocalGameResult } from "@history-gauntlet/shared";

import { GauntletButton } from "../components/common/GauntletButton";
import { OrnamentDivider } from "../components/common/OrnamentDivider";
import { DailyGameCard } from "../components/home/DailyGameCard";
import { StatsOverview } from "../components/home/StatsOverview";
import { LogoIcon } from "../components/icons";
import type { HomeScreenProps } from "../navigation/types";
import { getCachedGame } from "../services/cache-service";
import { getResultByDate } from "../services/game-storage";
import { type AllTimeStats, getAllTimeStats } from "../services/stats-service";
import { backgroundPrimary, textPrimary } from "../theme/colors";
import { maxContentWidth, spacingHuge, spacingLg, spacingMassive, spacingSection, spacingXl, spacingXxl } from "../theme/spacing";
import {
  fontFamilyPrimary,
  fontSizeXxxl,
  fontWeightBold,
  letterSpacingWide,
} from "../theme/typography";

export function HomeScreen({ navigation }: HomeScreenProps): React.JSX.Element {
  const [todayResult, setTodayResult] = useState<LocalGameResult | null>(null);
  const [stats, setStats] = useState<AllTimeStats | null>(null);
  const [hasGame, setHasGame] = useState(false);
  const todayStr = formatToday();
  const displayDate = formatDisplayDate(new Date());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [result, allStats, cached] = await Promise.all([
        getResultByDate(todayStr),
        getAllTimeStats(),
        getCachedGame(todayStr),
      ]);
      if (cancelled) return;
      setTodayResult(result);
      setStats(allStats);
      setHasGame(cached !== null);
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
      navigation.navigate("TodaysGame");
    }
  }, [navigation, todayResult]);

  const handleHistoryPress = useCallback(() => {
    navigation.navigate("History");
  }, [navigation]);

  function resolveGameState(): "unavailable" | "completed" | "ready" {
    if (todayResult !== null) return "completed";
    if (!hasGame) return "unavailable";
    return "ready";
  }

  const gameState = resolveGameState();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacingHuge }]}
    >
      <View style={styles.hero}>
        <LogoIcon size={64} color={textPrimary} />
        <Text style={styles.heroTitle}>THE HISTORY GAUNTLET</Text>
        <OrnamentDivider width={80} />
      </View>

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

      <GauntletButton
        title="PAST GAMES"
        onPress={handleHistoryPress}
        variant="secondary"
        testID="history-btn"
      />
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
    paddingBottom: spacingSection,
    gap: spacingMassive,
    maxWidth: maxContentWidth,
    alignSelf: "center",
    width: "100%",
  },
  hero: {
    alignItems: "center",
    gap: spacingLg,
    marginBottom: spacingXl,
  },
  heroTitle: {
    fontFamily: fontFamilyPrimary,
    fontSize: fontSizeXxxl,
    fontWeight: fontWeightBold,
    color: textPrimary,
    letterSpacing: letterSpacingWide,
    textAlign: "center",
    textTransform: "uppercase",
  },
});
