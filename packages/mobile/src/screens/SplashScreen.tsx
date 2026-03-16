/**
 * Splash screen -- shown on app launch while fetching the daily game.
 *
 * Shows the app logo (ColumnsIcon) and a loading spinner.
 * Fetches today's game via the API client, caches it, then navigates to Home.
 * Falls back to a cached game on error, or shows an offline message.
 */

import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";

import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ColumnsIcon } from "../components/icons";
import type { SplashScreenProps } from "../navigation/types";
import { createApiClient } from "../services/api-client";
import { cacheDailyGame, getCachedGame } from "../services/cache-service";
import { backgroundPrimary, textPrimary } from "../theme/colors";
import { spacingLg, spacingXxl } from "../theme/spacing";
import {
  fontFamilyPrimary,
  fontSizeXxxl,
  fontWeightBold,
  letterSpacingWide,
} from "../theme/typography";

import { config } from "../config";

const api = createApiClient({ baseUrl: config.apiBaseUrl });

/**
 * Attempt to fetch and cache today's game. Always resolves —
 * failures are logged but never block navigation to Home.
 */
async function fetchAndCacheDailyGame(): Promise<void> {
  const todayStr = formatToday();

  try {
    console.log("[SplashScreen] Fetching daily game...");
    const game = await api.fetchDailyGame();
    console.log("[SplashScreen] Daily game fetched, caching for", game.date);
    await cacheDailyGame(game);
  } catch (err: unknown) {
    const cached = await getCachedGame(todayStr);
    if (cached !== null) {
      console.log("[SplashScreen] API failed but cached game found for", todayStr);
      return;
    }

    if (err instanceof Error) {
      console.log("[SplashScreen] No game available:", err.message);
    } else {
      console.log("[SplashScreen] No game available (unknown error)");
    }
  }
}

export function SplashScreen({ navigation }: SplashScreenProps): React.JSX.Element {
  useEffect(() => {
    let cancelled = false;

    async function loadAndNavigate() {
      await fetchAndCacheDailyGame();
      if (!cancelled) {
        navigation.replace("Home");
      }
    }

    void loadAndNavigate();

    return () => {
      cancelled = true;
    };
  }, [navigation]);

  return (
    <View style={styles.container}>
      <ColumnsIcon size={64} color={textPrimary} />
      <Text style={styles.title}>THE HISTORY GAUNTLET</Text>
      <LoadingSpinner label="Preparing today's challenge..." style={styles.spinner} />
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
});
