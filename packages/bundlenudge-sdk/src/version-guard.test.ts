/**
 * VersionGuard Tests
 *
 * Tests for detecting native app updates and clearing OTA bundles.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Storage } from "./storage";
import { type AppVersionInfo, VersionGuard, type VersionGuardConfig } from "./version-guard";

// Helper to create mock storage with version guard methods
function createMockStorage(storedVersion: AppVersionInfo | null = null): Storage {
  return {
    getAppVersionInfo: vi.fn().mockReturnValue(storedVersion),
    setAppVersionInfo: vi.fn().mockResolvedValue(undefined),
    clearAllBundles: vi.fn().mockResolvedValue(undefined),
    clearCrashCount: vi.fn().mockResolvedValue(undefined),
  } as unknown as Storage;
}

// Helper to create version info
function createVersionInfo(
  appVersion: string,
  buildNumber: string,
  recordedAt = Date.now(),
): AppVersionInfo {
  return { appVersion, buildNumber, recordedAt };
}

describe("VersionGuard", () => {
  let mockStorage: Storage;
  let mockConfig: VersionGuardConfig;
  let versionGuard: VersionGuard;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("checkForNativeUpdate", () => {
    it("detects first launch (no stored version) and clears bundles", async () => {
      const currentVersion = createVersionInfo("1.0.0", "1");
      mockStorage = createMockStorage(null);
      mockConfig = {
        getCurrentVersion: () => currentVersion,
      };
      versionGuard = new VersionGuard(mockStorage, mockConfig);

      const result = await versionGuard.checkForNativeUpdate();

      expect(result).toBe(true);
      expect(mockStorage.clearAllBundles).toHaveBeenCalledTimes(1);
      expect(mockStorage.clearCrashCount).toHaveBeenCalledTimes(1);
      expect(mockStorage.setAppVersionInfo).toHaveBeenCalledWith(currentVersion);
    });

    it("returns false when same version and build number", async () => {
      const storedVersion = createVersionInfo("1.0.0", "1", 1000);
      const currentVersion = createVersionInfo("1.0.0", "1");
      mockStorage = createMockStorage(storedVersion);
      mockConfig = {
        getCurrentVersion: () => currentVersion,
      };
      versionGuard = new VersionGuard(mockStorage, mockConfig);

      const result = await versionGuard.checkForNativeUpdate();

      expect(result).toBe(false);
      expect(mockStorage.clearAllBundles).not.toHaveBeenCalled();
      expect(mockStorage.clearCrashCount).not.toHaveBeenCalled();
      expect(mockStorage.setAppVersionInfo).not.toHaveBeenCalled();
    });

    it("detects different appVersion and clears bundles", async () => {
      const storedVersion = createVersionInfo("1.0.0", "1");
      const currentVersion = createVersionInfo("2.0.0", "1");
      mockStorage = createMockStorage(storedVersion);
      mockConfig = {
        getCurrentVersion: () => currentVersion,
      };
      versionGuard = new VersionGuard(mockStorage, mockConfig);

      const result = await versionGuard.checkForNativeUpdate();

      expect(result).toBe(true);
      expect(mockStorage.clearAllBundles).toHaveBeenCalledTimes(1);
      expect(mockStorage.clearCrashCount).toHaveBeenCalledTimes(1);
      expect(mockStorage.setAppVersionInfo).toHaveBeenCalledWith(currentVersion);
    });

    it("detects different buildNumber (same version) and clears bundles", async () => {
      const storedVersion = createVersionInfo("1.0.0", "1");
      const currentVersion = createVersionInfo("1.0.0", "2");
      mockStorage = createMockStorage(storedVersion);
      mockConfig = {
        getCurrentVersion: () => currentVersion,
      };
      versionGuard = new VersionGuard(mockStorage, mockConfig);

      const result = await versionGuard.checkForNativeUpdate();

      expect(result).toBe(true);
      expect(mockStorage.clearAllBundles).toHaveBeenCalledTimes(1);
      expect(mockStorage.clearCrashCount).toHaveBeenCalledTimes(1);
      expect(mockStorage.setAppVersionInfo).toHaveBeenCalledWith(currentVersion);
    });

    it("calls onNativeUpdateDetected callback when update detected", async () => {
      const storedVersion = createVersionInfo("1.0.0", "1");
      const currentVersion = createVersionInfo("2.0.0", "1");
      const onNativeUpdateDetected = vi.fn();
      mockStorage = createMockStorage(storedVersion);
      mockConfig = {
        getCurrentVersion: () => currentVersion,
        onNativeUpdateDetected,
      };
      versionGuard = new VersionGuard(mockStorage, mockConfig);

      await versionGuard.checkForNativeUpdate();

      expect(onNativeUpdateDetected).toHaveBeenCalledTimes(1);
    });

    it("does not call onNativeUpdateDetected when no update", async () => {
      const storedVersion = createVersionInfo("1.0.0", "1");
      const currentVersion = createVersionInfo("1.0.0", "1");
      const onNativeUpdateDetected = vi.fn();
      mockStorage = createMockStorage(storedVersion);
      mockConfig = {
        getCurrentVersion: () => currentVersion,
        onNativeUpdateDetected,
      };
      versionGuard = new VersionGuard(mockStorage, mockConfig);

      await versionGuard.checkForNativeUpdate();

      expect(onNativeUpdateDetected).not.toHaveBeenCalled();
    });

    it("stores updated version info after native update detection", async () => {
      const storedVersion = createVersionInfo("1.0.0", "1");
      const currentVersion = createVersionInfo("2.0.0", "5");
      mockStorage = createMockStorage(storedVersion);
      mockConfig = {
        getCurrentVersion: () => currentVersion,
      };
      versionGuard = new VersionGuard(mockStorage, mockConfig);

      await versionGuard.checkForNativeUpdate();

      expect(mockStorage.setAppVersionInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          appVersion: "2.0.0",
          buildNumber: "5",
        }),
      );
    });

    it("handles minor version bump detection", async () => {
      const storedVersion = createVersionInfo("1.0.0", "1");
      const currentVersion = createVersionInfo("1.1.0", "1");
      mockStorage = createMockStorage(storedVersion);
      mockConfig = {
        getCurrentVersion: () => currentVersion,
      };
      versionGuard = new VersionGuard(mockStorage, mockConfig);

      const result = await versionGuard.checkForNativeUpdate();

      expect(result).toBe(true);
      expect(mockStorage.clearAllBundles).toHaveBeenCalled();
    });

    it("handles patch version bump detection", async () => {
      const storedVersion = createVersionInfo("1.0.0", "1");
      const currentVersion = createVersionInfo("1.0.1", "1");
      mockStorage = createMockStorage(storedVersion);
      mockConfig = {
        getCurrentVersion: () => currentVersion,
      };
      versionGuard = new VersionGuard(mockStorage, mockConfig);

      const result = await versionGuard.checkForNativeUpdate();

      expect(result).toBe(true);
      expect(mockStorage.clearAllBundles).toHaveBeenCalled();
    });

    it("works with optional callback not provided", async () => {
      const currentVersion = createVersionInfo("1.0.0", "1");
      mockStorage = createMockStorage(null);
      mockConfig = {
        getCurrentVersion: () => currentVersion,
        // onNativeUpdateDetected not provided
      };
      versionGuard = new VersionGuard(mockStorage, mockConfig);

      // Should not throw
      const result = await versionGuard.checkForNativeUpdate();

      expect(result).toBe(true);
      expect(mockStorage.clearAllBundles).toHaveBeenCalled();
    });

    it("executes operations in correct order", async () => {
      const storedVersion = createVersionInfo("1.0.0", "1");
      const currentVersion = createVersionInfo("2.0.0", "1");
      const callOrder: string[] = [];

      mockStorage = {
        getAppVersionInfo: vi.fn().mockReturnValue(storedVersion),
        clearAllBundles: vi.fn().mockImplementation(() => {
          callOrder.push("clearAllBundles");
          return Promise.resolve();
        }),
        clearCrashCount: vi.fn().mockImplementation(() => {
          callOrder.push("clearCrashCount");
          return Promise.resolve();
        }),
        setAppVersionInfo: vi.fn().mockImplementation(() => {
          callOrder.push("setAppVersionInfo");
          return Promise.resolve();
        }),
      } as unknown as Storage;

      const onNativeUpdateDetected = vi.fn().mockImplementation(() => {
        callOrder.push("callback");
      });

      mockConfig = {
        getCurrentVersion: () => currentVersion,
        onNativeUpdateDetected,
      };

      versionGuard = new VersionGuard(mockStorage, mockConfig);

      await versionGuard.checkForNativeUpdate();

      expect(callOrder).toEqual([
        "clearAllBundles",
        "clearCrashCount",
        "setAppVersionInfo",
        "callback",
      ]);
    });

    it("detects downgrade as a native update", async () => {
      // User installed older version from store
      const storedVersion = createVersionInfo("2.0.0", "5");
      const currentVersion = createVersionInfo("1.9.0", "3");
      mockStorage = createMockStorage(storedVersion);
      mockConfig = {
        getCurrentVersion: () => currentVersion,
      };
      versionGuard = new VersionGuard(mockStorage, mockConfig);

      const result = await versionGuard.checkForNativeUpdate();

      expect(result).toBe(true);
      expect(mockStorage.clearAllBundles).toHaveBeenCalled();
    });

    it("handles build number change with same version for hotfixes", async () => {
      // Same version but new build number (TestFlight/internal build)
      const storedVersion = createVersionInfo("1.0.0", "100");
      const currentVersion = createVersionInfo("1.0.0", "101");
      mockStorage = createMockStorage(storedVersion);
      mockConfig = {
        getCurrentVersion: () => currentVersion,
      };
      versionGuard = new VersionGuard(mockStorage, mockConfig);

      const result = await versionGuard.checkForNativeUpdate();

      expect(result).toBe(true);
      expect(mockStorage.clearAllBundles).toHaveBeenCalled();
    });
  });
});
