/**
 * Streak indicator with flame icon and pulse animation.
 *
 * Only renders when streak >= 3. Shows a pulsing FlameIcon
 * alongside the streak count in gold.
 */

import type React from "react";
import { useEffect, useRef } from "react";
import { Animated, type StyleProp, StyleSheet, Text, type ViewStyle } from "react-native";

import { streak as streakColor } from "../../theme/colors";
import { spacingXs } from "../../theme/spacing";
import { fontSizeSm, fontWeightBold } from "../../theme/typography";
import { FlameIcon } from "../icons";

interface StreakIndicatorProps {
  /** Current streak count. */
  streak: number;
  /** Optional style override for the outer container. */
  style?: StyleProp<ViewStyle>;
  /** Test identifier for testing frameworks. */
  testID?: string;
}

const MIN_STREAK = 3;
const FLAME_SIZE = 14;

export const StreakIndicator: React.FC<StreakIndicatorProps> = ({ streak, style, testID }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (streak >= MIN_STREAK) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.6,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      );
      pulse.start();
      return () => {
        pulse.stop();
      };
    }
    pulseAnim.setValue(1);
    return undefined;
  }, [streak, pulseAnim]);

  if (streak < MIN_STREAK) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, { opacity: pulseAnim }, style]} testID={testID}>
      <FlameIcon size={FLAME_SIZE} color={streakColor} />
      <Text style={styles.text}>{streak} streak</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingXs,
  },
  text: {
    fontSize: fontSizeSm,
    fontWeight: fontWeightBold,
    color: streakColor,
  },
});
