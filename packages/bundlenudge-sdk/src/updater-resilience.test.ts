/**
 * Updater Resilience Tests (Fixes #61, #65, #66)
 *
 * Tests for retry on bundle download, native module timeout,
 * and safe device info collection.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Storage } from "./storage";
import type { NativeModuleInterface, UpdateInfo } from "./types";
import { Updater } from "./updater";

const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock("react-native", () => ({ Platform: { OS: "ios" } }));

vi.mock("./utils", () => ({
  retry: async <T>(fn: () => Promise<T>, opts?: { onRetry?: (a: number, e: Error) => void }) => {
    let lastErr: Error = new Error("no attempts");
    for (let i = 1; i <= 3; i++) {
      try {
        return await fn();
      } catch (e) {
        lastErr = e instanceof Error ? e : new Error(String(e));
        if (i < 3) opts?.onRetry?.(i, lastErr);
      }
    }
    throw lastErr;
  },
}));

vi.mock("./targeting/device-info", () => ({
  collectOsVersion: vi.fn().mockReturnValue("17.0"),
  collectDeviceModel: vi.fn().mockReturnValue("iPhone 15"),
  collectTimezone: vi.fn().mockReturnValue("UTC"),
  collectLocale: vi.fn().mockReturnValue("en-US"),
}));

const mockUpdate: UpdateInfo = {
  version: "2.0.0",
  bundleUrl: "https://cdn.example.com/bundle.js",
  bundleSize: 1024,
  bundleHash: "abc123",
  releaseId: "r-1",
};

describe("Updater Resilience", () => {
  let mockStorage: Storage;
  let mockNative: NativeModuleInterface;
  let updater: Updater;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage = {
      getDeviceId: vi.fn().mockReturnValue("d-1"),
      getAccessToken: vi.fn().mockReturnValue("tok"),
      getCurrentVersion: vi.fn().mockReturnValue("1.0.0"),
      setPendingUpdate: vi.fn().mockResolvedValue(undefined),
      getMetadata: vi.fn().mockReturnValue({
        storedRuntimeFingerprint: null,
        expectedNativeModules: null,
      }),
      updateMetadata: vi.fn().mockResolvedValue(undefined),
    } as unknown as Storage;

    mockNative = {
      getConfiguration: vi.fn().mockResolvedValue({
        appVersion: "3.0.0",
        buildNumber: "10",
        bundleId: "com.test",
      }),
      setUpdateInfo: vi.fn().mockResolvedValue(true),
      downloadBundleToStorage: vi.fn().mockResolvedValue({
        path: "/b/bundle.js",
        hash: "abc123",
      }),
      addListener: vi.fn(),
      removeListeners: vi.fn(),
    } as unknown as NativeModuleInterface;

    updater = new Updater({
      storage: mockStorage,
      config: { appId: "test-app" },
      nativeModule: mockNative,
    });

    mockFetch.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Fix #61: Retry on bundle download failure", () => {
    it("retries and succeeds on transient failure", async () => {
      let calls = 0;
      mockNative.downloadBundleToStorage = vi.fn().mockImplementation(async () => {
        calls++;
        if (calls < 3) throw new Error("Network error");
        return { path: "/b/bundle.js", hash: "abc123" };
      });

      await updater.downloadAndInstall(mockUpdate);
      expect(calls).toBe(3);
      expect(mockStorage.setPendingUpdate).toHaveBeenCalled();
    });

    it("throws after all retry attempts exhausted", async () => {
      mockNative.downloadBundleToStorage = vi
        .fn()
        .mockRejectedValue(new Error("persistent failure"));

      await expect(updater.downloadAndInstall(mockUpdate)).rejects.toThrow("Download failed");
    });
  });

  describe("Fix #65: Native module timeout", () => {
    it("times out if native call hangs forever", async () => {
      const { NativeTimeoutError } = await import("./timeout-utils");
      mockNative.downloadBundleToStorage = vi
        .fn()
        .mockRejectedValue(new NativeTimeoutError(30000, "Bundle download timed out for 2.0.0"));

      await expect(updater.downloadAndInstall(mockUpdate)).rejects.toThrow("Download failed");
      expect(mockNative.downloadBundleToStorage).toHaveBeenCalledTimes(3);
    });
  });

  describe("Fix #66: Safe device info collection", () => {
    it("does not crash update check if device info throws", async () => {
      const deviceInfo = await import("./targeting/device-info");
      (deviceInfo.collectOsVersion as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error("native crash");
      });

      mockFetch.mockImplementation((url: string) => {
        if (url.includes("/updates/check")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ updateAvailable: false }),
          });
        }
        return Promise.resolve({ ok: true });
      });

      const result = await updater.checkForUpdate();
      expect(result.updateAvailable).toBe(false);
    });
  });
});
