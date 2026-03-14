/**
 * BundleNudge OTA update initialization service.
 *
 * All BundleNudge imports are dynamic to prevent a crash when the
 * native module is not linked. If the SDK cannot be loaded, OTA
 * updates are silently disabled and the app continues normally.
 */

import { config } from "../config";

/**
 * Initialize the BundleNudge OTA update SDK.
 *
 * Uses dynamic import so the app never crashes if the native module
 * is missing. Uses 'nextLaunch' install mode to avoid interrupting gameplay.
 */
export async function initializeOta(): Promise<void> {
  if (config.bundleNudgeAppId.length === 0) {
    if (config.bundleNudgeDebug) {
      console.warn("[BundleNudge] No appId configured. OTA updates disabled.");
    }
    return;
  }

  try {
    const { BundleNudge } = await import("@bundlenudge/sdk");

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
          // Logged internally when debug is enabled
        },
        onError: (error: Error) => {
          console.error("[BundleNudge] Error:", error.message);
        },
      },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[BundleNudge] Initialization failed:", message);
  }
}

/**
 * Signal to BundleNudge that the app rendered successfully.
 * Safe to call even if the SDK is not available.
 */
export async function safeNotifyAppReady(): Promise<void> {
  try {
    const { notifyAppReady } = await import("@bundlenudge/sdk");
    await notifyAppReady();
  } catch {
    // SDK not available or not initialized
  }
}
