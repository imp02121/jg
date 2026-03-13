/**
 * Updater Hermes Bytecode Version Tests
 *
 * Tests for SDK-side Hermes bytecode version validation.
 * Ensures the SDK skips updates when the release bytecode version
 * does not match the device's Hermes engine version.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Storage } from "./storage";
import type { NativeModuleInterface } from "./types";
import { Updater } from "./updater";

const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

vi.mock("./utils", () => ({
  retry: async <T>(fn: () => Promise<T>) => fn(),
}));

vi.mock("./native-compatibility", () => ({
  generateDeviceFingerprint: vi.fn().mockResolvedValue(null),
}));

function makeUpdateResponse(hermesBytecodeVersion?: number) {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        updateAvailable: true,
        release: {
          version: "2.0.0",
          bundleUrl: "https://cdn.bundlenudge.com/bundle.hbc",
          bundleSize: 5000,
          bundleHash: "abc123",
          releaseId: "rel-1",
          hermesBytecodeVersion,
        },
      }),
  };
}

describe("Updater Hermes bytecode version validation", () => {
  let mockStorage: Storage;
  let mockNativeModule: NativeModuleInterface;

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
      }),
      updateMetadata: vi.fn().mockResolvedValue(undefined),
    } as unknown as Storage;

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
      saveBundleToStorage: vi.fn().mockResolvedValue("/bundles/2.0.0/bundle.js"),
      hashFile: vi.fn().mockResolvedValue("abc123"),
      setUpdateInfo: vi.fn().mockResolvedValue(true),
      deleteBundleVersion: vi.fn().mockResolvedValue(true),
      rollbackToVersion: vi.fn().mockResolvedValue(true),
      getFreeDiskSpace: vi.fn().mockResolvedValue(1024 * 1024 * 1024),
      downloadBundleToStorage: vi.fn().mockResolvedValue({
        path: "/bundles/2.0.0/bundle.js",
        hash: "abc123",
      }),
      addListener: vi.fn(),
      removeListeners: vi.fn(),
    };
  });

  afterEach(() => {
    // Clean up HermesInternal
    (global as Record<string, unknown>).HermesInternal = undefined;
  });

  it("allows update when release has no bytecode version", async () => {
    (global as Record<string, unknown>).HermesInternal = {
      getRuntimeProperties: () => ({ "Bytecode Version": 96 }),
    };

    mockFetch.mockResolvedValue(makeUpdateResponse(undefined));

    const updater = new Updater({
      storage: mockStorage,
      config: { appId: "test-app" },
      nativeModule: mockNativeModule,
    });

    const result = await updater.checkForUpdate();
    expect(result.updateAvailable).toBe(true);
  });

  it("allows update when device has no HermesInternal", async () => {
    (global as Record<string, unknown>).HermesInternal = undefined;

    mockFetch.mockResolvedValue(makeUpdateResponse(96));

    const updater = new Updater({
      storage: mockStorage,
      config: { appId: "test-app" },
      nativeModule: mockNativeModule,
    });

    const result = await updater.checkForUpdate();
    expect(result.updateAvailable).toBe(true);
  });

  it("allows update when bytecode versions match", async () => {
    (global as Record<string, unknown>).HermesInternal = {
      getRuntimeProperties: () => ({ "Bytecode Version": 96 }),
    };

    mockFetch.mockResolvedValue(makeUpdateResponse(96));

    const updater = new Updater({
      storage: mockStorage,
      config: { appId: "test-app" },
      nativeModule: mockNativeModule,
    });

    const result = await updater.checkForUpdate();
    expect(result.updateAvailable).toBe(true);
  });

  it("skips update when bytecode versions mismatch", async () => {
    (global as Record<string, unknown>).HermesInternal = {
      getRuntimeProperties: () => ({ "Bytecode Version": 89 }),
    };

    mockFetch.mockResolvedValue(makeUpdateResponse(96));

    const updater = new Updater({
      storage: mockStorage,
      config: { appId: "test-app" },
      nativeModule: mockNativeModule,
    });

    const result = await updater.checkForUpdate();
    expect(result.updateAvailable).toBe(false);
  });

  it("allows update when HermesInternal has no getRuntimeProperties", async () => {
    (global as Record<string, unknown>).HermesInternal = {};

    mockFetch.mockResolvedValue(makeUpdateResponse(96));

    const updater = new Updater({
      storage: mockStorage,
      config: { appId: "test-app" },
      nativeModule: mockNativeModule,
    });

    const result = await updater.checkForUpdate();
    expect(result.updateAvailable).toBe(true);
  });

  it("allows update when getRuntimeProperties returns no bytecode version", async () => {
    (global as Record<string, unknown>).HermesInternal = {
      getRuntimeProperties: () => ({}),
    };

    mockFetch.mockResolvedValue(makeUpdateResponse(96));

    const updater = new Updater({
      storage: mockStorage,
      config: { appId: "test-app" },
      nativeModule: mockNativeModule,
    });

    const result = await updater.checkForUpdate();
    expect(result.updateAvailable).toBe(true);
  });
});
