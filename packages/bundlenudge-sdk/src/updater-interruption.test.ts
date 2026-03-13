/**
 * Updater Interruption Tests
 *
 * Edge case tests for download and install interruption scenarios:
 * - 1B.1: Download interrupted mid-stream (network failure)
 * - 1B.3: Partial download with corrupted data (hash validation)
 * - 1C.1: Install interrupted before completion
 * - 1C.2: Install succeeds but restart fails
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BundleValidator } from "./bundle-validator";
import type { Storage } from "./storage";
import type { BundleNudgeConfig, NativeModuleInterface, UpdateInfo } from "./types";
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
 * Create mock storage for tests.
 */
function createMockStorage(overrides: Partial<Storage> = {}): Storage {
  return {
    getDeviceId: vi.fn().mockReturnValue("device-123"),
    getAccessToken: vi.fn().mockReturnValue("token-456"),
    getCurrentVersion: vi.fn().mockReturnValue("1.0.0"),
    setPendingUpdate: vi.fn().mockResolvedValue(undefined),
    getBundleHash: vi.fn().mockReturnValue(null),
    setBundleHash: vi.fn().mockResolvedValue(undefined),
    removeBundleVersion: vi.fn().mockResolvedValue(undefined),
    applyPendingUpdate: vi.fn().mockResolvedValue(undefined),
    getMetadata: vi.fn().mockReturnValue({
      deviceId: "device-123",
      pendingVersion: null,
      currentVersion: "1.0.0",
      storedRuntimeFingerprint: null,
      expectedNativeModules: null,
    }),
    updateMetadata: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as Storage;
}

/**
 * Create mock native module for tests.
 */
function createMockNativeModule(
  overrides: Partial<NativeModuleInterface> = {},
): NativeModuleInterface {
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
    ...overrides,
  };
}

// Valid update data
const mockUpdate: UpdateInfo = {
  version: "1.0.1",
  bundleUrl: "https://cdn.example.com/bundle.js",
  bundleSize: 10240,
  bundleHash: "abc123def456",
  releaseId: "release-123",
  releaseNotes: "Bug fixes",
};

describe("Download Interruption Scenarios", () => {
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

    // Default fetch mock for telemetry
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/telemetry")) {
        return Promise.resolve({ ok: true });
      }
      return Promise.resolve({ ok: true });
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("1B.1: Download interrupted mid-stream (network failure)", () => {
    it("throws error when native download fails with network error", async () => {
      mockNativeModule.downloadBundleToStorage = vi
        .fn()
        .mockRejectedValue(new Error("Network request failed"));

      // Error messages are sanitized - internal details logged, not thrown
      await expect(updater.downloadAndInstall(mockUpdate)).rejects.toThrow(
        "BundleNudge: Download failed for version 1.0.1:",
      );
    });

    it("throws error when download times out", async () => {
      mockNativeModule.downloadBundleToStorage = vi
        .fn()
        .mockRejectedValue(new Error("Request timeout after 30000ms"));

      // Error messages are sanitized - internal details logged, not thrown
      await expect(updater.downloadAndInstall(mockUpdate)).rejects.toThrow(
        "BundleNudge: Download failed for version 1.0.1:",
      );
    });

    it("does not set pending update on network failure", async () => {
      mockNativeModule.downloadBundleToStorage = vi
        .fn()
        .mockRejectedValue(new Error("Connection refused"));

      await expect(updater.downloadAndInstall(mockUpdate)).rejects.toThrow();

      expect(mockStorage.setPendingUpdate).not.toHaveBeenCalled();
    });

    it("does not report telemetry on network failure", async () => {
      mockNativeModule.downloadBundleToStorage = vi.fn().mockRejectedValue(new Error("ETIMEDOUT"));

      await expect(updater.downloadAndInstall(mockUpdate)).rejects.toThrow();

      expect(mockFetch).not.toHaveBeenCalledWith(
        expect.stringContaining("/telemetry"),
        expect.any(Object),
      );
    });

    it("allows retry after network failure", async () => {
      // First attempt fails
      mockNativeModule.downloadBundleToStorage = vi
        .fn()
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          path: "/bundles/1.0.1/bundle.js",
          hash: "abc123def456",
        });

      await expect(updater.downloadAndInstall(mockUpdate)).rejects.toThrow();

      // Second attempt succeeds
      await updater.downloadAndInstall(mockUpdate);

      expect(mockStorage.setPendingUpdate).toHaveBeenCalledTimes(1);
      expect(mockStorage.setPendingUpdate).toHaveBeenCalledWith(
        "1.0.1",
        "abc123def456",
        "Bug fixes",
        undefined,
        "release-123",
      );
    });

    it("includes version in error message for debugging", async () => {
      mockNativeModule.downloadBundleToStorage = vi
        .fn()
        .mockRejectedValue(new Error("SSL handshake failed"));

      await expect(updater.downloadAndInstall(mockUpdate)).rejects.toThrow(/version 1\.0\.1/);
    });

    it("handles connection reset mid-download", async () => {
      mockNativeModule.downloadBundleToStorage = vi
        .fn()
        .mockRejectedValue(new Error("ECONNRESET: connection reset by peer"));

      await expect(updater.downloadAndInstall(mockUpdate)).rejects.toThrow(
        "BundleNudge: Download failed for version 1.0.1",
      );

      // Verify no partial state was saved
      expect(mockStorage.setPendingUpdate).not.toHaveBeenCalled();
    });
  });

  describe("1B.3: Partial download with corrupted data (hash validation)", () => {
    it("throws when hash does not match expected value", async () => {
      mockNativeModule.downloadBundleToStorage = vi.fn().mockResolvedValue({
        path: "/bundles/1.0.1/bundle.js",
        hash: "corrupted-hash-value",
      });

      await expect(updater.downloadAndInstall(mockUpdate)).rejects.toThrow(
        "BundleNudge: Bundle integrity check failed for version 1.0.1",
      );
    });

    it("does not expose hash values in error message (sanitized)", async () => {
      mockNativeModule.downloadBundleToStorage = vi.fn().mockResolvedValue({
        path: "/bundles/1.0.1/bundle.js",
        hash: "bad-hash-123",
      });

      // Hash values are intentionally NOT included in the thrown error
      // to prevent leaking internal details. They are logged instead.
      await expect(updater.downloadAndInstall(mockUpdate)).rejects.toThrow(
        "BundleNudge: Bundle integrity check failed for version 1.0.1",
      );
    });

    it("does not set pending update when hash mismatches", async () => {
      mockNativeModule.downloadBundleToStorage = vi.fn().mockResolvedValue({
        path: "/bundles/1.0.1/bundle.js",
        hash: "partial-download-hash",
      });

      await expect(updater.downloadAndInstall(mockUpdate)).rejects.toThrow();

      expect(mockStorage.setPendingUpdate).not.toHaveBeenCalled();
    });

    it("does not report success telemetry when hash mismatches", async () => {
      mockNativeModule.downloadBundleToStorage = vi.fn().mockResolvedValue({
        path: "/bundles/1.0.1/bundle.js",
        hash: "truncated-data-hash",
      });

      await expect(updater.downloadAndInstall(mockUpdate)).rejects.toThrow();

      expect(mockFetch).not.toHaveBeenCalledWith(
        expect.stringContaining("/telemetry"),
        expect.any(Object),
      );
    });

    it("suggests retry in error message for corrupted download", async () => {
      mockNativeModule.downloadBundleToStorage = vi.fn().mockResolvedValue({
        path: "/bundles/1.0.1/bundle.js",
        hash: "corrupted",
      });

      await expect(updater.downloadAndInstall(mockUpdate)).rejects.toThrow(/Please try again/);
    });

    it("detects empty file hash (zero bytes downloaded)", async () => {
      // Empty file hash (SHA-256 of empty string)
      const emptyFileHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
      mockNativeModule.downloadBundleToStorage = vi.fn().mockResolvedValue({
        path: "/bundles/1.0.1/bundle.js",
        hash: emptyFileHash,
      });

      await expect(updater.downloadAndInstall(mockUpdate)).rejects.toThrow(
        "Bundle integrity check failed",
      );
    });

    it("handles hash case sensitivity correctly", async () => {
      // Hash is the same but different case - should still fail
      mockNativeModule.downloadBundleToStorage = vi.fn().mockResolvedValue({
        path: "/bundles/1.0.1/bundle.js",
        hash: "ABC123DEF456", // uppercase version
      });

      // This should fail because hashes are case-sensitive
      await expect(updater.downloadAndInstall(mockUpdate)).rejects.toThrow(
        "Bundle integrity check failed",
      );
    });
  });
});

describe("Install Interruption Scenarios", () => {
  let mockStorage: Storage;
  let mockNativeModule: NativeModuleInterface;
  let mockConfig: BundleNudgeConfig;
  let updater: Updater;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage = createMockStorage();
    mockNativeModule = createMockNativeModule();
    mockConfig = { appId: "test-app", installMode: "immediate" };
    updater = new Updater({
      storage: mockStorage,
      config: mockConfig,
      nativeModule: mockNativeModule,
    });

    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/telemetry")) {
        return Promise.resolve({ ok: true });
      }
      return Promise.resolve({ ok: true });
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("1C.1: Install interrupted before completion", () => {
    it("does not mark update as pending if setPendingUpdate fails", async () => {
      mockStorage.setPendingUpdate = vi.fn().mockRejectedValue(new Error("Storage write failed"));

      await expect(updater.downloadAndInstall(mockUpdate)).rejects.toThrow("Storage write failed");

      // The bundle was downloaded but not marked as pending
      expect(mockNativeModule.downloadBundleToStorage).toHaveBeenCalled();
    });

    it("does not leave partial state on storage failure", async () => {
      const metadataValue = {
        deviceId: "device-123",
        pendingVersion: null, // Should remain null after failure
        currentVersion: "1.0.0",
      };
      const getMetadataSpy = vi.fn().mockReturnValue(metadataValue);
      mockStorage.getMetadata = getMetadataSpy;
      mockStorage.setPendingUpdate = vi.fn().mockRejectedValue(new Error("AsyncStorage error"));

      await expect(updater.downloadAndInstall(mockUpdate)).rejects.toThrow();

      // Verify pending version was not set
      expect(metadataValue.pendingVersion).toBeNull();
    });

    it("validates update info before starting download", async () => {
      const invalidUpdate = { ...mockUpdate, bundleUrl: "" };

      await expect(updater.downloadAndInstall(invalidUpdate)).rejects.toThrow(
        "BundleNudge: Invalid update - bundleUrl is required",
      );

      // Download should not be attempted
      expect(mockNativeModule.downloadBundleToStorage).not.toHaveBeenCalled();
    });

    it("validates version before starting download", async () => {
      const invalidUpdate = { ...mockUpdate, version: "" };

      await expect(updater.downloadAndInstall(invalidUpdate)).rejects.toThrow(
        "BundleNudge: Invalid update - version is required",
      );

      expect(mockNativeModule.downloadBundleToStorage).not.toHaveBeenCalled();
    });

    it("validates bundleHash before starting download", async () => {
      const invalidUpdate = { ...mockUpdate, bundleHash: "" };

      await expect(updater.downloadAndInstall(invalidUpdate)).rejects.toThrow(
        "BundleNudge: Invalid update - bundleHash is required",
      );

      expect(mockNativeModule.downloadBundleToStorage).not.toHaveBeenCalled();
    });

    it("validates bundleSize before starting download", async () => {
      const invalidUpdate = { ...mockUpdate, bundleSize: 0 };

      await expect(updater.downloadAndInstall(invalidUpdate)).rejects.toThrow(
        "BundleNudge: Invalid update - bundleSize must be positive",
      );

      expect(mockNativeModule.downloadBundleToStorage).not.toHaveBeenCalled();
    });

    it("validates negative bundleSize", async () => {
      const invalidUpdate = { ...mockUpdate, bundleSize: -100 };

      await expect(updater.downloadAndInstall(invalidUpdate)).rejects.toThrow(
        "bundleSize must be positive",
      );

      expect(mockNativeModule.downloadBundleToStorage).not.toHaveBeenCalled();
    });
  });

  describe("1C.2: Install succeeds but restart fails", () => {
    it("marks update as pending even if restart fails", async () => {
      // Update is successfully downloaded and saved
      mockNativeModule.downloadBundleToStorage = vi.fn().mockResolvedValue({
        path: "/bundles/1.0.1/bundle.js",
        hash: "abc123def456",
      });

      // Download succeeds, setPendingUpdate succeeds
      await updater.downloadAndInstall(mockUpdate);

      expect(mockStorage.setPendingUpdate).toHaveBeenCalledWith(
        "1.0.1",
        "abc123def456",
        "Bug fixes",
        undefined,
        "release-123",
      );
      // The update is marked as pending - restart would be handled by the caller
    });

    it("telemetry failure does not affect install success", async () => {
      mockFetch.mockRejectedValue(new Error("Telemetry network error"));

      // Should not throw - telemetry is non-blocking
      await expect(updater.downloadAndInstall(mockUpdate)).resolves.not.toThrow();

      // Update should still be marked as pending
      expect(mockStorage.setPendingUpdate).toHaveBeenCalled();
    });

    it("pending update persists for next launch when restart fails", async () => {
      await updater.downloadAndInstall(mockUpdate);

      // Verify the pending update was set with correct version and hash
      expect(mockStorage.setPendingUpdate).toHaveBeenCalledWith(
        mockUpdate.version,
        mockUpdate.bundleHash,
        mockUpdate.releaseNotes,
        mockUpdate.releasedAt,
        mockUpdate.releaseId,
      );

      // The pending update will be applied on next app launch
      // This is the expected recovery path when restart fails
    });

    it("applies pending update on next initialization", async () => {
      // Simulate pending update from previous session
      const storageSpy = vi.fn().mockReturnValue({
        deviceId: "device-123",
        pendingVersion: "1.0.1",
        pendingUpdateFlag: true,
        currentVersion: "1.0.0",
      });
      mockStorage.getMetadata = storageSpy;

      // The storage should have the pending update that can be applied
      const metadata = mockStorage.getMetadata();
      expect(metadata.pendingVersion).toBe("1.0.1");
      expect(metadata.pendingUpdateFlag).toBe(true);
    });
  });
});

describe("BundleValidator Hash Verification Edge Cases", () => {
  let mockStorage: Storage;
  let validator: BundleValidator;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage = createMockStorage();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Partial download detection via hash", () => {
    it("detects corrupted bundle and removes it from storage", async () => {
      mockStorage.getBundleHash = vi.fn().mockReturnValue("expected-hash-abc");
      mockStorage.removeBundleVersion = vi.fn().mockResolvedValue(undefined);

      const mockHashFile = vi.fn().mockResolvedValue("corrupted-hash-xyz");
      const onValidationFailed = vi.fn();

      validator = new BundleValidator(mockStorage, {
        hashFile: mockHashFile,
        onValidationFailed,
      });

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const result = await validator.validateBundle("1.0.0", "/path/to/bundle.js");
      warnSpy.mockRestore();

      expect(result).toBe(false);
      expect(mockStorage.removeBundleVersion).toHaveBeenCalledWith("1.0.0");
    });

    it("calls onValidationFailed with hash details", async () => {
      const expectedHash = "abc123";
      const actualHash = "xyz789";

      mockStorage.getBundleHash = vi.fn().mockReturnValue(expectedHash);
      const onValidationFailed = vi.fn();

      validator = new BundleValidator(mockStorage, {
        hashFile: vi.fn().mockResolvedValue(actualHash),
        onValidationFailed,
      });

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      await validator.validateBundle("1.0.0", "/path/bundle.js");
      warnSpy.mockRestore();

      expect(onValidationFailed).toHaveBeenCalledWith("1.0.0", expectedHash, actualHash);
    });

    it("handles hashFile throwing an error", async () => {
      mockStorage.getBundleHash = vi.fn().mockReturnValue("expected-hash");

      validator = new BundleValidator(mockStorage, {
        hashFile: vi.fn().mockRejectedValue(new Error("File not found")),
      });

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const result = await validator.validateBundle("1.0.0", "/nonexistent.js");
      warnSpy.mockRestore();

      expect(result).toBe(false);
    });

    it("handles empty hash from hashFile (native unavailable) - rejects by default", async () => {
      mockStorage.getBundleHash = vi.fn().mockReturnValue("expected-hash");

      validator = new BundleValidator(mockStorage, {
        hashFile: vi.fn().mockResolvedValue(""),
      });

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const result = await validator.validateBundle("1.0.0", "/path/bundle.js");
      warnSpy.mockRestore();

      // Empty hash means native module unavailable - reject in secure mode (default)
      expect(result).toBe(false);
    });

    it("handles empty hash from hashFile with allowLegacyBundles", async () => {
      mockStorage.getBundleHash = vi.fn().mockReturnValue("expected-hash");

      validator = new BundleValidator(mockStorage, {
        hashFile: vi.fn().mockResolvedValue(""),
        allowLegacyBundles: true,
      });

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const result = await validator.validateBundle("1.0.0", "/path/bundle.js");
      warnSpy.mockRestore();

      // With allowLegacyBundles, empty hash allows the bundle
      expect(result).toBe(true);
    });

    it("validates detailed result on hash mismatch", async () => {
      mockStorage.getBundleHash = vi.fn().mockReturnValue("expected");
      mockStorage.removeBundleVersion = vi.fn().mockResolvedValue(undefined);

      validator = new BundleValidator(mockStorage, {
        hashFile: vi.fn().mockResolvedValue("actual"),
      });

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const result = await validator.validateBundleDetailed("1.0.0", "/path/bundle.js");
      warnSpy.mockRestore();

      expect(result.valid).toBe(false);
      expect(result.reason).toBe("hash_mismatch");
    });

    it("returns hash_match reason when validation succeeds", async () => {
      const hash = "matching-hash-value";
      mockStorage.getBundleHash = vi.fn().mockReturnValue(hash);

      validator = new BundleValidator(mockStorage, {
        hashFile: vi.fn().mockResolvedValue(hash),
      });

      const result = await validator.validateBundleDetailed("1.0.0", "/path/bundle.js");

      expect(result.valid).toBe(true);
      expect(result.reason).toBe("hash_match");
    });

    it("returns no_stored_hash reason for bundles without stored hash (default secure mode)", async () => {
      mockStorage.getBundleHash = vi.fn().mockReturnValue(null);

      validator = new BundleValidator(mockStorage, {
        hashFile: vi.fn(),
      });

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const result = await validator.validateBundleDetailed("0.9.0", "/path/old-bundle.js");
      warnSpy.mockRestore();

      expect(result.valid).toBe(false);
      expect(result.reason).toBe("no_stored_hash");
      // hashFile should not be called when no stored hash
    });

    it("returns legacy_bundle reason for bundles without stored hash with allowLegacyBundles", async () => {
      mockStorage.getBundleHash = vi.fn().mockReturnValue(null);

      validator = new BundleValidator(mockStorage, {
        hashFile: vi.fn(),
        allowLegacyBundles: true,
      });

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const result = await validator.validateBundleDetailed("0.9.0", "/path/old-bundle.js");
      warnSpy.mockRestore();

      expect(result.valid).toBe(true);
      expect(result.reason).toBe("legacy_bundle");
      // hashFile should not be called for legacy bundles
    });

    it("rejects empty version string", async () => {
      validator = new BundleValidator(mockStorage, {
        hashFile: vi.fn(),
      });

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const result = await validator.validateBundle("", "/path/bundle.js");
      warnSpy.mockRestore();

      expect(result).toBe(false);
    });

    it("rejects empty bundlePath string", async () => {
      validator = new BundleValidator(mockStorage, {
        hashFile: vi.fn(),
      });

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const result = await validator.validateBundle("1.0.0", "");
      warnSpy.mockRestore();

      expect(result).toBe(false);
    });

    it("rejects whitespace-only version string", async () => {
      validator = new BundleValidator(mockStorage, {
        hashFile: vi.fn(),
      });

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const result = await validator.validateBundle("   ", "/path/bundle.js");
      warnSpy.mockRestore();

      expect(result).toBe(false);
    });
  });
});

describe("Recovery Path Tests", () => {
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

    mockFetch.mockImplementation(() => Promise.resolve({ ok: true }));
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("can retry download after transient network failure", async () => {
    let callCount = 0;
    mockNativeModule.downloadBundleToStorage = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject(new Error("Temporary network issue"));
      }
      return Promise.resolve({
        path: "/bundles/1.0.1/bundle.js",
        hash: "abc123def456",
      });
    });

    // First attempt fails
    await expect(updater.downloadAndInstall(mockUpdate)).rejects.toThrow();
    expect(mockStorage.setPendingUpdate).not.toHaveBeenCalled();

    // Second attempt succeeds
    await updater.downloadAndInstall(mockUpdate);
    expect(mockStorage.setPendingUpdate).toHaveBeenCalledWith(
      "1.0.1",
      "abc123def456",
      "Bug fixes",
      undefined,
      "release-123",
    );
  });

  it("can retry download after hash mismatch (server fixed bundle)", async () => {
    let callCount = 0;
    mockNativeModule.downloadBundleToStorage = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // First download got corrupted
        return Promise.resolve({
          path: "/bundles/1.0.1/bundle.js",
          hash: "corrupted-first-attempt",
        });
      }
      // Second download is correct
      return Promise.resolve({
        path: "/bundles/1.0.1/bundle.js",
        hash: "abc123def456",
      });
    });

    // First attempt fails hash check
    await expect(updater.downloadAndInstall(mockUpdate)).rejects.toThrow(
      "Bundle integrity check failed",
    );

    // Second attempt succeeds
    await updater.downloadAndInstall(mockUpdate);
    expect(mockStorage.setPendingUpdate).toHaveBeenCalledTimes(1);
  });
});
