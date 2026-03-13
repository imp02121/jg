/** Tests for native module error wrapping. */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { wrapNativeModule } from "./native-module";
import type { NativeModuleInterface } from "./types";

// Mock react-native
vi.mock("react-native", () => ({
  NativeModules: {},
  Platform: { OS: "ios" },
  TurboModuleRegistry: { get: () => null },
}));

describe("wrapNativeModule", () => {
  let mockModule: NativeModuleInterface;

  beforeEach(() => {
    vi.clearAllMocks();
    mockModule = {
      getConfiguration: vi.fn().mockResolvedValue({
        appVersion: "1.0.0",
        buildNumber: "1",
        bundleId: "com.test.app",
      }),
      getCurrentBundleInfo: vi.fn().mockResolvedValue(null),
      getBundlePath: vi.fn().mockResolvedValue("/path/to/bundle"),
      notifyAppReady: vi.fn().mockResolvedValue(true),
      restartApp: vi.fn().mockResolvedValue(true),
      clearUpdates: vi.fn().mockResolvedValue(true),
      saveBundleToStorage: vi.fn().mockResolvedValue("/path"),
      setUpdateInfo: vi.fn().mockResolvedValue(true),
      downloadBundleToStorage: vi.fn().mockResolvedValue({
        path: "/path",
        hash: "abc123",
      }),
      hashFile: vi.fn().mockResolvedValue("abc123"),
      deleteBundleVersion: vi.fn().mockResolvedValue(true),
      rollbackToVersion: vi.fn().mockResolvedValue(true),
      getFreeDiskSpace: vi.fn().mockResolvedValue(1_000_000_000),
      addListener: vi.fn(),
      removeListeners: vi.fn(),
    };
  });

  it("passes through successful calls unchanged", async () => {
    const wrapped = wrapNativeModule(mockModule);
    const config = await wrapped.getConfiguration();
    expect(config.appVersion).toBe("1.0.0");
  });

  it("returns fallback value on rollbackToVersion error", async () => {
    mockModule.rollbackToVersion = vi.fn().mockRejectedValue(new Error("Module not found"));
    const wrapped = wrapNativeModule(mockModule);

    const result = await wrapped.rollbackToVersion("1.0.0");
    expect(result).toBe(false);
  });

  it("returns fallback value on restartApp error", async () => {
    mockModule.restartApp = vi.fn().mockRejectedValue(new Error("Cannot read property"));
    const wrapped = wrapNativeModule(mockModule);

    const result = await wrapped.restartApp(true);
    expect(result).toBe(false);
  });

  it("returns null on getBundlePath error", async () => {
    mockModule.getBundlePath = vi.fn().mockRejectedValue(new Error("Bridge error"));
    const wrapped = wrapNativeModule(mockModule);

    const result = await wrapped.getBundlePath();
    expect(result).toBeNull();
  });

  it("returns -1 on getFreeDiskSpace error", async () => {
    mockModule.getFreeDiskSpace = vi.fn().mockRejectedValue(new Error("Permission denied"));
    const wrapped = wrapNativeModule(mockModule);

    const result = await wrapped.getFreeDiskSpace();
    expect(result).toBe(-1);
  });

  it("propagates errors for critical operations (downloadBundleToStorage)", async () => {
    mockModule.downloadBundleToStorage = vi.fn().mockRejectedValue(new Error("Download failed"));
    const wrapped = wrapNativeModule(mockModule);

    await expect(wrapped.downloadBundleToStorage()).rejects.toThrow("Download failed");
  });

  it("propagates errors for setUpdateInfo", async () => {
    mockModule.setUpdateInfo = vi.fn().mockRejectedValue(new Error("Invalid payload"));
    const wrapped = wrapNativeModule(mockModule);

    await expect(wrapped.setUpdateInfo("{}")).rejects.toThrow("Invalid payload");
  });

  it("returns false on clearUpdates error", async () => {
    mockModule.clearUpdates = vi.fn().mockRejectedValue(new Error("null reference"));
    const wrapped = wrapNativeModule(mockModule);

    const result = await wrapped.clearUpdates();
    expect(result).toBe(false);
  });

  it("returns null on getCurrentBundleInfo error", async () => {
    mockModule.getCurrentBundleInfo = vi.fn().mockRejectedValue(new Error("undefined"));
    const wrapped = wrapNativeModule(mockModule);

    const result = await wrapped.getCurrentBundleInfo();
    expect(result).toBeNull();
  });
});
