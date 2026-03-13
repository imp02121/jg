/**
 * Themed loading indicator with optional label text.
 *
 * Uses the theme accent color for the ActivityIndicator and renders
 * an optional descriptive label below it.
 */

import type React from "react";
import {
  ActivityIndicator,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";

import { accent, textMuted } from "../../theme/colors";
import { spacingMd } from "../../theme/spacing";
import { fontFamilyPrimary, fontSizeSm } from "../../theme/typography";

interface LoadingSpinnerProps {
  /** Optional label displayed below the spinner. */
  label?: string;
  /** Spinner size. */
  size?: "small" | "large";
  /** Optional style override for the outer container. */
  style?: StyleProp<ViewStyle>;
  /** Test identifier for testing frameworks. */
  testID?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  label,
  size = "large",
  style,
  testID,
}) => (
  <View style={[styles.container, style]} testID={testID}>
    <ActivityIndicator size={size} color={accent} />
    {label != null && label.length > 0 && <Text style={styles.label}>{label}</Text>}
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    marginTop: spacingMd,
    fontFamily: fontFamilyPrimary,
    fontSize: fontSizeSm,
    color: textMuted,
  },
});
