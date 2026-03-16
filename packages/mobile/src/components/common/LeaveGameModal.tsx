/**
 * Custom-styled confirmation modal for leaving an active game.
 *
 * Uses the app's parchment/gold aesthetic instead of the native Alert.
 */

import type React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import {
  accent,
  backgroundSecondary,
  cardBorder,
  textMuted,
  textPrimary,
  textSecondary,
  wrongBorder,
  wrongText,
} from "../../theme/colors";
import { radiusLg, radiusXl, spacingLg, spacingMd, spacingXl, spacingXxl } from "../../theme/spacing";
import {
  fontFamilyPrimary,
  fontSizeBase,
  fontSizeLg,
  fontSizeSm,
  fontWeightBold,
  fontWeightSemibold,
  letterSpacingNormal,
  letterSpacingWide,
} from "../../theme/typography";

interface LeaveGameModalProps {
  readonly visible: boolean;
  readonly onStay: () => void;
  readonly onLeave: () => void;
}

export const LeaveGameModal: React.FC<LeaveGameModalProps> = ({ visible, onStay, onLeave }) => (
  <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.title}>Leave Game?</Text>
        <Text style={styles.message}>Your progress will be lost if you leave now.</Text>

        <View style={styles.buttons}>
          <Pressable onPress={onStay} style={styles.stayButton}>
            <Text style={styles.stayText}>STAY</Text>
          </Pressable>

          <Pressable onPress={onLeave} style={styles.leaveButton}>
            <Text style={styles.leaveText}>LEAVE</Text>
          </Pressable>
        </View>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(10, 8, 5, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacingXxl,
  },
  card: {
    backgroundColor: backgroundSecondary,
    borderWidth: 1,
    borderColor: cardBorder,
    borderRadius: radiusXl,
    padding: spacingXxl + spacingMd,
    width: "100%",
    maxWidth: 320,
    alignItems: "center",
    gap: spacingLg,
  },
  title: {
    fontFamily: fontFamilyPrimary,
    fontSize: fontSizeLg,
    fontWeight: fontWeightBold,
    color: textPrimary,
    letterSpacing: letterSpacingNormal,
    textAlign: "center",
  },
  message: {
    fontFamily: fontFamilyPrimary,
    fontSize: fontSizeBase,
    color: textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  buttons: {
    flexDirection: "row",
    gap: spacingLg,
    marginTop: spacingXl,
    width: "100%",
  },
  stayButton: {
    flex: 1,
    paddingVertical: spacingLg,
    borderRadius: radiusLg,
    borderWidth: 1,
    borderColor: accent,
    alignItems: "center",
  },
  stayText: {
    fontFamily: fontFamilyPrimary,
    fontSize: fontSizeSm,
    fontWeight: fontWeightSemibold,
    color: textMuted,
    letterSpacing: letterSpacingWide,
    textTransform: "uppercase",
  },
  leaveButton: {
    flex: 1,
    paddingVertical: spacingLg,
    borderRadius: radiusLg,
    borderWidth: 1,
    borderColor: wrongBorder,
    alignItems: "center",
  },
  leaveText: {
    fontFamily: fontFamilyPrimary,
    fontSize: fontSizeSm,
    fontWeight: fontWeightSemibold,
    color: wrongText,
    letterSpacing: letterSpacingWide,
    textTransform: "uppercase",
  },
});
