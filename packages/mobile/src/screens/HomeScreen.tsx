/**
 * Home screen — main hub showing daily game card, stats, and navigation.
 */

import { Text, View } from "react-native";
import type { HomeScreenProps } from "../navigation/types";

export function HomeScreen(_props: HomeScreenProps): React.JSX.Element {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>Home Screen</Text>
    </View>
  );
}
