/**
 * Updater Rollback Context Tests
 *
 * Tests for rolledBackFrom context in update checks and shouldClearUpdates handling.
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

function createMockStorage(metadataOverrides: Record<string, unknown> = {}): Storage {
  return {
    getDeviceId: vi.fn().mockReturnValue("device-123"),
    getAccessToken: vi.fn().mockReturnValue("token-456"),
    getCurrentVersion: vi.fn().mockReturnValue("1.0.0"),
    setPendingUpdate: vi.fn().mockResolvedValue(undefined),
    getMetadata: vi.fn().mockReturnValue({
      storedRuntimeFingerprint: null,
      expectedNativeModules: null,
      currentVersionHash: null,
      rolledBackFromReleaseId: null,
      rolledBackFromVersion: null,
      rolledBackFromHash: null,
      ...metadataOverrides,
    }),
    updateMetadata: vi.fn().mockResolvedValue(undefined),
  } as unknown as Storage;
}

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
}

function mockUpdateResponse(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    headers: { get: () => "application/json" },
    json: () => Promise.resolve({ updateAvailable: false, ...overrides }),
  };
}

describe("Updater rolledBackFrom context", () => {
  let mockNativeModule: NativeModuleInterface;

  beforeEach(() => {
    vi.clearAllMocks();
    mockNativeModule = createMockNativeModule();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("includes rolledBackFrom in POST body when metadata has rollback data", async () => {
    const mockStorage = createMockStorage({
      rolledBackFromReleaseId: "rel-99",
      rolledBackFromVersion: "0.9.0",
      rolledBackFromHash: "hash099",
    });
    mockFetch.mockResolvedValue(mockUpdateResponse());

    const updater = new Updater({
      storage: mockStorage,
      config: { appId: "test-app" },
      nativeModule: mockNativeModule,
    });
    await updater.checkForUpdate();

    const fetchCall = mockFetch.mock.calls[0];
    const body = JSON.parse(fetchCall[1].body as string);
    expect(body.rolledBackFrom).toEqual({
      releaseId: "rel-99",
      version: "0.9.0",
      hash: "hash099",
    });
  });

  it("omits rolledBackFrom when no rollback data in storage", async () => {
    const mockStorage = createMockStorage();
    mockFetch.mockResolvedValue(mockUpdateResponse());

    const updater = new Updater({
      storage: mockStorage,
      config: { appId: "test-app" },
      nativeModule: mockNativeModule,
    });
    await updater.checkForUpdate();

    const fetchCall = mockFetch.mock.calls[0];
    const body = JSON.parse(fetchCall[1].body as string);
    expect(body.rolledBackFrom).toBeUndefined();
  });

  it("clears rolledBackFrom fields after successful update check", async () => {
    const mockStorage = createMockStorage({
      rolledBackFromReleaseId: "rel-99",
      rolledBackFromVersion: "0.9.0",
      rolledBackFromHash: "hash099",
    });
    mockFetch.mockResolvedValue(mockUpdateResponse());

    const updater = new Updater({
      storage: mockStorage,
      config: { appId: "test-app" },
      nativeModule: mockNativeModule,
    });
    await updater.checkForUpdate();

    expect(mockStorage.updateMetadata).toHaveBeenCalledWith({
      rolledBackFromVersion: null,
      rolledBackFromHash: null,
      rolledBackFromReleaseId: null,
    });
  });

  it("does not clear rolledBackFrom when none was sent", async () => {
    const mockStorage = createMockStorage();
    mockFetch.mockResolvedValue(mockUpdateResponse());

    const updater = new Updater({
      storage: mockStorage,
      config: { appId: "test-app" },
      nativeModule: mockNativeModule,
    });
    await updater.checkForUpdate();

    // updateMetadata should NOT have been called to clear rollback fields
    const calls = (mockStorage.updateMetadata as ReturnType<typeof vi.fn>).mock.calls;
    const clearCall = calls.find(
      (c: unknown[]) => (c[0] as Record<string, unknown>).rolledBackFromVersion === null,
    );
    expect(clearCall).toBeUndefined();
  });
});

describe("Updater shouldClearUpdates handling", () => {
  let mockNativeModule: NativeModuleInterface;

  beforeEach(() => {
    vi.clearAllMocks();
    mockNativeModule = createMockNativeModule();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("calls nativeModule.clearUpdates when shouldClearUpdates is true", async () => {
    const mockStorage = createMockStorage();
    mockFetch.mockResolvedValue(mockUpdateResponse({ shouldClearUpdates: true }));

    const updater = new Updater({
      storage: mockStorage,
      config: { appId: "test-app" },
      nativeModule: mockNativeModule,
    });
    await updater.checkForUpdate();

    expect(mockNativeModule.clearUpdates).toHaveBeenCalledOnce();
  });

  it("returns updateAvailable: false when shouldClearUpdates is true", async () => {
    const mockStorage = createMockStorage();
    mockFetch.mockResolvedValue(mockUpdateResponse({ shouldClearUpdates: true }));

    const updater = new Updater({
      storage: mockStorage,
      config: { appId: "test-app" },
      nativeModule: mockNativeModule,
    });
    const result = await updater.checkForUpdate();

    expect(result.updateAvailable).toBe(false);
  });

  it("continues normal flow when shouldClearUpdates is absent", async () => {
    const mockStorage = createMockStorage();
    mockFetch.mockResolvedValue(
      mockUpdateResponse({
        updateAvailable: true,
        release: {
          version: "1.0.1",
          bundleUrl: "https://cdn.example.com/bundle.js",
          bundleSize: 1024,
          bundleHash: "abc123",
          releaseId: "rel-1",
        },
      }),
    );

    const updater = new Updater({
      storage: mockStorage,
      config: { appId: "test-app" },
      nativeModule: mockNativeModule,
    });
    const result = await updater.checkForUpdate();

    expect(mockNativeModule.clearUpdates).not.toHaveBeenCalled();
    expect(result.updateAvailable).toBe(true);
    expect(result.update?.version).toBe("1.0.1");
  });

  it("continues normal flow when shouldClearUpdates is false", async () => {
    const mockStorage = createMockStorage();
    mockFetch.mockResolvedValue(
      mockUpdateResponse({
        shouldClearUpdates: false,
        updateAvailable: true,
        release: {
          version: "1.0.1",
          bundleUrl: "https://cdn.example.com/bundle.js",
          bundleSize: 1024,
          bundleHash: "abc123",
          releaseId: "rel-1",
        },
      }),
    );

    const updater = new Updater({
      storage: mockStorage,
      config: { appId: "test-app" },
      nativeModule: mockNativeModule,
    });
    const result = await updater.checkForUpdate();

    expect(mockNativeModule.clearUpdates).not.toHaveBeenCalled();
    expect(result.updateAvailable).toBe(true);
  });
});
