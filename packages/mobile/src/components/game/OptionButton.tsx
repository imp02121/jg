/**
 * Answer option button with state-dependent styling.
 *
 * Displays a letter indicator (A-D) in a circle on the left and
 * the option label text. Visual state changes for neutral, correct,
 * wrong, and revealed-correct feedback.
 */

import type React from "react";
import { Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from "react-native";

import {
  accent,
  accentBorder,
  cardBorder,
  correctBg,
  correctBorder,
  correctText,
  optionBg,
  textSecondary,
  white,
  wrongBg,
  wrongBorder,
  wrongText,
} from "../../theme/colors";
import { indicatorSize, radiusLg, radiusRound, spacingLg, spacingXxl } from "../../theme/spacing";
import { fontSizeMd, fontSizeSm, fontWeightBold } from "../../theme/typography";
import { CheckIcon, CrossIcon } from "../icons";

/** Visual state of an option button. */
type OptionState = "neutral" | "selected-correct" | "selected-wrong" | "revealed-correct";

interface OptionButtonProps {
  /** The answer text. */
  label: string;
  /** Zero-based index of this option (0-3). */
  index: number;
  /** Current visual state. */
  state: OptionState;
  /** Called with the option index when pressed. */
  onPress: (index: number) => void;
  /** Whether interaction is disabled. */
  disabled?: boolean;
  /** Optional style override for the outer container. */
  style?: StyleProp<ViewStyle>;
  /** Test identifier for testing frameworks. */
  testID?: string;
}

const LETTERS = ["A", "B", "C", "D"] as const;

const INDICATOR_ICON_SIZE = 12;

function getStateColors(state: OptionState) {
  switch (state) {
    case "selected-correct":
    case "revealed-correct":
      return {
        bg: correctBg,
        border: correctBorder,
        text: correctText,
        indicatorBg: correctBorder,
        indicatorColor: white,
      };
    case "selected-wrong":
      return {
        bg: wrongBg,
        border: wrongBorder,
        text: wrongText,
        indicatorBg: wrongBorder,
        indicatorColor: white,
      };
    default:
      return {
        bg: optionBg,
        border: cardBorder,
        text: textSecondary,
        indicatorBg: accentBorder,
        indicatorColor: accent,
      };
  }
}

export const OptionButton: React.FC<OptionButtonProps> = ({
  label,
  index,
  state,
  onPress,
  disabled = false,
  style,
  testID,
}) => {
  const colors = getStateColors(state);
  const letter = LETTERS[index];
  const isRevealed = state !== "neutral";

  const handlePress = () => {
    onPress(index);
  };

  const renderIndicatorContent = () => {
    if (state === "selected-correct" || state === "revealed-correct") {
      return <CheckIcon size={INDICATOR_ICON_SIZE} color={colors.indicatorColor} />;
    }
    if (state === "selected-wrong") {
      return <CrossIcon size={INDICATOR_ICON_SIZE} color={colors.indicatorColor} />;
    }
    return <Text style={[styles.letterText, { color: colors.indicatorColor }]}>{letter}</Text>;
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || isRevealed}
      testID={testID}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: colors.bg,
          borderColor: pressed && !isRevealed ? accent : colors.border,
        },
        style,
      ]}
    >
      <View style={[styles.indicator, { backgroundColor: colors.indicatorBg }]}>
        {renderIndicatorContent()}
      </View>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingLg + 2,
    paddingVertical: spacingLg + 2,
    paddingHorizontal: spacingXxl,
    borderWidth: 1,
    borderRadius: radiusLg,
  },
  indicator: {
    width: indicatorSize,
    height: indicatorSize,
    borderRadius: radiusRound,
    alignItems: "center",
    justifyContent: "center",
  },
  letterText: {
    fontSize: fontSizeSm,
    fontWeight: fontWeightBold,
  },
  label: {
    fontSize: fontSizeMd,
    flex: 1,
  },
});
