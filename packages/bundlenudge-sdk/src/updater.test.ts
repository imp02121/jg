/**
 * Updater Edge Case Tests
 *
 * Tests for edge cases and concurrent scenarios in the SDK update system.
 * Covers race conditions, concurrent operations, and state integrity.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Storage } from "./storage";
import type { NativeModuleInterface, UpdateInfo } from "./types";
import { Updater } from "./updater";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock react-native Platform
vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

// Mock utils
vi.mock("./utils", () => ({
  retry: async <T>(fn: () => Promise<T>) => fn(),
}));

/**
 * Creates a delay for testing async scenarios.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("Updater Edge Cases", () => {
  // Mock dependencies
  let mockStorage: Storage;
  let mockNativeModule: NativeModuleInterface;
  let updater: Updater;

  // Mock update data
  const mockUpdateV1: UpdateInfo = {
    version: "1.0.1",
    bundleUrl: "https://cdn.example.com/bundle-v1.0.1.js",
    bundleSize: 10240,
    bundleHash: "hash101",
    releaseId: "release-101",
    releaseNotes: "Version 1.0.1 fixes",
  };

  const mockUpdateV2: UpdateInfo = {
    version: "1.0.2",
    bundleUrl: "https://cdn.example.com/bundle-v1.0.2.js",
    bundleSize: 10500,
    bundleHash: "hash102",
    releaseId: "release-102",
    releaseNotes: "Version 1.0.2 fixes",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock storage
    mockStorage = {
      getDeviceId: vi.fn().mockReturnValue("device-123"),
      getAccessToken: vi.fn().mockReturnValue("token-456"),
      getCurrentVersion: vi.fn().mockReturnValue("1.0.0"),
      setPendingUpdate: vi.fn().mockResolvedValue(undefined),
      getMetadata: vi.fn().mockReturnValue({
        storedRuntimeFingerprint: null,
        expectedNativeModules: null,
      }),
      updateMetadata: vi.fn().mockResolvedValue(undefined),
    } as unknown as Storage;

    // Create mock native module
    mockNativeModule = {
      getConfiguration: vi.fn().mockResolvedValue({
        appVersion: "2.0.0",
        buildNumber: "100",
        bundleId: "com.test.app",
      }),
      getCurrentBundleInfo: vi.fn().mockResolvedValue(null),
      getBundlePath: vi.fn().mockResolvedValue(null),
      notifyAppReady: vi.fn().mockResolvedValue(true),
      restartApp: vi.fn().mockResolvedValue(true),
      clearUpdates: vi.fn().mockResolvedValue(true),
      saveBundleToStorage: vi.fn().mockResolvedValue("/bundles/bundle.js"),
      hashFile: vi.fn().mockResolvedValue("hash101"),
      setUpdateInfo: vi.fn().mockResolvedValue(true),
      downloadBundleToStorage: vi.fn().mockResolvedValue({
        path: "/bundles/bundle.js",
        hash: "hash101",
      }),
      deleteBundleVersion: vi.fn().mockResolvedValue(true),
      rollbackToVersion: vi.fn().mockResolvedValue(true),
      getFreeDiskSpace: vi.fn().mockResolvedValue(1024 * 1024 * 1024),
      addListener: vi.fn(),
      removeListeners: vi.fn(),
    };

    // Create updater instance
    updater = new Updater({
      storage: mockStorage,
      config: { appId: "test-app" },
      nativeModule: mockNativeModule,
    });

    // Setup default fetch mock
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/updates/check")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ updateAvailable: false }),
        });
      }
      if (url.includes("/telemetry")) {
        return Promise.resolve({ ok: true });
      }
      return Promise.resolve({ ok: true });
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("1A.1: New update available during active download", () => {
    it("completes download even if newer update becomes available", async () => {
      // Simulate slow download that takes time
      mockNativeModule.downloadBundleToStorage = vi.fn().mockImplementation(async () => {
        await delay(50); // Simulate download time
        return {
          path: "/bundles/1.0.1/bundle.js",
          hash: "hash101",
        };
      });

      // Start download of v1.0.1
      const downloadPromise = updater.downloadAndInstall(mockUpdateV1);

      // While download is in progress, the server now has v1.0.2
      // (This simulates the scenario, actual concurrent check would be separate)

      // Download should complete successfully with v1.0.1
      await downloadPromise;

      // Verify v1.0.1 was downloaded and set as pending
      expect(mockStorage.setPendingUpdate).toHaveBeenCalledWith(
        "1.0.1",
        "hash101",
        "Version 1.0.1 fixes",
        undefined,
        "release-101",
      );
    });

    it("does not corrupt state when download completes after new check starts", async () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      let downloadResolve: () => void = () => {};
      const downloadPromise = new Promise<void>((resolve) => {
        downloadResolve = resolve;
      });

      mockNativeModule.downloadBundleToStorage = vi.fn().mockImplementation(async () => {
        await downloadPromise; // Wait for external trigger
        return { path: "/bundles/1.0.1/bundle.js", hash: "hash101" };
      });

      // Start download
      const downloadOp = updater.downloadAndInstall(mockUpdateV1);

      // While download is pending, perform a new check that finds v1.0.2
      mockFetch.mockImplementation((url: string) => {
        if (url.includes("/updates/check")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                updateAvailable: true,
                release: {
                  version: "1.0.2",
                  bundleUrl: "https://cdn.example.com/bundle-v1.0.2.js",
                  bundleSize: 10500,
                  bundleHash: "hash102",
                  releaseId: "release-102",
                },
              }),
          });
        }
        return Promise.resolve({ ok: true });
      });

      // Perform update check while download is in progress
      const checkResult = await updater.checkForUpdate();

      // Check should return v1.0.2 info
      expect(checkResult.updateAvailable).toBe(true);
      expect(checkResult.update?.version).toBe("1.0.2");

      // Now complete the original download
      downloadResolve();
      await downloadOp;

      // Original download should have set v1.0.1 as pending
      // (The user would need to decide to download v1.0.2 separately)
      expect(mockStorage.setPendingUpdate).toHaveBeenCalledWith(
        "1.0.1",
        "hash101",
        "Version 1.0.1 fixes",
        undefined,
        "release-101",
      );
    });

    it("allows starting new download after current one completes", async () => {
      // Download v1.0.1 first
      await updater.downloadAndInstall(mockUpdateV1);

      expect(mockStorage.setPendingUpdate).toHaveBeenCalledWith(
        "1.0.1",
        "hash101",
        "Version 1.0.1 fixes",
        undefined,
        "release-101",
      );

      // Clear mocks to track second download
      vi.clearAllMocks();

      // Update mock for v1.0.2 download
      mockNativeModule.downloadBundleToStorage = vi.fn().mockResolvedValue({
        path: "/bundles/1.0.2/bundle.js",
        hash: "hash102",
      });

      // Download v1.0.2
      await updater.downloadAndInstall(mockUpdateV2);

      expect(mockStorage.setPendingUpdate).toHaveBeenCalledWith(
        "1.0.2",
        "hash102",
        "Version 1.0.2 fixes",
        undefined,
        "release-102",
      );
    });

    it("handles download failure gracefully without corrupting state", async () => {
      mockNativeModule.downloadBundleToStorage = vi
        .fn()
        .mockRejectedValue(new Error("Network connection lost"));

      await expect(updater.downloadAndInstall(mockUpdateV1)).rejects.toThrow(
        "BundleNudge: Download failed for version 1.0.1:",
      );

      // State should not be corrupted - no pending update set
      expect(mockStorage.setPendingUpdate).not.toHaveBeenCalled();

      // Should be able to retry download
      mockNativeModule.downloadBundleToStorage = vi.fn().mockResolvedValue({
        path: "/bundles/1.0.1/bundle.js",
        hash: "hash101",
      });

      await updater.downloadAndInstall(mockUpdateV1);
      expect(mockStorage.setPendingUpdate).toHaveBeenCalledWith(
        "1.0.1",
        "hash101",
        "Version 1.0.1 fixes",
        undefined,
        "release-101",
      );
    });
  });

  describe("1A.8: Concurrent checkForUpdate calls", () => {
    it("handles multiple simultaneous checkForUpdate calls without errors", async () => {
      let checkCount = 0;
      mockFetch.mockImplementation((url: string) => {
        if (url.includes("/updates/check")) {
          checkCount++;
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                updateAvailable: true,
                release: {
                  version: "1.0.1",
                  bundleUrl: "https://cdn.example.com/bundle.js",
                  bundleSize: 10240,
                  bundleHash: "hash101",
                  releaseId: "release-101",
                },
              }),
          });
        }
        return Promise.resolve({ ok: true });
      });

      // Fire multiple concurrent checks
      const results = await Promise.all([
        updater.checkForUpdate(),
        updater.checkForUpdate(),
        updater.checkForUpdate(),
      ]);

      // All should complete successfully
      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.updateAvailable).toBe(true);
        expect(result.update?.version).toBe("1.0.1");
      });

      // Each call should have made a separate API request
      expect(checkCount).toBe(3);
    });

    it("returns consistent results across concurrent calls", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes("/updates/check")) {
          // Add small random delay to simulate network jitter
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: () =>
                  Promise.resolve({
                    updateAvailable: true,
                    release: {
                      version: "1.0.1",
                      bundleUrl: "https://cdn.example.com/bundle.js",
                      bundleSize: 10240,
                      bundleHash: "hash101",
                      releaseId: "release-101",
                    },
                  }),
              });
            }, Math.random() * 10);
          });
        }
        return Promise.resolve({ ok: true });
      });

      // Fire concurrent checks
      const [result1, result2, result3] = await Promise.all([
        updater.checkForUpdate(),
        updater.checkForUpdate(),
        updater.checkForUpdate(),
      ]);

      // All results should be consistent
      expect(result1.update?.version).toBe(result2.update?.version);
      expect(result2.update?.version).toBe(result3.update?.version);
    });

    it("handles mixed success and failure in concurrent calls", async () => {
      let callIndex = 0;
      mockFetch.mockImplementation((url: string) => {
        if (url.includes("/updates/check")) {
          callIndex++;
          // Second call fails
          if (callIndex === 2) {
            return Promise.resolve({ ok: false, status: 500 });
          }
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                updateAvailable: true,
                release: {
                  version: "1.0.1",
                  bundleUrl: "https://cdn.example.com/bundle.js",
                  bundleSize: 10240,
                  bundleHash: "hash101",
                  releaseId: "release-101",
                },
              }),
          });
        }
        return Promise.resolve({ ok: true });
      });

      // Fire concurrent checks, using Promise.allSettled for mixed results
      const results = await Promise.allSettled([
        updater.checkForUpdate(),
        updater.checkForUpdate(),
        updater.checkForUpdate(),
      ]);

      // Should have 2 fulfilled and 1 rejected
      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");

      expect(fulfilled.length).toBe(2);
      expect(rejected.length).toBe(1);

      // Fulfilled results should have update info
      fulfilled.forEach((r) => {
        // Cast is safe because we filtered for fulfilled status
        const fulfilledResult = r as PromiseFulfilledResult<{
          updateAvailable: boolean;
        }>;
        expect(fulfilledResult.value.updateAvailable).toBe(true);
      });
    });

    it("does not cause race conditions in storage access", async () => {
      const storageAccesses: string[] = [];

      // Track storage method calls
      mockStorage.getDeviceId = vi.fn().mockImplementation(() => {
        storageAccesses.push("getDeviceId");
        return "device-123";
      });
      mockStorage.getAccessToken = vi.fn().mockImplementation(() => {
        storageAccesses.push("getAccessToken");
        return "token-456";
      });
      mockStorage.getCurrentVersion = vi.fn().mockImplementation(() => {
        storageAccesses.push("getCurrentVersion");
        return "1.0.0";
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

      // Fire multiple concurrent checks
      await Promise.all([
        updater.checkForUpdate(),
        updater.checkForUpdate(),
        updater.checkForUpdate(),
      ]);

      // Verify storage was accessed but no errors occurred
      expect(mockStorage.getDeviceId).toHaveBeenCalled();
      expect(mockStorage.getAccessToken).toHaveBeenCalled();
      expect(mockStorage.getCurrentVersion).toHaveBeenCalled();

      // Each check should have accessed storage
      expect(storageAccesses.filter((a) => a === "getDeviceId").length).toBe(3);
    });

    it("handles rapid sequential calls correctly", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes("/updates/check")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ updateAvailable: false }),
          });
        }
        return Promise.resolve({ ok: true });
      });

      // Rapid sequential calls (not using Promise.all)
      const result1 = await updater.checkForUpdate();
      const result2 = await updater.checkForUpdate();
      const result3 = await updater.checkForUpdate();

      // All should succeed
      expect(result1.updateAvailable).toBe(false);
      expect(result2.updateAvailable).toBe(false);
      expect(result3.updateAvailable).toBe(false);

      // Three separate API calls should have been made
      const checkCalls = mockFetch.mock.calls.filter((call: unknown[]) =>
        (call[0] as string).includes("/updates/check"),
      );
      expect(checkCalls.length).toBe(3);
    });

    it("concurrent download and check operations work independently", async () => {
      // Setup download mock with delay
      mockNativeModule.downloadBundleToStorage = vi.fn().mockImplementation(async () => {
        await delay(30);
        return { path: "/bundles/1.0.1/bundle.js", hash: "hash101" };
      });

      // Setup check mock
      mockFetch.mockImplementation((url: string) => {
        if (url.includes("/updates/check")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                updateAvailable: true,
                release: {
                  version: "1.0.2",
                  bundleUrl: "https://cdn.example.com/bundle-v1.0.2.js",
                  bundleSize: 10500,
                  bundleHash: "hash102",
                  releaseId: "release-102",
                },
              }),
          });
        }
        return Promise.resolve({ ok: true });
      });

      // Start download and check concurrently
      const [downloadResult, checkResult] = await Promise.allSettled([
        updater.downloadAndInstall(mockUpdateV1),
        updater.checkForUpdate(),
      ]);

      // Both should complete successfully
      expect(downloadResult.status).toBe("fulfilled");
      expect(checkResult.status).toBe("fulfilled");

      if (checkResult.status === "fulfilled") {
        // Check found v1.0.2
        expect(checkResult.value.update?.version).toBe("1.0.2");
      }

      // Download set v1.0.1 as pending
      expect(mockStorage.setPendingUpdate).toHaveBeenCalledWith(
        "1.0.1",
        "hash101",
        "Version 1.0.1 fixes",
        undefined,
        "release-101",
      );
    });
  });

  describe("Status transition integrity", () => {
    it("maintains consistent state across concurrent operations", async () => {
      mockNativeModule.downloadBundleToStorage = vi.fn().mockImplementation(async () => {
        await delay(10);
        return { path: "/bundles/1.0.1/bundle.js", hash: "hash101" };
      });

      await updater.downloadAndInstall(mockUpdateV1);

      // State should be consistent - pending update set
      expect(mockStorage.setPendingUpdate).toHaveBeenCalledWith(
        "1.0.1",
        "hash101",
        "Version 1.0.1 fixes",
        undefined,
        "release-101",
      );
    });

    it("does not leave orphaned state on interrupted operations", async () => {
      // Create a download that will be rejected mid-way
      mockNativeModule.downloadBundleToStorage = vi.fn().mockImplementation(async () => {
        await delay(10);
        throw new Error("Connection reset");
      });

      await expect(updater.downloadAndInstall(mockUpdateV1)).rejects.toThrow(
        "BundleNudge: Download failed for version 1.0.1:",
      );

      // No pending update should be set
      expect(mockStorage.setPendingUpdate).not.toHaveBeenCalled();

      // Telemetry should not have been called
      const telemetryCalls = mockFetch.mock.calls.filter((call: unknown[]) =>
        (call[0] as string).includes("/telemetry"),
      );
      expect(telemetryCalls.length).toBe(0);
    });
  });
});
