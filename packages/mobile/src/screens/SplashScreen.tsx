/**
 * Splash screen — shown on app launch while loading daily game data.
 */

import { Text, View } from "react-native";
import type { SplashScreenProps } from "../navigation/types";

export function SplashScreen(_props: SplashScreenProps): React.JSX.Element {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>The History Gauntlet</Text>
      <Text>Loading...</Text>
    </View>
  );
}
