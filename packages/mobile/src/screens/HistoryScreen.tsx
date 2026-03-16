/**
 * History screen -- scrollable list of past games with scores and tiers.
 *
 * Displays all stored game results in reverse-chronological order.
 * Includes a filter to show all games or only completed ones,
 * and a back button to return to the home screen.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { LocalGameResult } from "@history-gauntlet/shared";

import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { OrnamentDivider } from "../components/common/OrnamentDivider";
import { HistoryRow } from "../components/home/HistoryRow";
import { ChevronLeftIcon } from "../components/icons";
import type { HistoryScreenProps } from "../navigation/types";
import { getAllResults } from "../services/game-storage";
import {
  accent,
  accentHover,
  backgroundPrimary,
  correctText,
  textMuted,
  textPrimary,
  textSecondary,
} from "../theme/colors";
import {
  maxContentWidth,
  radiusMd,
  spacingLg,
  spacingMd,
  spacingSm,
  spacingXl,
  spacingXxl,
} from "../theme/spacing";
import {
  fontFamilyPrimary,
  fontSizeBase,
  fontSizeSm,
  fontSizeXl,
  fontWeightBold,
  fontWeightSemibold,
  letterSpacingWide,
} from "../theme/typography";

type FilterOption = "all" | "completed";

export function HistoryScreen({ navigation }: HistoryScreenProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [results, setResults] = useState<LocalGameResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterOption>("all");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const allResults = await getAllResults();
      if (cancelled) return;
      setResults(allResults);
      setLoading(false);
    }

    const unsubscribe = navigation.addListener("focus", () => {
      void load();
    });

    void load();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [navigation]);

  const filteredResults = useMemo(() => {
    if (filter === "completed") {
      return results.filter((r) => r.completedAt !== "");
    }
    return results;
  }, [results, filter]);

  const handleResultPress = useCallback(
    (resultId: string) => {
      navigation.navigate("Results", { resultId });
    },
    [navigation],
  );

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const renderItem = useCallback(
    ({ item }: { item: LocalGameResult }) => (
      <HistoryRow result={item} onPress={handleResultPress} />
    ),
    [handleResultPress],
  );

  const keyExtractor = useCallback((item: LocalGameResult) => item.id, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner label="Loading history..." />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacingMd }]}>
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          style={styles.backButton}
          testID="history-back-btn"
          hitSlop={12}
        >
          <ChevronLeftIcon size={24} color={textPrimary} />
          <Text style={styles.backText}>Home</Text>
        </Pressable>
      </View>

      <Text style={styles.heading}>Past Games</Text>
      <OrnamentDivider width={120} />

      <View style={styles.filterRow}>
        <FilterChip
          label="All"
          active={filter === "all"}
          count={results.length}
          onPress={() => setFilter("all")}
        />
        <FilterChip
          label="Completed"
          active={filter === "completed"}
          count={results.filter((r) => r.completedAt !== "").length}
          onPress={() => setFilter("completed")}
        />
      </View>

      {filteredResults.length === 0 ? (
        <Text style={styles.emptyText}>No games played yet. Begin your first trial!</Text>
      ) : (
        <FlatList
          data={filteredResults}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

interface FilterChipProps {
  label: string;
  active: boolean;
  count: number;
  onPress: () => void;
}

function FilterChip({ label, active, count, onPress }: FilterChipProps): React.JSX.Element {
  return (
    <Pressable onPress={onPress} testID={`filter-${label.toLowerCase()}`}>
      <View style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}>
        <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextInactive]}>
          {label}
        </Text>
        <Text style={[styles.chipCount, active ? styles.chipCountActive : styles.chipCountInactive]}>
          {count}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: backgroundPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    flex: 1,
    backgroundColor: backgroundPrimary,
    paddingHorizontal: spacingXxl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacingLg,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingSm,
    paddingVertical: spacingSm,
  },
  backText: {
    fontFamily: fontFamilyPrimary,
    fontSize: fontSizeBase,
    color: textPrimary,
    fontWeight: fontWeightSemibold,
  },
  heading: {
    fontFamily: fontFamilyPrimary,
    fontSize: fontSizeXl,
    fontWeight: fontWeightBold,
    color: textPrimary,
    letterSpacing: letterSpacingWide,
    textAlign: "center",
    marginBottom: spacingLg,
  },
  filterRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacingMd,
    marginTop: spacingLg,
    marginBottom: spacingSm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingSm,
    paddingVertical: spacingSm + 2,
    paddingHorizontal: spacingLg,
    borderRadius: radiusMd,
    borderWidth: 1,
  },
  chipActive: {
    borderColor: accent,
    backgroundColor: accentHover,
  },
  chipInactive: {
    borderColor: textMuted,
    backgroundColor: "transparent",
  },
  chipText: {
    fontFamily: fontFamilyPrimary,
    fontSize: fontSizeSm,
    fontWeight: fontWeightSemibold,
    letterSpacing: letterSpacingWide,
    textTransform: "uppercase",
  },
  chipTextActive: {
    color: textPrimary,
  },
  chipTextInactive: {
    color: textMuted,
  },
  chipCount: {
    fontFamily: fontFamilyPrimary,
    fontSize: fontSizeSm,
    fontWeight: fontWeightBold,
  },
  chipCountActive: {
    color: correctText,
  },
  chipCountInactive: {
    color: textSecondary,
  },
  emptyText: {
    fontFamily: fontFamilyPrimary,
    fontSize: fontSizeBase,
    color: textMuted,
    textAlign: "center",
    marginTop: spacingXxl,
  },
  listContent: {
    paddingTop: spacingXl,
    paddingBottom: spacingXxl,
    gap: spacingMd,
    maxWidth: maxContentWidth,
    alignSelf: "center",
    width: "100%",
  },
});
