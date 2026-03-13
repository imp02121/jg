/**
 * Difficulty selection screen — configure which tiers to play before starting.
 */

import { Text, View } from "react-native";
import type { DifficultySelectScreenProps } from "../navigation/types";

export function DifficultySelectScreen(_props: DifficultySelectScreenProps): React.JSX.Element {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>Difficulty Select</Text>
    </View>
  );
}
