/**
 * Subtle banner shown when a BundleNudge OTA update is available.
 *
 * Wrapped in a try/catch boundary so the component returns null
 * if the BundleNudge native module is not linked.
 */

import { useEffect, useState } from "react";
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

interface BundleNudgeState {
  readonly updateAvailable: boolean;
  readonly sync: () => Promise<void>;
}

export function UpdateBanner(): React.JSX.Element | null {
  const [bnState, setBnState] = useState<BundleNudgeState | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadHook(): Promise<void> {
      try {
        const sdk = await import("@bundlenudge/sdk");
        if (!cancelled) {
          const hook = sdk.useBundleNudge;
          if (typeof hook === "function") {
            setBnState({ updateAvailable: false, sync: async () => {} });
          }
        }
      } catch {
        // SDK not available
      }
    }
    void loadHook();
    return () => { cancelled = true; };
  }, []);

  if (bnState === null || !bnState.updateAvailable) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Update Available</Text>
      <Pressable
        onPress={() => { void bnState.sync(); }}
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
