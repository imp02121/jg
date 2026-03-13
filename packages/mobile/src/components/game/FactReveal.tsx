/**
 * "Did you know?" card with fade-in + slide-up animation.
 *
 * Shows a book icon, header, and fact text. Animates in when
 * `visible` transitions to true.
 */

import type React from "react";
import { useEffect, useRef } from "react";
import { Animated, type StyleProp, StyleSheet, Text, View, type ViewStyle } from "react-native";

import { accent, factBg, factBorder, textTertiary } from "../../theme/colors";
import { radiusLg, spacingMd, spacingXl, spacingXxl } from "../../theme/spacing";
import {
  fontSizeBase,
  fontSizeSm,
  fontWeightBold,
  letterSpacingWide,
  lineHeightRelaxed,
} from "../../theme/typography";
import { BookIcon } from "../icons";

interface FactRevealProps {
  /** The educational fact to display. */
  fact: string;
  /** Whether the fact card is visible (triggers animation). */
  visible: boolean;
  /** Optional style override for the outer container. */
  style?: StyleProp<ViewStyle>;
  /** Test identifier for testing frameworks. */
  testID?: string;
}

const ANIM_DURATION = 400;
const SLIDE_OFFSET = 8;
const ICON_SIZE = 14;

export const FactReveal: React.FC<FactRevealProps> = ({ fact, visible, style, testID }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SLIDE_OFFSET)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: ANIM_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: ANIM_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(SLIDE_OFFSET);
    }
  }, [visible, fadeAnim, slideAnim]);

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
        style,
      ]}
      testID={testID}
    >
      <View style={styles.header}>
        <BookIcon size={ICON_SIZE} color={accent} />
        <Text style={styles.headerText}>DID YOU KNOW?</Text>
      </View>
      <Text style={styles.fact}>{fact}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: factBg,
    borderWidth: 1,
    borderColor: factBorder,
    borderRadius: radiusLg,
    paddingVertical: spacingXl,
    paddingHorizontal: spacingXxl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingMd,
    marginBottom: spacingMd,
  },
  headerText: {
    fontSize: fontSizeSm,
    fontWeight: fontWeightBold,
    color: accent,
    letterSpacing: letterSpacingWide,
    textTransform: "uppercase",
  },
  fact: {
    fontSize: fontSizeBase,
    lineHeight: fontSizeBase * lineHeightRelaxed,
    color: textTertiary,
  },
});
