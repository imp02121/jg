/**
 * History screen — scrollable list of past games with scores and tiers.
 */

import { Text, View } from "react-native";
import type { HistoryScreenProps } from "../navigation/types";

export function HistoryScreen(_props: HistoryScreenProps): React.JSX.Element {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>History Screen</Text>
    </View>
  );
}
