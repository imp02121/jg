/**
 * Results screen — displays rank, score breakdown, and per-tier performance.
 */

import { Text, View } from "react-native";
import type { ResultsScreenProps } from "../navigation/types";

export function ResultsScreen(_props: ResultsScreenProps): React.JSX.Element {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>Results Screen</Text>
    </View>
  );
}
