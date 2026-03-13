/**
 * Game screen — the main gameplay loop showing questions and handling answers.
 */

import { Text, View } from "react-native";
import type { GameScreenProps } from "../navigation/types";

export function GameScreen(_props: GameScreenProps): React.JSX.Element {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>Game Screen</Text>
    </View>
  );
}
