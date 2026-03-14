/**
 * Root stack navigator for The History Gauntlet.
 *
 * Wraps the app in SafeAreaProvider and initializes the local
 * database and BundleNudge OTA updates on startup before rendering screens.
 */

import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { DifficultySelectScreen } from "../screens/DifficultySelectScreen";
import { GameScreen } from "../screens/GameScreen";
import { HistoryScreen } from "../screens/HistoryScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { ResultsScreen } from "../screens/ResultsScreen";
import { SplashScreen } from "../screens/SplashScreen";
import { getDatabase } from "../services/local-db";
import { initializeOta, safeNotifyAppReady } from "../services/ota-service";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * The root navigator containing all screens in the app.
 *
 * Starts on the Splash screen, which handles initial data loading
 * before navigating to Home.  The local SQLite database and BundleNudge
 * OTA SDK are initialized before any screen is rendered.  After both
 * complete, notifyAppReady() signals to BundleNudge that the update
 * (if any) is stable.
 */
export function RootNavigator(): React.JSX.Element {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function initialize(): Promise<void> {
      // Run DB init and OTA init concurrently. Both are designed to
      // handle their own failures gracefully, so we use allSettled.
      await Promise.allSettled([getDatabase(), initializeOta()]);

      if (!cancelled) {
        setDbReady(true);

        await safeNotifyAppReady();
      }
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!dbReady) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="DifficultySelect" component={DifficultySelectScreen} />
          <Stack.Screen name="Game" component={GameScreen} />
          <Stack.Screen name="Results" component={ResultsScreen} />
          <Stack.Screen name="History" component={HistoryScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
