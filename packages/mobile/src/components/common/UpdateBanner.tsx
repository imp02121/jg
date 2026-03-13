/**
 * Subtle banner shown when a BundleNudge OTA update is available.
 *
 * Uses the useBundleNudge hook to detect update status and provides
 * an "Install" button that triggers the download-and-install flow.
 * The banner only renders when the status is 'update-available'.
 *
 * Styled with the parchment aesthetic: dark background with a gold
 * accent border to blend with the rest of the app.
 */

import { useBundleNudge } from "@bundlenudge/sdk";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  accent,
  backgroundSecondary,
  cardBorder,
  textPrimary,
  textSecondary,
} from "../../theme/colors";
import { radiusMd, spacingLg, spacingMd, spacingXl } from "../../theme/spacing";
import {
  fontFamilyPrimary,
  fontSizeBase,
  fontSizeSm,
  fontWeightBold,
  fontWeightSemibold,
  letterSpacingWide,
} from "../../theme/typography";

/**
 * A non-intrusive banner that appears at the top of the screen when
 * a BundleNudge OTA update is available for download.
 *
 * Tapping "Install" triggers the sync flow. The update applies on
 * next app launch (installMode: 'nextLaunch'), so gameplay is never
 * interrupted.
 */
export function UpdateBanner(): React.JSX.Element | null {
  const { updateAvailable, sync } = useBundleNudge();

  if (!updateAvailable) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Update Available</Text>
      <Pressable
        onPress={() => {
          void sync();
        }}
        style={({ pressed }) => [styles.button, pressed ? styles.buttonPressed : undefined]}
        accessibilityRole="button"
        accessibilityLabel="Install update"
      >
        <Text style={styles.buttonText}>Install</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: backgroundSecondary,
    borderWidth: 1,
    borderColor: cardBorder,
    borderBottomColor: accent,
    borderRadius: radiusMd,
    paddingVertical: spacingMd,
    paddingHorizontal: spacingXl,
    marginHorizontal: spacingXl,
    marginTop: spacingMd,
  },
  label: {
    fontFamily: fontFamilyPrimary,
    fontSize: fontSizeBase,
    fontWeight: fontWeightSemibold,
    color: textSecondary,
    letterSpacing: letterSpacingWide,
  },
  button: {
    backgroundColor: accent,
    borderRadius: radiusMd,
    paddingVertical: spacingMd - 2,
    paddingHorizontal: spacingLg,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonText: {
    fontFamily: fontFamilyPrimary,
    fontSize: fontSizeSm,
    fontWeight: fontWeightBold,
    color: textPrimary,
    letterSpacing: letterSpacingWide,
    textTransform: "uppercase",
  },
});
