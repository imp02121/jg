/* eslint-disable @typescript-eslint/no-empty-function */
/**
 * Native Module Core Tests
 *
 * Tests for getNativeModule and getModuleWithFallback functions.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GlobalWithDev } from "./global";

// Typed global reference for __DEV__ access
const typedGlobal = globalThis as unknown as GlobalWithDev;

// Store original __DEV__ value
const originalDev = typedGlobal.__DEV__;

// Default mock for react-native - null module
const mockNativeModules: { BundleNudge: unknown } = { BundleNudge: null };
vi.mock("react-native", () => ({
  NativeModules: mockNativeModules,
  Platform: { OS: "ios" },
}));

describe("native-module core", () => {
  beforeEach(() => {
    vi.resetModules();
    typedGlobal.__DEV__ = true;
  });

  afterEach(() => {
    typedGlobal.__DEV__ = originalDev;
    vi.clearAllMocks();
  });

  describe("getNativeModule", () => {
    it("returns null when native module not available", async () => {
      mockNativeModules.BundleNudge = null;
      vi.resetModules();
      const { getNativeModule } = await import("./native-module");
      const result = getNativeModule();

      expect(result).toBeNull();
    });

    it("logs warning in dev mode when module not available", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      typedGlobal.__DEV__ = true;
      mockNativeModules.BundleNudge = null;

      vi.resetModules();
      const { getNativeModule } = await import("./native-module");
      getNativeModule();

      // Logger outputs: '[BundleNudge]', 'message', '' (context)
      expect(consoleSpy).toHaveBeenCalledWith(
        "[BundleNudge]",
        expect.stringContaining("Native module not found"),
        "",
      );
      consoleSpy.mockRestore();
    });

    it("does not log warning in production mode", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      typedGlobal.__DEV__ = false;
      mockNativeModules.BundleNudge = null;

      vi.resetModules();
      const { getNativeModule } = await import("./native-module");
      getNativeModule();

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("returns native module when available", async () => {
      const mockModule = {
        getConfiguration: vi.fn(),
        getCurrentBundleInfo: vi.fn(),
        getBundlePath: vi.fn(),
        notifyAppReady: vi.fn(),
        restartApp: vi.fn(),
        clearUpdates: vi.fn(),
        saveBundleToStorage: vi.fn(),
      };

      mockNativeModules.BundleNudge = mockModule;
      vi.resetModules();
      const { getNativeModule } = await import("./native-module");
      const result = getNativeModule();

      expect(result).toBe(mockModule);
    });
  });

  describe("getModuleWithFallback", () => {
    it("returns fallback when native not available", async () => {
      mockNativeModules.BundleNudge = null;
      vi.resetModules();
      const { getModuleWithFallback } = await import("./native-module");
      const { module, isNative } = getModuleWithFallback();

      expect(isNative).toBe(false);
      expect(module).toBeDefined();

      const config = await module.getConfiguration();
      expect(config.appVersion).toBe("1.0.0");
    });

    it("returns native module when available", async () => {
      const mockModule = {
        getConfiguration: vi.fn().mockResolvedValue({
          appVersion: "2.0.0",
          buildNumber: "10",
          bundleId: "com.native.app",
        }),
        getCurrentBundleInfo: vi.fn(),
        getBundlePath: vi.fn(),
        notifyAppReady: vi.fn(),
        restartApp: vi.fn(),
        clearUpdates: vi.fn(),
        saveBundleToStorage: vi.fn(),
      };

      mockNativeModules.BundleNudge = mockModule;
      vi.resetModules();
      const { getModuleWithFallback } = await import("./native-module");
      const { module, isNative } = getModuleWithFallback();

      expect(isNative).toBe(true);
      // Module is wrapped for error handling, so check interface presence
      expect(module.getConfiguration).toBeDefined();
      expect(module.restartApp).toBeDefined();
    });
  });
});
