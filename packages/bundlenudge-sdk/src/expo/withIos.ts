/**
 * iOS Expo Config Plugin
 *
 * Configures iOS project for BundleNudge OTA updates.
 * Adds necessary configuration to Info.plist.
 */

import { type ConfigPlugin, withInfoPlist } from "@expo/config-plugins";

import type { BundleNudgePluginProps } from "./types";

/**
 * Apply BundleNudge configuration to iOS Info.plist
 */
export const withBundleNudgeIos: ConfigPlugin<BundleNudgePluginProps> = (config, props) => {
  // Add BundleNudge config to Info.plist
  config = withInfoPlist(config, (cfg) => {
    // Required: App ID for identifying the app with BundleNudge
    cfg.modResults.BundleNudgeAppId = props.appId;

    // Optional: Custom API URL (e.g., for self-hosted)
    if (props.apiUrl) {
      cfg.modResults.BundleNudgeApiUrl = props.apiUrl;
    }

    // Optional: Debug mode for verbose logging
    cfg.modResults.BundleNudgeDebug = props.debug ?? false;

    return cfg;
  });

  return config;
};
