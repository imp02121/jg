/**
 * Primary/secondary button styled for The History Gauntlet.
 *
 * Primary: gold border, dark gradient bg, cream text. Fills gold on press.
 * Secondary: transparent bg, gold border, smaller size.
 */

import type React from "react";
import { useCallback, useRef } from "react";
import { Animated, Pressable, type StyleProp, StyleSheet, type ViewStyle } from "react-native";

import { accent, backgroundPrimary, buttonBgStart, textPrimary } from "../../theme/colors";
import { radiusMd, spacingLg, spacingSection, spacingXl, spacingXxl } from "../../theme/spacing";
import {
  fontFamilyPrimary,
  fontSizeBase,
  fontSizeLg,
  fontWeightBold,
  letterSpacingExtraWide,
} from "../../theme/typography";

interface GauntletButtonProps {
  /** Button label text. */
  title: string;
  /** Press handler. */
  onPress: () => void;
  /** Visual variant. Primary is larger with filled bg; secondary is transparent. */
  variant?: "primary" | "secondary";
  /** Whether the button is disabled. */
  disabled?: boolean;
  /** Optional style override for the outer container. */
  style?: StyleProp<ViewStyle>;
  /** Test identifier for testing frameworks. */
  testID?: string;
}

export const GauntletButton: React.FC<GauntletButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  style,
  testID,
}) => {
  const pressAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = useCallback(() => {
    Animated.timing(pressAnim, {
      toValue: 1,
      duration: 120,
      useNativeDriver: false,
    }).start();
  }, [pressAnim]);

  const handlePressOut = useCallback(() => {
    Animated.timing(pressAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [pressAnim]);

  const isPrimary = variant === "primary";

  const animatedBg = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [isPrimary ? buttonBgStart : "transparent", accent],
  });

  const animatedTextColor = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [textPrimary, backgroundPrimary],
  });

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      testID={testID}
    >
      <Animated.View
        style={[
          styles.base,
          isPrimary ? styles.primary : styles.secondary,
          { backgroundColor: animatedBg },
          disabled ? styles.disabled : undefined,
          style,
        ]}
      >
        <Animated.Text
          style={[
            styles.text,
            isPrimary ? styles.textPrimary : styles.textSecondary,
            { color: animatedTextColor },
            disabled ? styles.textDisabled : undefined,
          ]}
        >
          {title}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: accent,
    borderRadius: radiusMd,
  },
  primary: {
    paddingVertical: spacingLg + 2,
    paddingHorizontal: spacingSection,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  secondary: {
    paddingVertical: spacingLg,
    paddingHorizontal: spacingXxl + spacingXl,
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  disabled: {
    opacity: 0.4,
  },
  text: {
    fontFamily: fontFamilyPrimary,
    fontWeight: fontWeightBold,
    letterSpacing: letterSpacingExtraWide,
    textTransform: "uppercase",
  },
  textPrimary: {
    fontSize: fontSizeLg,
  },
  textSecondary: {
    fontSize: fontSizeBase,
  },
  textDisabled: {
    opacity: 0.6,
  },
});
