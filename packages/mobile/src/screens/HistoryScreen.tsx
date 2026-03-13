/**
 * History screen -- scrollable list of past games with scores and tiers.
 *
 * Uses a FlatList to display all stored game results, most recent first.
 * Tapping a game navigates to its Results screen.
 */

import { useCallback, useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import type { LocalGameResult } from "@history-gauntlet/shared";

import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { OrnamentDivider } from "../components/common/OrnamentDivider";
import { HistoryRow } from "../components/home/HistoryRow";
import type { HistoryScreenProps } from "../navigation/types";
import { getAllResults } from "../services/game-storage";
import { backgroundPrimary, textMuted, textPrimary } from "../theme/colors";
import { maxContentWidth, spacingLg, spacingMd, spacingXl, spacingXxl } from "../theme/spacing";
import {
  fontFamilyPrimary,
  fontSizeBase,
  fontSizeXl,
  fontWeightBold,
  letterSpacingWide,
} from "../theme/typography";

export function HistoryScreen({ navigation }: HistoryScreenProps): React.JSX.Element {
  const [results, setResults] = useState<LocalGameResult[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleResultPress = useCallback(
    (resultId: string) => {
      navigation.navigate("Results", { resultId });
    },
    [navigation],
  );

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
    <View style={styles.container}>
      <Text style={styles.heading}>Past Conquests</Text>
      <OrnamentDivider width={120} />

      {results.length === 0 ? (
        <Text style={styles.emptyText}>No games played yet. Begin your first trial!</Text>
      ) : (
        <FlatList
          data={results}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
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
    paddingTop: spacingXxl + spacingXl,
    paddingHorizontal: spacingXxl,
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
