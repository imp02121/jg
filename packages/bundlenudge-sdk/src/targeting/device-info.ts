/**
 * Device Info Collection
 *
 * Collects device attributes for server-side targeting.
 * Uses React Native APIs without additional dependencies.
 */

import { NativeModules, Platform } from "react-native";

/** Device attributes for server-side targeting. */
export interface DeviceAttributes {
  deviceId: string;
  os: "ios" | "android";
  osVersion: string;
  deviceModel: string;
  timezone: string;
  locale: string;
  appVersion: string;
  currentBundleVersion: string | null;
}

/** Type definitions for React Native native modules */
interface SettingsManagerModule {
  settings?: {
    AppleLocale?: string;
    AppleLanguages?: string[];
  };
}

interface I18nManagerModule {
  localeIdentifier?: string;
}

interface PlatformConstantsModule {
  interfaceIdiom?: string;
  Model?: string;
  Brand?: string;
}

/** Default values for graceful fallback */
const DEFAULTS = {
  locale: "en-US",
  timezone: "UTC",
  deviceModel: "unknown",
} as const;

/**
 * Collect OS version from Platform API.
 */
export function collectOsVersion(): string {
  try {
    return String(Platform.Version);
  } catch {
    return "unknown";
  }
}

/**
 * Collect locale using Intl API with platform-specific fallbacks.
 */
export function collectLocale(): string {
  // Try Intl API first (available in modern RN)
  try {
    const resolved = Intl.DateTimeFormat().resolvedOptions();
    if (resolved.locale) {
      return resolved.locale;
    }
  } catch {
    // Intl not available, try native fallbacks
  }

  // iOS fallback via SettingsManager
  try {
    if (Platform.OS === "ios") {
      const settingsManager = NativeModules.SettingsManager as SettingsManagerModule | undefined;
      const settings = settingsManager?.settings;
      if (settings?.AppleLocale) {
        return settings.AppleLocale.replace("_", "-");
      }
      // iOS 13+ uses AppleLanguages array
      const firstLang = settings?.AppleLanguages?.[0];
      if (firstLang) {
        return firstLang.replace("_", "-");
      }
    }
  } catch {
    // Continue to next fallback
  }

  // Android fallback via I18nManager
  try {
    if (Platform.OS === "android") {
      const i18n = NativeModules.I18nManager as I18nManagerModule | undefined;
      if (i18n?.localeIdentifier) {
        return i18n.localeIdentifier.replace("_", "-");
      }
    }
  } catch {
    // Use default
  }

  return DEFAULTS.locale;
}

/**
 * Collect timezone using Intl API.
 */
export function collectTimezone(): string {
  try {
    const resolved = Intl.DateTimeFormat().resolvedOptions();
    if (resolved.timeZone) {
      return resolved.timeZone;
    }
  } catch {
    // Use default
  }

  return DEFAULTS.timezone;
}

/**
 * Collect device model using platform-specific native modules.
 */
export function collectDeviceModel(): string {
  try {
    const constants = NativeModules.PlatformConstants as PlatformConstantsModule | undefined;

    if (Platform.OS === "ios") {
      // Try PlatformConstants first
      if (constants?.interfaceIdiom) {
        return `iOS ${constants.interfaceIdiom}`;
      }
    }

    if (Platform.OS === "android") {
      // Android provides device info via PlatformConstants
      if (constants?.Model) {
        return constants.Model;
      }
      if (constants?.Brand) {
        return constants.Brand;
      }
    }
  } catch {
    // Use default
  }

  return DEFAULTS.deviceModel;
}

interface CollectDeviceInfoParams {
  deviceId: string;
  appVersion: string;
  currentBundleVersion: string | null;
}

/**
 * Collect all device attributes for targeting.
 *
 * @param params - Required context (deviceId, appVersion, currentBundleVersion)
 * @returns DeviceAttributes object ready for API calls
 */
export function collectDeviceInfo(params: CollectDeviceInfoParams): DeviceAttributes {
  const { deviceId, appVersion, currentBundleVersion } = params;
  const os = Platform.OS === "ios" ? "ios" : "android";

  return {
    deviceId,
    os,
    osVersion: collectOsVersion(),
    deviceModel: collectDeviceModel(),
    timezone: collectTimezone(),
    locale: collectLocale(),
    appVersion,
    currentBundleVersion,
  };
}
