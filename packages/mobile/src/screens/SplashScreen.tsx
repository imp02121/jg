/**
 * Splash screen -- shown on app launch while fetching the daily game.
 *
 * Shows the app logo (ColumnsIcon) and a loading spinner.
 * Fetches today's game via the API client, caches it, then navigates to Home.
 * Falls back to a cached game on error, or shows an offline message.
 */

import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ColumnsIcon } from "../components/icons";
import type { SplashScreenProps } from "../navigation/types";
import { createApiClient } from "../services/api-client";
import { cacheDailyGame, getCachedGame } from "../services/cache-service";
import { backgroundPrimary, textPrimary, wrongText } from "../theme/colors";
import { spacingLg, spacingXxl } from "../theme/spacing";
import {
  fontFamilyPrimary,
  fontSizeBase,
  fontSizeXxxl,
  fontWeightBold,
  letterSpacingWide,
} from "../theme/typography";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://api.historygauntlet.com";

const api = createApiClient({ baseUrl: API_BASE_URL });

type LoadResult = { status: "ok" } | { status: "error"; message: string };

async function fetchOrLoadCachedGame(): Promise<LoadResult> {
  try {
    const game = await api.fetchDailyGame();
    await cacheDailyGame(game);
    return { status: "ok" };
  } catch {
    const todayStr = formatToday();
    const cached = await getCachedGame(todayStr);
    if (cached !== null) {
      return { status: "ok" };
    }
    return {
      status: "error",
      message: "Unable to connect. Please check your connection and try again.",
    };
  }
}

export function SplashScreen({ navigation }: SplashScreenProps): React.JSX.Element {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDailyGame() {
      const result = await fetchOrLoadCachedGame();
      if (cancelled) return;
      if (result.status === "ok") {
        navigation.replace("Home");
      } else {
        setError(result.message);
      }
    }

    void loadDailyGame();

    return () => {
      cancelled = true;
    };
  }, [navigation]);

  return (
    <View style={styles.container}>
      <ColumnsIcon size={64} color={textPrimary} />
      <Text style={styles.title}>THE HISTORY GAUNTLET</Text>

      {error !== null ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <LoadingSpinner label="Preparing today's challenge..." style={styles.spinner} />
      )}
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
  container: {
    flex: 1,
    backgroundColor: backgroundPrimary,
    alignItems: "center",
    justifyContent: "center",
    padding: spacingXxl,
  },
  title: {
    fontFamily: fontFamilyPrimary,
    fontSize: fontSizeXxxl,
    fontWeight: fontWeightBold,
    color: textPrimary,
    letterSpacing: letterSpacingWide,
    textAlign: "center",
    marginTop: spacingLg,
    marginBottom: spacingXxl,
  },
  spinner: {
    marginTop: spacingXxl,
  },
  error: {
    marginTop: spacingXxl,
    fontSize: fontSizeBase,
    color: wrongText,
    textAlign: "center",
  },
});
