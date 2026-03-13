/**
 * Ornamental gradient divider line.
 *
 * Mimics the CSS gradient `transparent -> gold -> transparent` from jsx.md
 * using three side-by-side Views with varying opacity since React Native
 * does not support CSS linear gradients natively.
 */

import type React from "react";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";

import { accent } from "../../theme/colors";
import { dividerHeight } from "../../theme/spacing";

interface OrnamentDividerProps {
  /** Total width of the divider. Defaults to 80. */
  width?: number;
  /** Optional style override for the outer container. */
  style?: StyleProp<ViewStyle>;
  /** Test identifier for testing frameworks. */
  testID?: string;
}

export const OrnamentDivider: React.FC<OrnamentDividerProps> = ({ width = 80, style, testID }) => {
  const segmentWidth = width / 3;

  return (
    <View style={[styles.container, { width }, style]} testID={testID}>
      <View
        style={[styles.segment, { width: segmentWidth, backgroundColor: accent, opacity: 0 }]}
      />
      <View
        style={[styles.segment, { width: segmentWidth, backgroundColor: accent, opacity: 1 }]}
      />
      <View
        style={[styles.segment, { width: segmentWidth, backgroundColor: accent, opacity: 0 }]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    height: dividerHeight,
    alignSelf: "center",
  },
  segment: {
    height: dividerHeight,
  },
});
