/**
 * Updater Download Tests
 *
 * Tests for the Updater.downloadAndInstall method.
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

describe("Updater.downloadAndInstall", () => {
  // Mock dependencies
  let mockStorage: Storage;
  let mockNativeModule: NativeModuleInterface;
  let updater: Updater;

  // Mock update data
  const mockUpdate: UpdateInfo = {
    version: "1.0.1",
    bundleUrl: "https://cdn.example.com/bundle.js",
    bundleSize: 10240,
    bundleHash: "abc123def456",
    releaseId: "release-123",
    releaseNotes: "Bug fixes",
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
      saveBundleToStorage: vi.fn().mockResolvedValue("/bundles/1.0.1/bundle.js"),
      hashFile: vi.fn().mockResolvedValue("abc123def456"),
      setUpdateInfo: vi.fn().mockResolvedValue(true),
      downloadBundleToStorage: vi.fn().mockResolvedValue({
        path: "/bundles/1.0.1/bundle.js",
        hash: "abc123def456",
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

  it("calls setUpdateInfo then downloadBundleToStorage", async () => {
    await updater.downloadAndInstall(mockUpdate);

    expect(mockNativeModule.setUpdateInfo).toHaveBeenCalledWith(
      expect.stringContaining(mockUpdate.bundleUrl),
    );
    expect(mockNativeModule.downloadBundleToStorage).toHaveBeenCalledWith();
  });

  it("throws on hash mismatch from native download", async () => {
    mockNativeModule.downloadBundleToStorage = vi.fn().mockResolvedValue({
      path: "/bundles/1.0.1/bundle.js",
      hash: "wrong-hash-value",
    });

    await expect(updater.downloadAndInstall(mockUpdate)).rejects.toThrow(
      "BundleNudge: Bundle integrity check failed",
    );
  });

  it("sets pending update after successful download", async () => {
    await updater.downloadAndInstall(mockUpdate);

    expect(mockStorage.setPendingUpdate).toHaveBeenCalledWith(
      mockUpdate.version,
      mockUpdate.bundleHash,
      mockUpdate.releaseNotes,
      mockUpdate.releasedAt,
      mockUpdate.releaseId,
    );
  });

  it("reports download to telemetry endpoint", async () => {
    await updater.downloadAndInstall(mockUpdate);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.bundlenudge.com/v1/telemetry",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"eventType":"update_downloaded"'),
      }),
    );
  });

  it("does not throw when telemetry fails", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/telemetry")) {
        return Promise.reject(new Error("Network error"));
      }
      return Promise.resolve({ ok: true });
    });

    // Should not throw despite telemetry failure
    await expect(updater.downloadAndInstall(mockUpdate)).resolves.not.toThrow();
  });

  it("does not set pending update on hash mismatch", async () => {
    mockNativeModule.downloadBundleToStorage = vi.fn().mockResolvedValue({
      path: "/bundles/1.0.1/bundle.js",
      hash: "wrong-hash",
    });

    await expect(updater.downloadAndInstall(mockUpdate)).rejects.toThrow();

    expect(mockStorage.setPendingUpdate).not.toHaveBeenCalled();
  });

  it("does not report telemetry on hash mismatch", async () => {
    mockNativeModule.downloadBundleToStorage = vi.fn().mockResolvedValue({
      path: "/bundles/1.0.1/bundle.js",
      hash: "wrong-hash",
    });

    await expect(updater.downloadAndInstall(mockUpdate)).rejects.toThrow();

    expect(mockFetch).not.toHaveBeenCalledWith(
      expect.stringContaining("/telemetry"),
      expect.any(Object),
    );
  });

  it("propagates native download errors with sanitized message", async () => {
    mockNativeModule.downloadBundleToStorage = vi
      .fn()
      .mockRejectedValue(new Error("Network timeout"));

    await expect(updater.downloadAndInstall(mockUpdate)).rejects.toThrow(
      "BundleNudge: Download failed for version 1.0.1:",
    );
  });

  it("includes release ID in telemetry", async () => {
    await updater.downloadAndInstall(mockUpdate);

    // Telemetry is now sent via an async retry queue; wait for it to process
    await vi.waitFor(
      () => {
        const telemetryCall = mockFetch.mock.calls.find((call: unknown[]) =>
          (call[0] as string).includes("/telemetry"),
        );
        expect(telemetryCall).toBeDefined();
        const body = JSON.parse(telemetryCall[1].body as string) as {
          releaseId: string;
        };
        expect(body.releaseId).toBe("release-123");
      },
      { timeout: 3000 },
    );
  });

  it("calls setUpdateInfo with JSON payload containing update details", async () => {
    await updater.downloadAndInstall(mockUpdate);

    expect(mockNativeModule.setUpdateInfo).toHaveBeenCalledWith(expect.any(String));
    const payload = JSON.parse(vi.mocked(mockNativeModule.setUpdateInfo).mock.calls[0][0]) as {
      url: string;
      version: string;
      expectedHash: string;
      expectedSize: number;
    };
    expect(payload.url).toBe(mockUpdate.bundleUrl);
    expect(payload.version).toBe(mockUpdate.version);
    expect(payload.expectedHash).toBe(mockUpdate.bundleHash);
    expect(payload.expectedSize).toBe(mockUpdate.bundleSize);
    expect(mockNativeModule.downloadBundleToStorage).toHaveBeenCalledWith();
  });

  describe("disk space check", () => {
    it("blocks download when insufficient disk space", async () => {
      // 10KB bundle + 50MB buffer = ~52MB required, only 10MB free
      mockNativeModule.getFreeDiskSpace = vi.fn().mockResolvedValue(10 * 1024 * 1024);

      await expect(updater.downloadAndInstall(mockUpdate)).rejects.toThrow("INSUFFICIENT_STORAGE");
      expect(mockNativeModule.downloadBundleToStorage).not.toHaveBeenCalled();
    });

    it("allows download when sufficient disk space", async () => {
      mockNativeModule.getFreeDiskSpace = vi.fn().mockResolvedValue(500 * 1024 * 1024);

      await updater.downloadAndInstall(mockUpdate);

      expect(mockNativeModule.downloadBundleToStorage).toHaveBeenCalled();
    });

    it("proceeds with download when getFreeDiskSpace returns -1", async () => {
      // getFreeDiskSpace returns -1 (unsupported) — graceful degradation
      mockNativeModule.getFreeDiskSpace = vi.fn().mockResolvedValue(-1);

      await updater.downloadAndInstall(mockUpdate);

      expect(mockNativeModule.downloadBundleToStorage).toHaveBeenCalled();
    });

    it("proceeds with download when getFreeDiskSpace throws", async () => {
      mockNativeModule.getFreeDiskSpace = vi.fn().mockRejectedValue(new Error("Permission denied"));

      await updater.downloadAndInstall(mockUpdate);

      expect(mockNativeModule.downloadBundleToStorage).toHaveBeenCalled();
    });
  });
});
