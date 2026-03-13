/**
 * Device Conditions - Smart background download conditions.
 */

import { NativeModules } from "react-native";

export interface DeviceConditions {
  isWifi: boolean;
  batteryLevel: number; // 0-100
  isLowPowerMode: boolean;
  isCharging: boolean;
}

export interface PreloadConfig {
  enabled: boolean;
  wifiOnly?: boolean; // default: true
  minBatteryPercent?: number; // default: 20
  respectLowPowerMode?: boolean; // default: true
}

interface NativeDeviceConditions {
  getNetworkType?: () => Promise<string>;
  getBatteryLevel?: () => Promise<number>;
  isLowPowerMode?: () => Promise<boolean>;
  isCharging?: () => Promise<boolean>;
}

const DEFAULT_CONDITIONS: DeviceConditions = {
  isWifi: true,
  batteryLevel: 100,
  isLowPowerMode: false,
  isCharging: false,
};

/** Get current device conditions. Falls back to safe defaults. */
export async function getDeviceConditions(): Promise<DeviceConditions> {
  const nativeModule = NativeModules.BundleNudgeDevice as NativeDeviceConditions | undefined;
  if (!nativeModule) return DEFAULT_CONDITIONS;

  const [networkType, batteryLevel, isLowPowerMode, isCharging] = await Promise.all([
    nativeModule.getNetworkType?.() ?? Promise.resolve("wifi"),
    nativeModule.getBatteryLevel?.() ?? Promise.resolve(100),
    nativeModule.isLowPowerMode?.() ?? Promise.resolve(false),
    nativeModule.isCharging?.() ?? Promise.resolve(false),
  ]);

  return { isWifi: networkType === "wifi", batteryLevel, isLowPowerMode, isCharging };
}

/** Check if conditions are met for background download. */
export function shouldDownload(conditions: DeviceConditions, config: PreloadConfig): boolean {
  const wifiOnly = config.wifiOnly ?? true;
  const minBattery = config.minBatteryPercent ?? 20;
  const respectLowPower = config.respectLowPowerMode ?? true;

  if (wifiOnly && !conditions.isWifi) return false;
  if (conditions.batteryLevel < minBattery) return false;
  if (respectLowPower && conditions.isLowPowerMode) return false;
  return true;
}
