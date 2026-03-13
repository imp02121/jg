/**
 * Dark gradient card container matching the jsx.md question card style.
 *
 * Provides a consistent surface for grouped content with border, shadow,
 * and rounded corners.
 */

import type React from "react";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";

import { cardBgStart, cardBorder } from "../../theme/colors";
import { radiusXl, spacingHuge, spacingXxl } from "../../theme/spacing";

interface CardProps {
  /** Card content. */
  children: React.ReactNode;
  /** Optional style override for the outer container. */
  style?: StyleProp<ViewStyle> | undefined;
  /** Test identifier for testing frameworks. */
  testID?: string | undefined;
}

export const Card: React.FC<CardProps> = ({ children, style, testID }) => (
  <View style={[styles.card, style]} testID={testID}>
    {children}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: cardBgStart,
    borderWidth: 1,
    borderColor: cardBorder,
    borderRadius: radiusXl,
    paddingVertical: spacingHuge,
    paddingHorizontal: spacingXxl + 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 32,
    elevation: 6,
  },
});
