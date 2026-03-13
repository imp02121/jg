/**
 * Preload Manager - Background/silent downloads for OTA updates.
 */

import type { UpdateInfo } from "../types";
import {
  type DeviceConditions,
  type PreloadConfig,
  getDeviceConditions,
  shouldDownload,
} from "./conditions";

export type { PreloadConfig, DeviceConditions };

export interface PreloadResult {
  success: boolean;
  skipped: boolean;
  reason?: string;
  update?: UpdateInfo;
}

interface ShouldPreloadResult {
  should: boolean;
  reason: string;
}

/** Preload manager for background downloads. */
export class PreloadManager {
  private config: PreloadConfig;

  constructor(config: PreloadConfig) {
    this.config = config;
  }

  /** Check conditions and preload update if appropriate. Silent - no progress callbacks. */
  async preload(): Promise<PreloadResult> {
    if (!this.config.enabled) return { success: false, skipped: true, reason: "Preload disabled" };

    const { should, reason } = await this.shouldPreload();
    if (!should) return { success: false, skipped: true, reason };

    try {
      const update = await this.checkAndDownload();
      if (!update) return { success: true, skipped: true, reason: "No update available" };
      return { success: true, skipped: false, update };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { success: false, skipped: false, reason: message };
    }
  }

  /** Check if preload should run based on device conditions. */
  async shouldPreload(): Promise<ShouldPreloadResult> {
    if (!this.config.enabled) return { should: false, reason: "Preload disabled" };
    const conditions = await getDeviceConditions();
    if (!shouldDownload(conditions, this.config)) {
      return { should: false, reason: this.getConditionFailureReason(conditions) };
    }
    return { should: true, reason: "Conditions met" };
  }

  private getConditionFailureReason(conditions: DeviceConditions): string {
    const wifiOnly = this.config.wifiOnly ?? true;
    const minBattery = this.config.minBatteryPercent ?? 20;
    const respectLowPower = this.config.respectLowPowerMode ?? true;

    if (wifiOnly && !conditions.isWifi) return "Not on WiFi";
    if (conditions.batteryLevel < minBattery) {
      return `Battery too low (${String(conditions.batteryLevel)}% < ${String(minBattery)}%)`;
    }
    if (respectLowPower && conditions.isLowPowerMode) return "Low power mode enabled";
    return "Unknown condition failure";
  }

  private async checkAndDownload(): Promise<UpdateInfo | null> {
    const { BundleNudge } = await import("../bundlenudge"); // Dynamic import to avoid circular deps
    const instance = BundleNudge.getInstance();
    const update = await instance.checkForUpdate();
    if (!update) return null;
    await instance.downloadAndInstall(update); // Download silently
    return update;
  }
}

/** Convenience function for one-off preload attempt. */
export async function preloadUpdate(config: PreloadConfig): Promise<PreloadResult> {
  return new PreloadManager(config).preload();
}
