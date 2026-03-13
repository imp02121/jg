/**
 * Root stack navigator for The History Gauntlet.
 *
 * Registers all six screens with fully typed navigation params.
 */

import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { DifficultySelectScreen } from "../screens/DifficultySelectScreen";
import { GameScreen } from "../screens/GameScreen";
import { HistoryScreen } from "../screens/HistoryScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { ResultsScreen } from "../screens/ResultsScreen";
import { SplashScreen } from "../screens/SplashScreen";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * The root navigator containing all screens in the app.
 *
 * Starts on the Splash screen, which handles initial data loading
 * before navigating to Home.
 */
export function RootNavigator(): React.JSX.Element {
  return (
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
  );
}
