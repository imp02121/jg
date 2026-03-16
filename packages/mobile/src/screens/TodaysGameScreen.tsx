/**
 * Today's game info screen -- shown before starting the daily game.
 *
 * Displays game metadata (date, question count, tier breakdown)
 * and a "Begin" button that navigates to the Game screen with
 * all tiers selected.
 */

import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { DailyGame } from "@history-gauntlet/shared";
import { DIFFICULTY_TIERS, DIFFICULTY_TIER_VALUES } from "@history-gauntlet/shared";

import { DifficultyBadge } from "../components/common/DifficultyBadge";
import { GauntletButton } from "../components/common/GauntletButton";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { OrnamentDivider } from "../components/common/OrnamentDivider";
import { ColumnsIcon } from "../components/icons";
import type { TodaysGameScreenProps } from "../navigation/types";
import { getCachedGame } from "../services/cache-service";
import {
  backgroundPrimary,
  textMuted,
  textPrimary,
  textSecondary,
  textTertiary,
} from "../theme/colors";
import {
  maxContentWidth,
  spacingLg,
  spacingMassive,
  spacingMd,
  spacingSection,
  spacingXl,
  spacingXxl,
} from "../theme/spacing";
import {
  fontFamilyPrimary,
  fontSizeBase,
  fontSizeSm,
  fontSizeXl,
  fontSizeXxxl,
  fontWeightBold,
  fontWeightSemibold,
  letterSpacingNormal,
  letterSpacingWide,
} from "../theme/typography";

export function TodaysGameScreen({ navigation }: TodaysGameScreenProps): React.JSX.Element {
  const [game, setGame] = useState<DailyGame | null>(null);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const todayStr = formatToday();
      const cached = await getCachedGame(todayStr);
      if (cancelled) return;
      setGame(cached);
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner label="Loading game info..." />
      </View>
    );
  }

  if (game === null) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>No game available today.</Text>
        <GauntletButton
          title="GO BACK"
          onPress={() => navigation.goBack()}
          variant="secondary"
        />
      </View>
    );
  }

  const totalQ = game.metadata.totalQuestions;
  const tierCounts = game.metadata.questionsByDifficulty;
  const displayDate = formatDisplayDate(new Date(game.date + "T00:00:00"));

  const handleBegin = () => {
    navigation.navigate("Game", {
      date: game.date,
      selectedTiers: [...DIFFICULTY_TIER_VALUES],
    });
  };

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacingSection }]}
    >
      <ColumnsIcon size={48} color={textPrimary} />

      <View style={styles.header}>
        <Text style={styles.dateLabel}>{displayDate}</Text>
        <Text style={styles.title}>{String(totalQ)} Questions</Text>
        <Text style={styles.subtitle}>across six difficulty tiers</Text>
      </View>

      <OrnamentDivider width={80} />

      <View style={styles.tiers}>
        {DIFFICULTY_TIERS.map((td) => {
          const count = tierCounts[td.key] ?? 0;
          if (count === 0) return null;
          return (
            <View key={td.key} style={styles.tierRow}>
              <DifficultyBadge tier={td.key} />
              <Text style={styles.tierCount}>
                {String(count)} {count === 1 ? "question" : "questions"}
              </Text>
            </View>
          );
        })}
      </View>

      <OrnamentDivider width={80} />

      <GauntletButton
        title="BEGIN THE TRIAL"
        onPress={handleBegin}
        variant="primary"
        testID="begin-trial-btn"
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
    alignItems: "center",
    paddingHorizontal: spacingXxl,
    paddingBottom: spacingSection,
    gap: spacingMassive,
    maxWidth: maxContentWidth,
    alignSelf: "center",
    width: "100%",
  },
  header: {
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
    fontSize: fontSizeXxxl,
    fontWeight: fontWeightBold,
    color: textPrimary,
    letterSpacing: letterSpacingNormal,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: fontFamilyPrimary,
    fontSize: fontSizeBase,
    color: textSecondary,
    textAlign: "center",
  },
  tiers: {
    width: "100%",
    gap: spacingLg,
  },
  tierRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacingXl,
  },
  tierCount: {
    fontFamily: fontFamilyPrimary,
    fontSize: fontSizeSm,
    color: textTertiary,
    fontWeight: fontWeightSemibold,
  },
  errorText: {
    fontFamily: fontFamilyPrimary,
    fontSize: fontSizeBase,
    color: textMuted,
    textAlign: "center",
  },
});
