/**
 * Preload Tests - Background/silent download functionality.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GlobalWithDev } from "../global";
(globalThis as unknown as GlobalWithDev).__DEV__ = true;

const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock("react-native", () => ({
  NativeModules: {
    BundleNudge: null,
    BundleNudgeDevice: {
      getNetworkType: vi.fn(),
      getBatteryLevel: vi.fn(),
      isLowPowerMode: vi.fn(),
      isCharging: vi.fn(),
    },
  },
  Platform: { OS: "ios" },
  AppState: {
    currentState: "active",
    addEventListener: vi.fn(() => ({ remove: vi.fn() })),
  },
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../utils", () => ({
  generateDeviceId: () => "mock-device-id",
  retry: async <T>(fn: () => Promise<T>) => fn(),
  sha256: async () => "mock-hash",
  arrayBufferToBase64: () => "base64data",
}));

import { NativeModules } from "react-native";
import {
  type DeviceConditions,
  type PreloadConfig,
  getDeviceConditions,
  shouldDownload,
} from "./conditions";
import { PreloadManager, preloadUpdate } from "./preload";

const mockNativeDevice = NativeModules.BundleNudgeDevice as {
  getNetworkType: ReturnType<typeof vi.fn>;
  getBatteryLevel: ReturnType<typeof vi.fn>;
  isLowPowerMode: ReturnType<typeof vi.fn>;
  isCharging: ReturnType<typeof vi.fn>;
};

function setupMocks(): void {
  mockNativeDevice.getNetworkType.mockResolvedValue("wifi");
  mockNativeDevice.getBatteryLevel.mockResolvedValue(80);
  mockNativeDevice.isLowPowerMode.mockResolvedValue(false);
  mockNativeDevice.isCharging.mockResolvedValue(false);
  mockFetch.mockImplementation((url: string) => {
    if (url.includes("/devices/register")) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            accessToken: "test-token",
            expiresAt: Date.now() + 3600000,
          }),
      });
    }
    if (url.includes("/updates/check")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ updateAvailable: false }),
      });
    }
    return Promise.resolve({ ok: true });
  });
}

describe("conditions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("getDeviceConditions", () => {
    it("returns values from native module", async () => {
      mockNativeDevice.getNetworkType.mockResolvedValue("wifi");
      mockNativeDevice.getBatteryLevel.mockResolvedValue(80);
      mockNativeDevice.isLowPowerMode.mockResolvedValue(false);
      mockNativeDevice.isCharging.mockResolvedValue(true);
      const conditions = await getDeviceConditions();
      expect(conditions).toEqual({
        isWifi: true,
        batteryLevel: 80,
        isLowPowerMode: false,
        isCharging: true,
      });
    });

    it("returns isWifi false when on cellular", async () => {
      mockNativeDevice.getNetworkType.mockResolvedValue("cellular");
      mockNativeDevice.getBatteryLevel.mockResolvedValue(100);
      mockNativeDevice.isLowPowerMode.mockResolvedValue(false);
      mockNativeDevice.isCharging.mockResolvedValue(false);
      expect((await getDeviceConditions()).isWifi).toBe(false);
    });
  });

  describe("shouldDownload", () => {
    const baseConditions: DeviceConditions = {
      isWifi: true,
      batteryLevel: 80,
      isLowPowerMode: false,
      isCharging: false,
    };
    const baseConfig: PreloadConfig = {
      enabled: true,
      wifiOnly: true,
      minBatteryPercent: 20,
      respectLowPowerMode: true,
    };

    it("returns true when all conditions met", () => {
      expect(shouldDownload(baseConditions, baseConfig)).toBe(true);
    });
    it("returns false when on cellular and wifiOnly is true", () => {
      expect(shouldDownload({ ...baseConditions, isWifi: false }, baseConfig)).toBe(false);
    });
    it("returns true when on cellular and wifiOnly is false", () => {
      expect(
        shouldDownload({ ...baseConditions, isWifi: false }, { ...baseConfig, wifiOnly: false }),
      ).toBe(true);
    });
    it("returns false when battery is low", () => {
      expect(shouldDownload({ ...baseConditions, batteryLevel: 15 }, baseConfig)).toBe(false);
    });
    it("returns true when battery exactly at minimum", () => {
      expect(shouldDownload({ ...baseConditions, batteryLevel: 20 }, baseConfig)).toBe(true);
    });
    it("returns false when low power mode enabled", () => {
      expect(shouldDownload({ ...baseConditions, isLowPowerMode: true }, baseConfig)).toBe(false);
    });
    it("returns true when low power mode enabled but not respected", () => {
      expect(
        shouldDownload(
          { ...baseConditions, isLowPowerMode: true },
          { ...baseConfig, respectLowPowerMode: false },
        ),
      ).toBe(true);
    });
    it("uses default values when config options not specified", () => {
      expect(shouldDownload(baseConditions, { enabled: true })).toBe(true);
    });
  });
});

describe("PreloadManager", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    setupMocks();
    const { BundleNudge } = await import("../bundlenudge");
    // @ts-expect-error - accessing private static for testing
    BundleNudge.instance = null;
    await BundleNudge.initialize({ appId: "test-app", checkOnLaunch: false });
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("shouldPreload", () => {
    it("returns false when preload disabled", async () => {
      const result = await new PreloadManager({
        enabled: false,
      }).shouldPreload();
      expect(result).toEqual({ should: false, reason: "Preload disabled" });
    });

    it("returns true when conditions met", async () => {
      const result = await new PreloadManager({
        enabled: true,
      }).shouldPreload();
      expect(result).toEqual({ should: true, reason: "Conditions met" });
    });

    it("returns false with reason when on cellular", async () => {
      mockNativeDevice.getNetworkType.mockResolvedValue("cellular");
      const result = await new PreloadManager({
        enabled: true,
        wifiOnly: true,
      }).shouldPreload();
      expect(result).toEqual({ should: false, reason: "Not on WiFi" });
    });
  });

  describe("preload", () => {
    it("skips when disabled", async () => {
      const result = await new PreloadManager({ enabled: false }).preload();
      expect(result).toEqual({
        success: false,
        skipped: true,
        reason: "Preload disabled",
      });
    });

    it("skips when conditions not met", async () => {
      mockNativeDevice.getBatteryLevel.mockResolvedValue(10);
      const result = await new PreloadManager({
        enabled: true,
        minBatteryPercent: 20,
      }).preload();
      expect(result.success).toBe(false);
      expect(result.skipped).toBe(true);
      expect(result.reason).toContain("Battery too low");
    });

    it("returns success with skipped when no update available", async () => {
      const result = await new PreloadManager({ enabled: true }).preload();
      expect(result).toEqual({
        success: true,
        skipped: true,
        reason: "No update available",
      });
    });
  });
});

describe("preloadUpdate", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    setupMocks();
    const { BundleNudge } = await import("../bundlenudge");
    // @ts-expect-error - accessing private static for testing
    BundleNudge.instance = null;
    await BundleNudge.initialize({ appId: "test-app", checkOnLaunch: false });
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("works as convenience function", async () => {
    const result = await preloadUpdate({ enabled: true });
    expect(result).toEqual({
      success: true,
      skipped: true,
      reason: "No update available",
    });
  });

  it("respects disabled config", async () => {
    const result = await preloadUpdate({ enabled: false });
    expect(result).toEqual({
      success: false,
      skipped: true,
      reason: "Preload disabled",
    });
  });
});
