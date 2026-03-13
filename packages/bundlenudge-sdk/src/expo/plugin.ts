/**
 * BundleNudge Expo Config Plugin
 *
 * Main entry point for the Expo config plugin that configures
 * both iOS and Android projects for BundleNudge OTA updates.
 *
 * Usage in app.json:
 * ```json
 * {
 *   "expo": {
 *     "plugins": [
 *       ["@bundlenudge/sdk/expo/plugin", {
 *         "appId": "your-app-id-from-dashboard",
 *         "debug": true
 *       }]
 *     ]
 *   }
 * }
 * ```
 */

import { type ConfigPlugin, createRunOncePlugin } from "@expo/config-plugins";

import type { BundleNudgePluginProps } from "./types";
import { withBundleNudgeAndroid } from "./withAndroid";
import { withBundleNudgeIos } from "./withIos";

/** Package name for plugin identification */
const PACKAGE_NAME = "bundlenudge";

/** Plugin version for tracking */
const PLUGIN_VERSION = "1.0.0";

/**
 * Validates the plugin props before applying configuration.
 * Throws an error if required props are missing or invalid.
 */
function validateProps(props: BundleNudgePluginProps): void {
  if (!props.appId || typeof props.appId !== "string") {
    throw new Error(
      "[BundleNudge] appId is required. " + "Get your app ID from the BundleNudge dashboard.",
    );
  }

  if (props.appId.trim().length === 0) {
    throw new Error("[BundleNudge] appId cannot be empty.");
  }

  if (props.apiUrl !== undefined && typeof props.apiUrl !== "string") {
    throw new Error("[BundleNudge] apiUrl must be a string if provided.");
  }

  if (props.debug !== undefined && typeof props.debug !== "boolean") {
    throw new Error("[BundleNudge] debug must be a boolean if provided.");
  }
}

/**
 * Main BundleNudge config plugin.
 * Applies platform-specific configurations for iOS and Android.
 */
const withBundleNudge: ConfigPlugin<BundleNudgePluginProps> = (config, props) => {
  // Validate configuration before applying
  validateProps(props);

  // Apply iOS modifications (Info.plist)
  config = withBundleNudgeIos(config, props);

  // Apply Android modifications (AndroidManifest.xml, build.gradle)
  config = withBundleNudgeAndroid(config, props);

  return config;
};

/**
 * Plugin wrapped with createRunOncePlugin to ensure
 * it only runs once during the prebuild phase, even if referenced
 * multiple times.
 */
const bundleNudgePlugin = createRunOncePlugin(withBundleNudge, PACKAGE_NAME, PLUGIN_VERSION);

export { bundleNudgePlugin, withBundleNudge, withBundleNudgeAndroid, withBundleNudgeIos };
export type { BundleNudgePluginProps };

// Expo config plugins require a default export for the entry point
// eslint-disable-next-line no-restricted-syntax
export default bundleNudgePlugin;
