/**
 * Small version display for the home screen footer.
 *
 * Uses the useBundleVersion hook from BundleNudge to show the current
 * bundle version and whether the running code was delivered via OTA.
 * Renders as subtle, understated text that does not distract from
 * gameplay.
 */

import { useBundleVersion } from "@bundlenudge/sdk";
import { StyleSheet, Text, View } from "react-native";

import { textMuted, textSubtle } from "../../theme/colors";
import { spacingSm } from "../../theme/spacing";
import {
  fontFamilyPrimary,
  fontSizeXs,
  fontWeightNormal,
  letterSpacingNormal,
} from "../../theme/typography";

/**
 * Displays the current bundle version and an "OTA" indicator when
 * the app is running an over-the-air update rather than the stock
 * embedded bundle. Intended for use as a footer element.
 */
export function VersionDisplay(): React.JSX.Element {
  const { version, isOtaUpdate } = useBundleVersion();

  const versionLabel = version ?? "stock";
  const suffix = isOtaUpdate ? " (OTA)" : "";

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        v{versionLabel}
        {suffix.length > 0 && <Text style={styles.otaIndicator}>{suffix}</Text>}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: spacingSm,
  },
  text: {
    fontFamily: fontFamilyPrimary,
    fontSize: fontSizeXs,
    fontWeight: fontWeightNormal,
    color: textSubtle,
    letterSpacing: letterSpacingNormal,
  },
  otaIndicator: {
    color: textMuted,
  },
});
