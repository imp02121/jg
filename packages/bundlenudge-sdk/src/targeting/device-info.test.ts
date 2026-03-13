/**
 * Device Info Tests
 *
 * Tests for device attribute collection module.
 */

import { NativeModules, Platform } from "react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  collectDeviceInfo,
  collectDeviceModel,
  collectLocale,
  collectOsVersion,
  collectTimezone,
} from "./device-info";

// Mock react-native
vi.mock("react-native", () => ({
  Platform: {
    OS: "ios",
    Version: "17.0",
  },
  NativeModules: {
    SettingsManager: null,
    I18nManager: null,
    PlatformConstants: null,
  },
}));

describe("Device Info", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset Platform mock
    vi.mocked(Platform).OS = "ios";
    vi.mocked(Platform).Version = "17.0";
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("collectOsVersion", () => {
    it("returns iOS version as string", () => {
      vi.mocked(Platform).Version = "17.0";
      expect(collectOsVersion()).toBe("17.0");
    });

    it("returns Android API level as string", () => {
      vi.mocked(Platform).Version = 34;
      expect(collectOsVersion()).toBe("34");
    });

    it("handles numeric version", () => {
      vi.mocked(Platform).Version = 16;
      expect(collectOsVersion()).toBe("16");
    });
  });

  describe("collectLocale", () => {
    it("returns default when Intl unavailable", () => {
      const originalIntl = global.Intl;
      // @ts-expect-error - Testing undefined Intl
      global.Intl = undefined;

      expect(collectLocale()).toBe("en-US");

      global.Intl = originalIntl;
    });

    it("uses Intl API when available", () => {
      const mockDateTimeFormat = vi.fn(() => ({
        resolvedOptions: () => ({ locale: "fr-FR" }),
      }));
      vi.stubGlobal("Intl", { DateTimeFormat: mockDateTimeFormat });

      expect(collectLocale()).toBe("fr-FR");

      vi.unstubAllGlobals();
    });

    it("falls back to iOS SettingsManager", () => {
      // Disable Intl
      vi.stubGlobal("Intl", {
        DateTimeFormat: () => ({ resolvedOptions: () => ({}) }),
      });

      vi.mocked(Platform).OS = "ios";
      vi.mocked(NativeModules).SettingsManager = {
        settings: { AppleLocale: "de_DE" },
      };

      expect(collectLocale()).toBe("de-DE");

      vi.unstubAllGlobals();
    });

    it("falls back to iOS AppleLanguages array", () => {
      vi.stubGlobal("Intl", {
        DateTimeFormat: () => ({ resolvedOptions: () => ({}) }),
      });

      vi.mocked(Platform).OS = "ios";
      vi.mocked(NativeModules).SettingsManager = {
        settings: { AppleLanguages: ["ja_JP", "en_US"] },
      };

      expect(collectLocale()).toBe("ja-JP");

      vi.unstubAllGlobals();
    });

    it("falls back to Android I18nManager", () => {
      vi.stubGlobal("Intl", {
        DateTimeFormat: () => ({ resolvedOptions: () => ({}) }),
      });

      vi.mocked(Platform).OS = "android";
      vi.mocked(NativeModules).I18nManager = {
        localeIdentifier: "es_ES",
      };

      expect(collectLocale()).toBe("es-ES");

      vi.unstubAllGlobals();
    });

    it("returns default when all fallbacks fail", () => {
      vi.stubGlobal("Intl", {
        DateTimeFormat: () => ({ resolvedOptions: () => ({}) }),
      });

      vi.mocked(Platform).OS = "ios";
      vi.mocked(NativeModules).SettingsManager = null;

      expect(collectLocale()).toBe("en-US");

      vi.unstubAllGlobals();
    });
  });

  describe("collectTimezone", () => {
    it("uses Intl API when available", () => {
      vi.stubGlobal("Intl", {
        DateTimeFormat: () => ({
          resolvedOptions: () => ({ timeZone: "America/New_York" }),
        }),
      });

      expect(collectTimezone()).toBe("America/New_York");

      vi.unstubAllGlobals();
    });

    it("returns UTC when Intl unavailable", () => {
      vi.stubGlobal("Intl", {
        DateTimeFormat: () => ({ resolvedOptions: () => ({}) }),
      });

      expect(collectTimezone()).toBe("UTC");

      vi.unstubAllGlobals();
    });

    it("returns UTC when Intl throws", () => {
      vi.stubGlobal("Intl", {
        DateTimeFormat: () => {
          throw new Error("Not supported");
        },
      });

      expect(collectTimezone()).toBe("UTC");

      vi.unstubAllGlobals();
    });
  });

  describe("collectDeviceModel", () => {
    it("returns iOS interface idiom", () => {
      vi.mocked(Platform).OS = "ios";
      vi.mocked(NativeModules).PlatformConstants = {
        interfaceIdiom: "phone",
      };

      expect(collectDeviceModel()).toBe("iOS phone");
    });

    it("returns Android Model", () => {
      vi.mocked(Platform).OS = "android";
      vi.mocked(NativeModules).PlatformConstants = {
        Model: "Pixel 8",
      };

      expect(collectDeviceModel()).toBe("Pixel 8");
    });

    it("falls back to Android Brand", () => {
      vi.mocked(Platform).OS = "android";
      vi.mocked(NativeModules).PlatformConstants = {
        Brand: "Samsung",
      };

      expect(collectDeviceModel()).toBe("Samsung");
    });

    it("returns unknown when no native info available", () => {
      vi.mocked(Platform).OS = "android";
      vi.mocked(NativeModules).PlatformConstants = null;

      expect(collectDeviceModel()).toBe("unknown");
    });
  });

  describe("collectDeviceInfo", () => {
    it("returns complete DeviceAttributes object", () => {
      vi.mocked(Platform).OS = "ios";
      vi.mocked(Platform).Version = "17.2";
      vi.mocked(NativeModules).PlatformConstants = {
        interfaceIdiom: "phone",
      };

      vi.stubGlobal("Intl", {
        DateTimeFormat: () => ({
          resolvedOptions: () => ({
            locale: "en-GB",
            timeZone: "Europe/London",
          }),
        }),
      });

      const result = collectDeviceInfo({
        deviceId: "test-device-123",
        appVersion: "2.1.0",
        currentBundleVersion: "1.5.0",
      });

      expect(result).toEqual({
        deviceId: "test-device-123",
        os: "ios",
        osVersion: "17.2",
        deviceModel: "iOS phone",
        timezone: "Europe/London",
        locale: "en-GB",
        appVersion: "2.1.0",
        currentBundleVersion: "1.5.0",
      });

      vi.unstubAllGlobals();
    });

    it("handles null currentBundleVersion", () => {
      const result = collectDeviceInfo({
        deviceId: "device-456",
        appVersion: "1.0.0",
        currentBundleVersion: null,
      });

      expect(result.currentBundleVersion).toBeNull();
    });

    it("normalizes android platform", () => {
      vi.mocked(Platform).OS = "android";

      const result = collectDeviceInfo({
        deviceId: "android-device",
        appVersion: "3.0.0",
        currentBundleVersion: null,
      });

      expect(result.os).toBe("android");
    });

    it("handles graceful fallbacks for all fields", () => {
      // Clear all native modules
      vi.mocked(NativeModules).PlatformConstants = null;
      vi.mocked(NativeModules).SettingsManager = null;
      vi.mocked(NativeModules).I18nManager = null;

      vi.stubGlobal("Intl", {
        DateTimeFormat: () => ({ resolvedOptions: () => ({}) }),
      });

      const result = collectDeviceInfo({
        deviceId: "fallback-device",
        appVersion: "1.0.0",
        currentBundleVersion: null,
      });

      expect(result.locale).toBe("en-US");
      expect(result.timezone).toBe("UTC");
      expect(result.deviceModel).toBe("unknown");

      vi.unstubAllGlobals();
    });
  });
});
