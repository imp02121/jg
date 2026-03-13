/**
 * BundleNudge Initialization
 *
 * Initialization helpers for the BundleNudge SDK.
 * Handles device registration, health monitor setup, and component creation.
 */

import { Platform } from "react-native";
import { BundleValidator } from "./bundle-validator";
import { deviceRegisterResponseSchema } from "./bundlenudge-helpers";
import type { CrashDetector } from "./crash-detector";
import { logInfo, logWarn } from "./debug/logger";
import { fetchWithTimeout } from "./fetch-utils";
import { HealthConfigFetcher } from "./health-config";
import { HealthMonitor } from "./health-monitor";
import { getModuleWithFallback } from "./native-module";
import type { Storage } from "./storage";
import type { BundleNudgeConfig, NativeModuleInterface } from "./types";
import { VersionGuard } from "./version-guard";

/**
 * Context for initialization functions.
 */
export interface InitContext {
  config: BundleNudgeConfig;
  storage: Storage;
  nativeModule: NativeModuleInterface | null;
  crashDetector: CrashDetector;
  cachedNativeConfig: { appVersion: string; buildNumber: string } | null;
}

/**
 * Register the device with the BundleNudge API.
 * Stores the access token for future API calls.
 */
export async function registerDevice(ctx: InitContext): Promise<void> {
  const apiUrl = ctx.config.apiUrl ?? "https://api.bundlenudge.com";
  try {
    const nativeConfig = await ctx.nativeModule?.getConfiguration();
    const body = {
      appId: ctx.config.appId,
      deviceId: ctx.storage.getDeviceId(),
      platform: Platform.OS,
      appVersion: nativeConfig?.appVersion ?? "1.0.0",
    };
    const response = await fetchWithTimeout(`${apiUrl}/v1/devices/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      logWarn(
        `Device registration failed with status ${String(response.status)}. Updates will not be personalized.`,
      );
      return;
    }
    const rawData: unknown = await response.json();
    const parsed = deviceRegisterResponseSchema.safeParse(rawData);
    if (!parsed.success) {
      logWarn("Device registration returned invalid response. Updates will not be personalized.");
      return;
    }
    await ctx.storage.setAccessToken(parsed.data.accessToken);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logWarn(
      `Device registration failed: ${message}. SDK will continue without personalized updates.`,
    );
  }
}

/**
 * Initialize the health monitor with configuration from the API.
 */
export async function initHealthMonitor(ctx: InitContext): Promise<HealthMonitor | null> {
  const apiUrl = ctx.config.apiUrl ?? "https://api.bundlenudge.com";
  const fetcher = new HealthConfigFetcher({
    apiUrl,
    appId: ctx.config.appId,
    getAccessToken: () => ctx.storage.getAccessToken(),
  });
  const config = await fetcher.fetchConfig();
  if (config.events.length === 0 && config.endpoints.length === 0) {
    return null; // No config, skip
  }
  return new HealthMonitor({
    events: config.events,
    endpoints: config.endpoints,
    crashDetector: ctx.crashDetector,
    onAllPassed: () => {
      logInfo("Health checks passed, update verified");
    },
  });
}

/**
 * Create a VersionGuard for detecting App Store updates.
 */
export function createVersionGuard(ctx: InitContext): VersionGuard {
  return new VersionGuard(ctx.storage, {
    getCurrentVersion: () => {
      const cfg = ctx.cachedNativeConfig;
      return {
        appVersion: cfg?.appVersion ?? "1.0.0",
        buildNumber: cfg?.buildNumber ?? "1",
        recordedAt: Date.now(),
      };
    },
    onNativeUpdateDetected: () => {
      logInfo("App Store update detected, cleared OTA bundles");
    },
  });
}

/**
 * Create a BundleValidator for verifying bundle integrity.
 *
 * @param storage - Storage instance for retrieving bundle hashes
 * @param nativeModule - Native module for file hashing
 * @param allowLegacyBundles - Allow unverified bundles (NOT recommended)
 */
export function createBundleValidator(
  storage: Storage,
  nativeModule: NativeModuleInterface | null,
  allowLegacyBundles = false,
): BundleValidator {
  return new BundleValidator(storage, {
    hashFile: async (path: string) => {
      if (!nativeModule) return "";
      return nativeModule.hashFile(path);
    },
    onValidationFailed: (version) => {
      logWarn(`Bundle ${version} failed validation`);
    },
    allowLegacyBundles,
  });
}

/**
 * Create the native module proxy.
 * Returns both the module and a setter callback.
 */
export function createNativeModuleProxy(): {
  module: NativeModuleInterface;
  setModule: (m: NativeModuleInterface) => void;
  getModule: () => NativeModuleInterface | null;
} {
  const { module } = getModuleWithFallback();
  let storedModule: NativeModuleInterface | null = module;
  return {
    module,
    setModule: (m: NativeModuleInterface) => {
      storedModule = m;
    },
    getModule: () => storedModule,
  };
}
