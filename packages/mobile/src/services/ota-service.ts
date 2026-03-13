/**
 * BundleNudge OTA update initialization service.
 *
 * Initializes the BundleNudge SDK with configuration from config.ts
 * and provides lifecycle callbacks for status changes and errors.
 *
 * The app continues to function normally even if initialization fails
 * (e.g. missing appId, network error, or SDK unavailable).
 */

import { BundleNudge } from "@bundlenudge/sdk";

import { config } from "../config";

/**
 * Initialize the BundleNudge OTA update SDK.
 *
 * Reads configuration from config.ts and calls BundleNudge.initialize()
 * with the appropriate settings. Uses 'nextLaunch' install mode to avoid
 * interrupting gameplay.
 *
 * This function never throws -- initialization failures are caught and
 * logged so the app can continue without OTA support.
 */
export async function initializeOta(): Promise<void> {
  if (config.bundleNudgeAppId.length === 0) {
    if (config.bundleNudgeDebug) {
      console.warn(
        "[BundleNudge] No appId configured (EXPO_PUBLIC_BUNDLENUDGE_APP_ID is empty). " +
          "OTA updates are disabled.",
      );
    }
    return;
  }

  try {
    await BundleNudge.initialize(
      {
        appId: config.bundleNudgeAppId,
        apiUrl: config.bundleNudgeApiUrl,
        debug: config.bundleNudgeDebug,
        checkOnLaunch: true,
        checkOnForeground: true,
        installMode: "nextLaunch",
      },
      {
        onStatusChange: () => {
          // Status changes are logged internally when debug is enabled
        },
        onError: (error: Error) => {
          console.error("[BundleNudge] Error:", error.message);
        },
      },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[BundleNudge] Initialization failed:", message);
    // Swallow the error -- the app works without OTA updates.
  }
}
