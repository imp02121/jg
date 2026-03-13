/* eslint-disable @typescript-eslint/no-empty-function */
/**
 * Native Module Fallback Tests
 *
 * Tests for the createFallbackModule function and its behavior.
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

describe("createFallbackModule", () => {
  beforeEach(() => {
    vi.resetModules();
    typedGlobal.__DEV__ = true;
  });

  afterEach(() => {
    typedGlobal.__DEV__ = originalDev;
    vi.clearAllMocks();
  });

  it("returns configuration with default values", async () => {
    vi.resetModules();
    const { createFallbackModule } = await import("./native-module");
    const fallback = createFallbackModule();

    const config = await fallback.getConfiguration();
    expect(config.appVersion).toBe("1.0.0");
    expect(config.buildNumber).toBe("1");
    expect(config.bundleId).toBe("com.unknown.app");
  });

  it("returns null for getCurrentBundleInfo", async () => {
    const { createFallbackModule } = await import("./native-module");
    const fallback = createFallbackModule();

    const result = await fallback.getCurrentBundleInfo();
    expect(result).toBeNull();
  });

  it("returns null for getBundlePath", async () => {
    const { createFallbackModule } = await import("./native-module");
    const fallback = createFallbackModule();

    const result = await fallback.getBundlePath();
    expect(result).toBeNull();
  });

  it("notifyAppReady returns true", async () => {
    const { createFallbackModule } = await import("./native-module");
    const fallback = createFallbackModule();

    const result = await fallback.notifyAppReady();
    expect(result).toBe(true);
  });

  it("restartApp logs warning and returns false", async () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    typedGlobal.__DEV__ = true;

    const { createFallbackModule } = await import("./native-module");
    const fallback = createFallbackModule();

    const result = await fallback.restartApp(true);

    expect(result).toBe(false);
    // Logger outputs: '[BundleNudge]', 'message', '' (context)
    expect(consoleSpy).toHaveBeenCalledWith(
      "[BundleNudge]",
      "restartApp called but native module not available",
      "",
    );
    consoleSpy.mockRestore();
  });

  it("clearUpdates logs warning and returns false", async () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    typedGlobal.__DEV__ = true;

    const { createFallbackModule } = await import("./native-module");
    const fallback = createFallbackModule();

    const result = await fallback.clearUpdates();

    expect(result).toBe(false);
    // Logger outputs: '[BundleNudge]', 'message', '' (context)
    expect(consoleSpy).toHaveBeenCalledWith(
      "[BundleNudge]",
      "clearUpdates called but native module not available",
      "",
    );
    consoleSpy.mockRestore();
  });

  it("saveBundleToStorage logs warning and returns empty string", async () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    typedGlobal.__DEV__ = true;

    const { createFallbackModule } = await import("./native-module");
    const fallback = createFallbackModule();

    const result = await fallback.saveBundleToStorage("1.0.0", "base64data");

    expect(result).toBe("");
    // Logger outputs: '[BundleNudge]', 'message', '' (context)
    expect(consoleSpy).toHaveBeenCalledWith(
      "[BundleNudge]",
      "saveBundleToStorage called but native module not available",
      "",
    );
    consoleSpy.mockRestore();
  });
});
