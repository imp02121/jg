/**
 * Difficulty selection screen -- configure which tiers to play before starting.
 *
 * Shows TierToggle with current preferences, a question count indicator,
 * and a "Begin the Trial" button that navigates to the GameScreen.
 */

import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { DifficultyTier } from "@history-gauntlet/shared";
import { DIFFICULTY_TIER_VALUES } from "@history-gauntlet/shared";

import { GauntletButton } from "../components/common/GauntletButton";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { OrnamentDivider } from "../components/common/OrnamentDivider";
import { TierToggle } from "../components/home/TierToggle";
import { ColumnsIcon } from "../components/icons";
import type { DifficultySelectScreenProps } from "../navigation/types";
import { getCachedGame } from "../services/cache-service";
import { getSelectedTiers, setSelectedTiers } from "../stores/settings-store";
import { backgroundPrimary, textMuted, textPrimary, wrongText } from "../theme/colors";
import { maxContentWidth, spacingXl, spacingXxl } from "../theme/spacing";
import {
  fontFamilyPrimary,
  fontSizeBase,
  fontSizeSm,
  fontSizeXl,
  fontWeightBold,
  letterSpacingNormal,
} from "../theme/typography";

export function DifficultySelectScreen({
  navigation,
}: DifficultySelectScreenProps): React.JSX.Element {
  const [selectedTiersState, setSelectedTiersState] = useState<DifficultyTier[]>([
    ...DIFFICULTY_TIER_VALUES,
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const tiers = await getSelectedTiers();
      if (cancelled) return;
      setSelectedTiersState(tiers);
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggle = useCallback((tier: DifficultyTier) => {
    setSelectedTiersState((prev) => {
      const next = prev.includes(tier) ? prev.filter((t) => t !== tier) : [...prev, tier];
      // Prevent deselecting all tiers
      if (next.length === 0) return prev;
      void setSelectedTiers(next);
      return next;
    });
  }, []);

  const handleStart = useCallback(async () => {
    const todayStr = formatToday();
    const game = await getCachedGame(todayStr);

    if (game === null) {
      setError("No game available. Please restart the app to fetch today's game.");
      return;
    }

    navigation.navigate("Game", {
      date: game.date,
      selectedTiers: selectedTiersState,
    });
  }, [navigation, selectedTiersState]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner label="Loading preferences..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <ColumnsIcon size={36} color={textPrimary} />
        <Text style={styles.title}>Choose Your Challenge</Text>
        <Text style={styles.subtitle}>Select which tiers to include</Text>

        <OrnamentDivider width={120} />

        <TierToggle
          selectedTiers={selectedTiersState}
          onToggle={handleToggle}
          testID="tier-toggle"
        />

        <OrnamentDivider width={120} />

        {error !== null && <Text style={styles.error}>{error}</Text>}

        <GauntletButton
          title="BEGIN THE TRIAL"
          onPress={() => void handleStart()}
          variant="primary"
          testID="begin-trial-btn"
        />
      </View>
    </View>
  );
}

function formatToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
    justifyContent: "center",
  },
  content: {
    alignItems: "center",
    paddingHorizontal: spacingXxl,
    gap: spacingXl,
    maxWidth: maxContentWidth,
    alignSelf: "center",
    width: "100%",
  },
  title: {
    fontFamily: fontFamilyPrimary,
    fontSize: fontSizeXl,
    fontWeight: fontWeightBold,
    color: textPrimary,
    letterSpacing: letterSpacingNormal,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: fontFamilyPrimary,
    fontSize: fontSizeBase,
    color: textMuted,
    textAlign: "center",
  },
  error: {
    fontSize: fontSizeSm,
    color: wrongText,
    textAlign: "center",
  },
});
