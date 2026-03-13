/**
 * Tests for:
 * - Schema passthrough: appStoreUrl + reason fields (5a)
 * - Pre-download fingerprint guard (5c)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Storage } from "./storage";
import type { NativeModuleInterface, UpdateInfo } from "./types";
import { Updater } from "./updater";
import { UpdateCheckResponseSchema, validateUpdateCheckResponse } from "./updater-helpers";

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

// Capture logWarn calls
const logWarnSpy = vi.fn();
vi.mock("./debug/logger", () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
  logWarn: (...args: unknown[]) => logWarnSpy(...args),
}));

function createMockStorage(overrides?: Partial<Record<string, unknown>>) {
  return {
    getDeviceId: vi.fn().mockReturnValue("device-123"),
    getAccessToken: vi.fn().mockReturnValue("token-456"),
    getCurrentVersion: vi.fn().mockReturnValue("1.0.0"),
    setPendingUpdate: vi.fn().mockResolvedValue(undefined),
    getMetadata: vi.fn().mockReturnValue({
      storedRuntimeFingerprint: null,
      expectedNativeModules: null,
      currentVersionHash: null,
      ...overrides,
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
}

// ---------- Schema / Zod validation ----------

describe("UpdateCheckResponseSchema (appStoreUrl + reason)", () => {
  it("accepts response with appStoreUrl and reason", () => {
    const input = {
      updateAvailable: false,
      requiresAppStoreUpdate: true,
      appStoreMessage: "Please update",
      appStoreUrl: "https://apps.apple.com/app/id123",
      reason: "native_update_required",
    };

    const result = UpdateCheckResponseSchema.parse(input);

    expect(result.appStoreUrl).toBe("https://apps.apple.com/app/id123");
    expect(result.reason).toBe("native_update_required");
  });

  it("accepts response without appStoreUrl and reason (backward compat)", () => {
    const input = {
      updateAvailable: false,
      requiresAppStoreUpdate: true,
      appStoreMessage: "Please update",
    };

    const result = UpdateCheckResponseSchema.parse(input);

    expect(result.appStoreUrl).toBeUndefined();
    expect(result.reason).toBeUndefined();
  });

  it("rejects invalid appStoreUrl (not a URL)", () => {
    const input = {
      updateAvailable: false,
      appStoreUrl: "not-a-url",
    };

    expect(() => UpdateCheckResponseSchema.parse(input)).toThrow();
  });

  it("accepts empty reason string", () => {
    const input = {
      updateAvailable: false,
      reason: "",
    };

    const result = UpdateCheckResponseSchema.parse(input);
    expect(result.reason).toBe("");
  });

  it("accepts known enum reason values", () => {
    const reasons = [
      "unverified_native_version",
      "version_out_of_range",
      "known_mismatch",
      "strict_unknown",
      "strict_no_data",
      "no_fp_data",
    ];
    for (const reason of reasons) {
      const result = UpdateCheckResponseSchema.parse({
        updateAvailable: false,
        reason,
      });
      expect(result.reason).toBe(reason);
    }
  });

  it("accepts unknown reason strings for forward compatibility", () => {
    const result = UpdateCheckResponseSchema.parse({
      updateAvailable: false,
      reason: "some_future_reason",
    });
    expect(result.reason).toBe("some_future_reason");
  });

  it("validates via validateUpdateCheckResponse helper", () => {
    const input = {
      updateAvailable: false,
      appStoreUrl: "https://play.google.com/store/apps/details?id=com.test",
      reason: "fingerprint_mismatch",
    };

    const result = validateUpdateCheckResponse(input);

    expect(result.appStoreUrl).toBe("https://play.google.com/store/apps/details?id=com.test");
    expect(result.reason).toBe("fingerprint_mismatch");
  });
});

// ---------- checkForUpdate passthrough ----------

describe("checkForUpdate: appStoreUrl + reason passthrough", () => {
  let mockStorage: Storage;
  let mockNativeModule: NativeModuleInterface;
  let updater: Updater;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage = createMockStorage();
    mockNativeModule = createMockNativeModule();
    updater = new Updater({
      storage: mockStorage,
      config: { appId: "test-app" },
      nativeModule: mockNativeModule,
    });

    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ updateAvailable: false }),
      }),
    );
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("passes appStoreUrl and reason through when present", async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () =>
          Promise.resolve({
            updateAvailable: false,
            requiresAppStoreUpdate: true,
            appStoreMessage: "Update required",
            appStoreUrl: "https://apps.apple.com/app/id999",
            reason: "native_update_required",
          }),
      }),
    );

    const result = await updater.checkForUpdate();

    expect(result.updateAvailable).toBe(false);
    expect(result.requiresAppStoreUpdate).toBe(true);
    expect(result.appStoreUrl).toBe("https://apps.apple.com/app/id999");
    expect(result.reason).toBe("native_update_required");
  });

  it("returns undefined for appStoreUrl/reason when not in response", async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () =>
          Promise.resolve({
            updateAvailable: false,
            requiresAppStoreUpdate: true,
            appStoreMessage: "Update required",
          }),
      }),
    );

    const result = await updater.checkForUpdate();

    expect(result.requiresAppStoreUpdate).toBe(true);
    expect(result.appStoreUrl).toBeUndefined();
    expect(result.reason).toBeUndefined();
  });
});

// ---------- Pre-download fingerprint guard ----------

describe("downloadAndInstall: pre-download fingerprint guard", () => {
  let mockStorage: Storage;
  let mockNativeModule: NativeModuleInterface;

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
    mockNativeModule = createMockNativeModule();
    mockFetch.mockImplementation(() => Promise.resolve({ ok: true }));
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("proceeds when fingerprints match", async () => {
    mockStorage = createMockStorage({
      storedRuntimeFingerprint: "fp-abc123",
    });

    const updater = new Updater({
      storage: mockStorage,
      config: { appId: "test-app", nativeFingerprint: "fp-abc123" },
      nativeModule: mockNativeModule,
    });

    await updater.downloadAndInstall(mockUpdate);

    expect(mockNativeModule.downloadBundleToStorage).toHaveBeenCalled();
  });

  it("throws FingerprintMismatchError when fingerprints mismatch", async () => {
    mockStorage = createMockStorage({
      storedRuntimeFingerprint: "fp-old-native",
    });

    const updater = new Updater({
      storage: mockStorage,
      config: { appId: "test-app", nativeFingerprint: "fp-new-native" },
      nativeModule: mockNativeModule,
    });

    await expect(updater.downloadAndInstall(mockUpdate)).rejects.toThrow(
      "Download blocked: runtime fingerprint mismatch",
    );

    expect(mockNativeModule.downloadBundleToStorage).not.toHaveBeenCalled();
  });

  it("logs warning with both fingerprints on mismatch", async () => {
    mockStorage = createMockStorage({
      storedRuntimeFingerprint: "fp-server",
    });

    const updater = new Updater({
      storage: mockStorage,
      config: { appId: "test-app", nativeFingerprint: "fp-device" },
      nativeModule: mockNativeModule,
    });

    await expect(updater.downloadAndInstall(mockUpdate)).rejects.toThrow();

    expect(logWarnSpy).toHaveBeenCalledWith("Download blocked: runtime fingerprint mismatch", {
      expected: "fp-device",
      received: "fp-server",
    });
  });

  it("proceeds when no stored fingerprint (backward compat)", async () => {
    mockStorage = createMockStorage({
      storedRuntimeFingerprint: null,
    });

    const updater = new Updater({
      storage: mockStorage,
      config: { appId: "test-app", nativeFingerprint: "fp-device" },
      nativeModule: mockNativeModule,
    });

    await updater.downloadAndInstall(mockUpdate);

    expect(mockNativeModule.downloadBundleToStorage).toHaveBeenCalled();
  });

  it("proceeds when no config nativeFingerprint set", async () => {
    mockStorage = createMockStorage({
      storedRuntimeFingerprint: "fp-server",
    });

    const updater = new Updater({
      storage: mockStorage,
      config: { appId: "test-app" },
      nativeModule: mockNativeModule,
    });

    await updater.downloadAndInstall(mockUpdate);

    expect(mockNativeModule.downloadBundleToStorage).toHaveBeenCalled();
  });

  it("proceeds when both fingerprints are absent", async () => {
    mockStorage = createMockStorage({
      storedRuntimeFingerprint: null,
    });

    const updater = new Updater({
      storage: mockStorage,
      config: { appId: "test-app" },
      nativeModule: mockNativeModule,
    });

    await updater.downloadAndInstall(mockUpdate);

    expect(mockNativeModule.downloadBundleToStorage).toHaveBeenCalled();
  });

  it("does not set pending update when fingerprint mismatch", async () => {
    mockStorage = createMockStorage({
      storedRuntimeFingerprint: "fp-old",
    });

    const updater = new Updater({
      storage: mockStorage,
      config: { appId: "test-app", nativeFingerprint: "fp-new" },
      nativeModule: mockNativeModule,
    });

    await expect(updater.downloadAndInstall(mockUpdate)).rejects.toThrow();

    expect(mockStorage.setPendingUpdate).not.toHaveBeenCalled();
  });
});
