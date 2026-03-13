/**
 * Updater Check Tests
 *
 * Tests for the Updater.checkForUpdate method.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Storage } from "./storage";
import type { NativeModuleInterface } from "./types";
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

describe("Updater.checkForUpdate", () => {
  // Mock dependencies
  let mockStorage: Storage;
  let mockNativeModule: NativeModuleInterface;
  let updater: Updater;

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
        currentVersionHash: null,
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
          headers: new Headers({ "content-type": "application/json" }),
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

  it("returns no update when none available", async () => {
    const result = await updater.checkForUpdate();

    expect(result.updateAvailable).toBe(false);
    expect(result.update).toBeUndefined();
  });

  it("returns update info when update available", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/updates/check")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () =>
            Promise.resolve({
              updateAvailable: true,
              release: {
                version: "1.0.1",
                bundleUrl: "https://cdn.example.com/bundle.js",
                bundleSize: 10240,
                bundleHash: "abc123",
                releaseId: "release-123",
                releaseNotes: "Bug fixes",
              },
            }),
        });
      }
      return Promise.resolve({ ok: true });
    });

    const result = await updater.checkForUpdate();

    expect(result.updateAvailable).toBe(true);
    expect(result.update?.version).toBe("1.0.1");
    expect(result.update?.bundleUrl).toBe("https://cdn.example.com/bundle.js");
  });

  it("returns requiresAppStoreUpdate when native update needed", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/updates/check")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () =>
            Promise.resolve({
              updateAvailable: false,
              requiresAppStoreUpdate: true,
              appStoreMessage: "Please update from the App Store",
            }),
        });
      }
      return Promise.resolve({ ok: true });
    });

    const result = await updater.checkForUpdate();

    expect(result.updateAvailable).toBe(false);
    expect(result.requiresAppStoreUpdate).toBe(true);
    expect(result.appStoreMessage).toBe("Please update from the App Store");
  });

  it("throws error when update check fails", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/updates/check")) {
        return Promise.resolve({ ok: false, status: 500 });
      }
      return Promise.resolve({ ok: true });
    });

    await expect(updater.checkForUpdate()).rejects.toThrow("BundleNudge: Update check failed");
  });

  it("sends correct payload in update check request", async () => {
    await updater.checkForUpdate();

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.bundlenudge.com/v1/updates/check",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer token-456",
        }),
        body: expect.stringContaining('"appId":"test-app"'),
      }),
    );
  });

  it("sends currentBundleHash in update check request", async () => {
    (mockStorage.getMetadata as ReturnType<typeof vi.fn>).mockReturnValue({
      storedRuntimeFingerprint: null,
      expectedNativeModules: null,
      currentVersionHash: "sha256:abc123def456",
    });

    await updater.checkForUpdate();

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body as string);
    expect(body.currentBundleHash).toBe("sha256:abc123def456");
  });

  it("omits currentBundleHash when no hash stored", async () => {
    await updater.checkForUpdate();

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body as string);
    expect(body.currentBundleHash).toBeUndefined();
  });

  it("uses custom API URL when provided", async () => {
    const customUpdater = new Updater({
      storage: mockStorage,
      config: { appId: "test-app", apiUrl: "https://custom.api.com" },
      nativeModule: mockNativeModule,
    });

    await customUpdater.checkForUpdate();

    expect(mockFetch).toHaveBeenCalledWith(
      "https://custom.api.com/v1/updates/check",
      expect.any(Object),
    );
  });
});
