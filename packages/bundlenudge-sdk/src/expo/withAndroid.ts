/**
 * Android Expo Config Plugin
 *
 * Configures Android project for BundleNudge OTA updates.
 * Adds necessary meta-data to AndroidManifest.xml.
 */

import { AndroidConfig, type ConfigPlugin, withAndroidManifest } from "@expo/config-plugins";

import type { BundleNudgePluginProps } from "./types";

const { getMainApplicationOrThrow, addMetaDataItemToMainApplication } = AndroidConfig.Manifest;

/**
 * Apply BundleNudge configuration to AndroidManifest.xml
 */
export const withBundleNudgeAndroid: ConfigPlugin<BundleNudgePluginProps> = (config, props) => {
  config = withAndroidManifest(config, (cfg) => {
    const mainApplication = getMainApplicationOrThrow(cfg.modResults);

    // Required: App ID for identifying the app with BundleNudge
    addMetaDataItemToMainApplication(mainApplication, "com.bundlenudge.APP_ID", props.appId);

    // Optional: Custom API URL (e.g., for self-hosted)
    if (props.apiUrl) {
      addMetaDataItemToMainApplication(mainApplication, "com.bundlenudge.API_URL", props.apiUrl);
    }

    // Optional: Debug mode for verbose logging
    addMetaDataItemToMainApplication(
      mainApplication,
      "com.bundlenudge.DEBUG",
      String(props.debug ?? false),
    );

    return cfg;
  });

  return config;
};
