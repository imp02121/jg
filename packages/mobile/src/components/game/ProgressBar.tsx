/**
 * Gradient progress bar showing game completion progress.
 *
 * Height 3px with a dark track and a multi-colored fill that
 * transitions smoothly in width.
 */

import type React from "react";
import { useEffect, useRef } from "react";
import { Animated, type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";

import {
  progressTrack,
  tierGrandmasterBg,
  tierJourneymanBg,
  tierMasterBg,
  tierNoviceBg,
  tierScholarBg,
} from "../../theme/colors";
import { progressBarHeight, radiusSm } from "../../theme/spacing";

interface ProgressBarProps {
  /** Number of questions completed. */
  current: number;
  /** Total number of questions. */
  total: number;
  /** Optional style override for the outer container. */
  style?: StyleProp<ViewStyle>;
  /** Test identifier for testing frameworks. */
  testID?: string;
}

/**
 * Approximate the multi-tier gradient by picking a single color
 * based on how far through the game the player is.
 */
function getProgressColor(pct: number): string {
  if (pct < 0.2) return tierNoviceBg;
  if (pct < 0.4) return tierJourneymanBg;
  if (pct < 0.6) return tierScholarBg;
  if (pct < 0.8) return tierMasterBg;
  return tierGrandmasterBg;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ current, total, style, testID }) => {
  const pct = total > 0 ? current / total : 0;
  const widthAnim = useRef(new Animated.Value(pct)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: pct,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [pct, widthAnim]);

  const fillColor = getProgressColor(pct);

  return (
    <View style={[styles.track, style]} testID={testID}>
      <Animated.View
        style={[
          styles.fill,
          {
            backgroundColor: fillColor,
            width: widthAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ["0%", "100%"],
            }),
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    height: progressBarHeight,
    backgroundColor: progressTrack,
    borderRadius: radiusSm,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: radiusSm,
  },
});
