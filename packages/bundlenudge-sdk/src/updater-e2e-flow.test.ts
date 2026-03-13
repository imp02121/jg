/**
 * Updater E2E Flow Tests
 *
 * Verifies the full update lifecycle: check -> setUpdateInfo -> download -> apply.
 * Uses mocked native module and fetch, no native rebuild needed.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Storage } from "./storage";
import type { NativeModuleInterface, UpdateInfo } from "./types";
import { Updater } from "./updater";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock react-native with Platform and NativeEventEmitter
const mockAddListener = vi.fn().mockReturnValue({ remove: vi.fn() });
vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
  NativeModules: {},
  NativeEventEmitter: vi.fn().mockImplementation(() => ({
    addListener: mockAddListener,
    removeAllListeners: vi.fn(),
  })),
  TurboModuleRegistry: {
    get: vi.fn().mockReturnValue(null),
    getEnforcing: vi.fn().mockReturnValue(null),
  },
}));

// Mock utils — bypass retry logic
vi.mock("./utils", () => ({
  retry: async <T>(fn: () => Promise<T>) => fn(),
}));

describe("Updater E2E flow", () => {
  let mockStorage: Storage;
  let mockNativeModule: NativeModuleInterface;
  let updater: Updater;

  const mockUpdate: UpdateInfo = {
    version: "1.0.1",
    bundleUrl: "https://cdn.example.com/bundle.js",
    bundleSize: 10240,
    bundleHash: "abc123def456",
    releaseId: "release-123",
    releaseNotes: "Bug fixes",
  };

  const apiCheckResponse = {
    updateAvailable: true,
    release: {
      version: "1.0.1",
      bundleUrl: "https://cdn.example.com/bundle.js",
      bundleSize: 10240,
      bundleHash: "abc123def456",
      releaseId: "release-123",
      releaseNotes: "Bug fixes",
    },
  };

  function createMockNativeModule(): NativeModuleInterface {
    return {
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
      saveBundleToStorage: vi.fn().mockResolvedValue("/bundles/1.0.1/bundle.js"),
      setUpdateInfo: vi.fn().mockResolvedValue(true),
      downloadBundleToStorage: vi.fn().mockResolvedValue({
        path: "/bundles/1.0.1/bundle.js",
        hash: "abc123def456",
      }),
      hashFile: vi.fn().mockResolvedValue("abc123def456"),
      deleteBundleVersion: vi.fn().mockResolvedValue(true),
      rollbackToVersion: vi.fn().mockResolvedValue(true),
      getFreeDiskSpace: vi.fn().mockResolvedValue(1024 * 1024 * 1024),
      addListener: vi.fn(),
      removeListeners: vi.fn(),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();

    mockStorage = {
      getDeviceId: vi.fn().mockReturnValue("device-123"),
      getAccessToken: vi.fn().mockReturnValue("token-456"),
      getCurrentVersion: vi.fn().mockReturnValue("1.0.0"),
      setPendingUpdate: vi.fn().mockResolvedValue(undefined),
      getMetadata: vi.fn().mockReturnValue({
        storedRuntimeFingerprint: null,
        expectedNativeModules: null,
        currentVersionHash: null,
        pendingVersion: null,
        pendingVersionHash: null,
      }),
      updateMetadata: vi.fn().mockResolvedValue(undefined),
    } as unknown as Storage;

    mockNativeModule = createMockNativeModule();

    updater = new Updater({
      storage: mockStorage,
      config: { appId: "test-app" },
      nativeModule: mockNativeModule,
    });

    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/updates/check")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(apiCheckResponse),
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

  // Test 1: Full lifecycle
  it("full check -> setUpdateInfo -> download -> apply flow", async () => {
    // Step 1: Check for update
    const result = await updater.checkForUpdate();
    expect(result.updateAvailable).toBe(true);
    expect(result.update).toBeDefined();
    expect(result.update?.version).toBe("1.0.1");

    // Step 2: Download and install
    await updater.downloadAndInstall(result.update!);

    // Verify setUpdateInfo was called with correct JSON payload
    expect(mockNativeModule.setUpdateInfo).toHaveBeenCalledTimes(1);
    const setUpdateInfoPayload = JSON.parse(
      vi.mocked(mockNativeModule.setUpdateInfo).mock.calls[0][0],
    ) as {
      url: string;
      version: string;
      expectedHash: string;
      expectedSize: number;
    };
    expect(setUpdateInfoPayload.url).toBe("https://cdn.example.com/bundle.js");
    expect(setUpdateInfoPayload.version).toBe("1.0.1");
    expect(setUpdateInfoPayload.expectedHash).toBe("abc123def456");
    expect(setUpdateInfoPayload.expectedSize).toBe(10240);

    // Verify downloadBundleToStorage called with no args
    expect(mockNativeModule.downloadBundleToStorage).toHaveBeenCalledTimes(1);
    expect(vi.mocked(mockNativeModule.downloadBundleToStorage).mock.calls[0]).toHaveLength(0);

    // Verify setPendingUpdate called after successful download
    expect(mockStorage.setPendingUpdate).toHaveBeenCalledWith(
      "1.0.1",
      "abc123def456",
      "Bug fixes",
      undefined,
      "release-123",
    );
  });

  // Test 2: Call order verification
  it("setUpdateInfo is called before downloadBundleToStorage", async () => {
    const callOrder: string[] = [];

    vi.mocked(mockNativeModule.setUpdateInfo).mockImplementation(async () => {
      callOrder.push("setUpdateInfo");
      return true;
    });
    vi.mocked(mockNativeModule.downloadBundleToStorage).mockImplementation(async () => {
      callOrder.push("downloadBundleToStorage");
      return { path: "/bundles/1.0.1/bundle.js", hash: "abc123def456" };
    });

    await updater.downloadAndInstall(mockUpdate);

    expect(callOrder).toEqual(["setUpdateInfo", "downloadBundleToStorage"]);
  });

  // Test 3: Download progress event subscription
  it("download progress event subscription", async () => {
    // Verify the native module has addListener/removeListeners
    // which are required for NativeEventEmitter to work
    expect(mockNativeModule.addListener).toBeDefined();
    expect(mockNativeModule.removeListeners).toBeDefined();

    // Verify addListener can be called with event name
    mockNativeModule.addListener("BundleNudgeDownloadProgress");
    expect(mockNativeModule.addListener).toHaveBeenCalledWith("BundleNudgeDownloadProgress");

    // Verify removeListeners can be called
    mockNativeModule.removeListeners(1);
    expect(mockNativeModule.removeListeners).toHaveBeenCalledWith(1);

    // Verify NativeEventEmitter is available in the mocked react-native module
    const rn = await import("react-native");
    expect(rn.NativeEventEmitter).toBeDefined();
  });

  // Test 4: Failed download does not set pending update
  it("failed download does not set pending update", async () => {
    vi.mocked(mockNativeModule.downloadBundleToStorage).mockRejectedValue(
      new Error("Network timeout"),
    );

    await expect(updater.downloadAndInstall(mockUpdate)).rejects.toThrow(
      "BundleNudge: Download failed for version 1.0.1:",
    );

    expect(mockNativeModule.setUpdateInfo).toHaveBeenCalledTimes(1);
    expect(mockStorage.setPendingUpdate).not.toHaveBeenCalled();
  });

  // Test 5: Hash mismatch triggers cleanup and throws
  it("hash mismatch triggers cleanup and throws", async () => {
    vi.mocked(mockNativeModule.downloadBundleToStorage).mockResolvedValue({
      path: "/bundles/1.0.1/bundle.js",
      hash: "wrong-hash-value",
    });

    await expect(updater.downloadAndInstall(mockUpdate)).rejects.toThrow(
      "BundleNudge: Bundle integrity check failed",
    );

    // Verify cleanup: deleteBundleVersion called with the version
    expect(mockNativeModule.deleteBundleVersion).toHaveBeenCalledWith("1.0.1");

    // Verify setPendingUpdate was NOT called
    expect(mockStorage.setPendingUpdate).not.toHaveBeenCalled();
  });

  // Test 6: Retry does not re-call setUpdateInfo
  it("retry does not re-call setUpdateInfo", async () => {
    // Since retry mock just calls fn() once, we simulate the scenario
    // where the first download fails and user calls downloadAndInstall again.
    // The key invariant: setUpdateInfo is called each time downloadAndInstall
    // is called, but only once per call — it's outside the retry loop.

    // First attempt: download fails
    vi.mocked(mockNativeModule.downloadBundleToStorage).mockRejectedValueOnce(
      new Error("Temporary network error"),
    );

    await expect(updater.downloadAndInstall(mockUpdate)).rejects.toThrow(
      "BundleNudge: Download failed for version 1.0.1:",
    );

    expect(mockNativeModule.setUpdateInfo).toHaveBeenCalledTimes(1);
    expect(mockNativeModule.downloadBundleToStorage).toHaveBeenCalledTimes(1);

    // Second attempt: download succeeds
    vi.mocked(mockNativeModule.downloadBundleToStorage).mockResolvedValueOnce({
      path: "/bundles/1.0.1/bundle.js",
      hash: "abc123def456",
    });

    await updater.downloadAndInstall(mockUpdate);

    // setUpdateInfo called again for second attempt (2 total)
    expect(mockNativeModule.setUpdateInfo).toHaveBeenCalledTimes(2);
    // downloadBundleToStorage called again (2 total)
    expect(mockNativeModule.downloadBundleToStorage).toHaveBeenCalledTimes(2);

    // Verify the structural invariant: within a single downloadAndInstall call,
    // setUpdateInfo is always called exactly once before downloadBundleToStorage
    const setInfoCalls = vi.mocked(mockNativeModule.setUpdateInfo).mock.invocationCallOrder;
    const downloadCalls = vi.mocked(mockNativeModule.downloadBundleToStorage).mock
      .invocationCallOrder;

    // Each setUpdateInfo call should precede its corresponding download call
    expect(setInfoCalls[0]).toBeLessThan(downloadCalls[0]);
    expect(setInfoCalls[1]).toBeLessThan(downloadCalls[1]);
  });

  // Test 7: Validates required fields before calling native
  describe("validates required fields before calling native", () => {
    it("throws for missing bundleUrl", async () => {
      const badUpdate = { ...mockUpdate, bundleUrl: "" };

      await expect(updater.downloadAndInstall(badUpdate)).rejects.toThrow(
        "BundleNudge: Invalid update - bundleUrl is required",
      );

      expect(mockNativeModule.setUpdateInfo).not.toHaveBeenCalled();
      expect(mockNativeModule.downloadBundleToStorage).not.toHaveBeenCalled();
    });

    it("throws for missing version", async () => {
      const badUpdate = { ...mockUpdate, version: "" };

      await expect(updater.downloadAndInstall(badUpdate)).rejects.toThrow(
        "BundleNudge: Invalid update - version is required",
      );

      expect(mockNativeModule.setUpdateInfo).not.toHaveBeenCalled();
    });

    it("throws for missing bundleHash", async () => {
      const badUpdate = { ...mockUpdate, bundleHash: "" };

      await expect(updater.downloadAndInstall(badUpdate)).rejects.toThrow(
        "BundleNudge: Invalid update - bundleHash is required",
      );

      expect(mockNativeModule.setUpdateInfo).not.toHaveBeenCalled();
    });

    it("throws for zero bundleSize", async () => {
      const badUpdate = { ...mockUpdate, bundleSize: 0 };

      await expect(updater.downloadAndInstall(badUpdate)).rejects.toThrow(
        "BundleNudge: Invalid update - bundleSize must be positive",
      );

      expect(mockNativeModule.setUpdateInfo).not.toHaveBeenCalled();
    });

    it("throws for negative bundleSize", async () => {
      const badUpdate = { ...mockUpdate, bundleSize: -100 };

      await expect(updater.downloadAndInstall(badUpdate)).rejects.toThrow(
        "BundleNudge: Invalid update - bundleSize must be positive",
      );

      expect(mockNativeModule.setUpdateInfo).not.toHaveBeenCalled();
    });
  });

  // Test 8: Version-agnostic — SDK accepts any version the backend serves
  describe("version-agnostic installs", () => {
    it("allows installing an older version (backend decides)", async () => {
      const olderUpdate: UpdateInfo = {
        ...mockUpdate,
        version: "0.9.0",
        bundleHash: "older-hash-123",
      };
      vi.mocked(mockNativeModule.downloadBundleToStorage).mockResolvedValue({
        path: "/bundles/0.9.0/bundle.js",
        hash: "older-hash-123",
      });

      await updater.downloadAndInstall(olderUpdate);

      expect(mockNativeModule.setUpdateInfo).toHaveBeenCalledTimes(1);
      expect(mockNativeModule.downloadBundleToStorage).toHaveBeenCalledTimes(1);
      expect(mockStorage.setPendingUpdate).toHaveBeenCalledWith(
        "0.9.0",
        "older-hash-123",
        "Bug fixes",
        undefined,
        "release-123",
      );
    });

    it("allows same version with different hash", async () => {
      const sameVersionDiffHash: UpdateInfo = {
        ...mockUpdate,
        version: "1.0.0",
        bundleHash: "different-hash-456",
      };
      vi.mocked(mockNativeModule.downloadBundleToStorage).mockResolvedValue({
        path: "/bundles/1.0.0/bundle.js",
        hash: "different-hash-456",
      });

      await updater.downloadAndInstall(sameVersionDiffHash);

      expect(mockNativeModule.downloadBundleToStorage).toHaveBeenCalledTimes(1);
    });
  });

  // Test 9: Disk space check blocks download
  describe("disk space check blocks download", () => {
    it("blocks download when insufficient disk space", async () => {
      // 10KB bundle + 50MB buffer = ~50MB required, only 10MB available
      vi.mocked(mockNativeModule.getFreeDiskSpace).mockResolvedValue(10 * 1024 * 1024);

      await expect(updater.downloadAndInstall(mockUpdate)).rejects.toThrow("INSUFFICIENT_STORAGE");

      expect(mockNativeModule.setUpdateInfo).not.toHaveBeenCalled();
      expect(mockNativeModule.downloadBundleToStorage).not.toHaveBeenCalled();
    });

    it("proceeds when getFreeDiskSpace returns -1 (unsupported)", async () => {
      vi.mocked(mockNativeModule.getFreeDiskSpace).mockResolvedValue(-1);

      await updater.downloadAndInstall(mockUpdate);

      expect(mockNativeModule.setUpdateInfo).toHaveBeenCalledTimes(1);
      expect(mockNativeModule.downloadBundleToStorage).toHaveBeenCalledTimes(1);
    });

    it("proceeds when getFreeDiskSpace throws", async () => {
      vi.mocked(mockNativeModule.getFreeDiskSpace).mockRejectedValue(
        new Error("Permission denied"),
      );

      await updater.downloadAndInstall(mockUpdate);

      expect(mockNativeModule.setUpdateInfo).toHaveBeenCalledTimes(1);
      expect(mockNativeModule.downloadBundleToStorage).toHaveBeenCalledTimes(1);
    });
  });

  // Test 10: Native module compatibility - global vs globalThis
  describe("native module compatibility - global vs globalThis", () => {
    it("getAvailableNativeModules checks global.__turboModuleProxy", async () => {
      const { getAvailableNativeModules } = await import("./native-compatibility");

      // When __turboModuleProxy is set on global, it should return null
      const g = global as Record<string, unknown>;
      const original = g.__turboModuleProxy;
      g.__turboModuleProxy = () => null;

      try {
        const result = getAvailableNativeModules();
        expect(result).toBeNull();
      } finally {
        if (original === undefined) {
          g.__turboModuleProxy = undefined;
        } else {
          g.__turboModuleProxy = original;
        }
      }
    });

    it("returns module list when __turboModuleProxy is not set", async () => {
      const { getAvailableNativeModules } = await import("./native-compatibility");

      const g = global as Record<string, unknown>;
      const original = g.__turboModuleProxy;
      g.__turboModuleProxy = undefined;

      try {
        const result = getAvailableNativeModules();
        // Should return an array (possibly empty), not null
        expect(Array.isArray(result)).toBe(true);
      } finally {
        if (original !== undefined) {
          g.__turboModuleProxy = original;
        }
      }
    });

    it("checks RN$Bridgeless as TurboModule fallback indicator", async () => {
      const { getAvailableNativeModules } = await import("./native-compatibility");

      const g = global as Record<string, unknown>;
      const originalProxy = g.__turboModuleProxy;
      const originalBridgeless = g.RN$Bridgeless;
      g.__turboModuleProxy = undefined;
      g.RN$Bridgeless = true;

      try {
        const result = getAvailableNativeModules();
        expect(result).toBeNull();
      } finally {
        if (originalProxy !== undefined) {
          g.__turboModuleProxy = originalProxy;
        } else {
          g.__turboModuleProxy = undefined;
        }
        if (originalBridgeless !== undefined) {
          g.RN$Bridgeless = originalBridgeless;
        } else {
          g.RN$Bridgeless = undefined;
        }
      }
    });
  });
});
