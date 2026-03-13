/** Device info collection helpers for the updater. */

import { logWarn } from "./debug/logger";
import {
  collectDeviceModel,
  collectLocale,
  collectOsVersion,
  collectTimezone,
} from "./targeting/device-info";

/**
 * Safely collect device info for update check requests.
 * Each field is collected independently so a single failure
 * does not prevent the rest from being sent.
 */
export function safeCollectDeviceInfo(): Record<string, string> {
  const info: Record<string, string> = {};
  try {
    info.osVersion = collectOsVersion();
  } catch {
    logWarn("Failed to collect osVersion");
  }
  try {
    info.deviceModel = collectDeviceModel();
  } catch {
    logWarn("Failed to collect deviceModel");
  }
  try {
    info.timezone = collectTimezone();
  } catch {
    logWarn("Failed to collect timezone");
  }
  try {
    info.locale = collectLocale();
  } catch {
    logWarn("Failed to collect locale");
  }
  return info;
}
