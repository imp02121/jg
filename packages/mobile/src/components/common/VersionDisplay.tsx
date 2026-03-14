/**
 * Small version display for the home screen footer.
 *
 * Dynamically loads BundleNudge to avoid crashing when the native
 * module is not linked. Shows "v1.0.0" as fallback.
 */

import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { textMuted, textSubtle } from "../../theme/colors";
import { spacingSm } from "../../theme/spacing";
import {
  fontFamilyPrimary,
  fontSizeXs,
  fontWeightNormal,
  letterSpacingNormal,
} from "../../theme/typography";

interface VersionInfo {
  readonly version: string | null;
  readonly isOtaUpdate: boolean;
}

export function VersionDisplay(): React.JSX.Element {
  const [info, setInfo] = useState<VersionInfo>({ version: null, isOtaUpdate: false });

  useEffect(() => {
    let cancelled = false;
    async function loadVersion(): Promise<void> {
      try {
        const sdk = await import("@bundlenudge/sdk");
        const release = sdk.BundleNudge.getInstance().getReleaseInfo();
        if (!cancelled) {
          setInfo({ version: release.version, isOtaUpdate: release.isOtaUpdate });
        }
      } catch {
        // SDK not available
      }
    }
    void loadVersion();
    return () => { cancelled = true; };
  }, []);

  const versionLabel = info.version ?? "1.0.0";
  const suffix = info.isOtaUpdate ? " (OTA)" : "";

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
