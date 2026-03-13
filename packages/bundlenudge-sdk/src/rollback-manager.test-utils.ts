/**
 * RollbackManager Test Utilities
 *
 * Shared mocks and helpers for RollbackManager tests.
 */

import { vi } from "vitest";
import type { Storage } from "./storage";
import type { NativeModuleInterface, StoredMetadata } from "./types";

// Mock global fetch
export const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper to create mock storage
export function createMockStorage(metadata: Partial<StoredMetadata> = {}): Storage {
  const defaultMetadata: StoredMetadata = {
    deviceId: "test-device-id",
    accessToken: "test-access-token",
    currentVersion: "2.0.0",
    currentVersionHash: "hash200",
    previousVersion: "1.0.0",
    pendingVersion: null,
    pendingUpdateFlag: false,
    lastCheckTime: null,
    crashCount: 0,
    lastCrashTime: null,
    verificationState: null,
    appVersionInfo: null,
    bundleHashes: {},
    currentReleaseNotes: null,
    currentReleasedAt: null,
    pendingReleaseNotes: null,
    pendingReleasedAt: null,
    pendingVersionHash: null,
    pendingReleaseId: null,
    currentReleaseId: null,
    rolledBackFromVersion: null,
    rolledBackFromHash: null,
    rolledBackFromReleaseId: null,
    storedRuntimeFingerprint: null,
    expectedNativeModules: null,
    ...metadata,
  };

  return {
    getMetadata: vi.fn().mockReturnValue(defaultMetadata),
    getDeviceId: vi.fn().mockReturnValue(defaultMetadata.deviceId),
    getAccessToken: vi.fn().mockReturnValue(defaultMetadata.accessToken),
    rollback: vi.fn().mockResolvedValue(undefined),
    clearPreviousVersion: vi.fn().mockResolvedValue(undefined),
  } as unknown as Storage;
}

// Helper to create mock native module
export function createMockNativeModule(): NativeModuleInterface {
  return {
    getConfiguration: vi.fn().mockResolvedValue({
      appVersion: "1.0.0",
      buildNumber: "1",
      bundleId: "com.test.app",
    }),
    getCurrentBundleInfo: vi.fn().mockResolvedValue(null),
    getBundlePath: vi.fn().mockResolvedValue(null),
    notifyAppReady: vi.fn().mockResolvedValue(true),
    restartApp: vi.fn().mockResolvedValue(true),
    clearUpdates: vi.fn().mockResolvedValue(true),
    saveBundleToStorage: vi.fn().mockResolvedValue("/path/to/bundle"),
    setUpdateInfo: vi.fn().mockResolvedValue(true),
    downloadBundleToStorage: vi
      .fn()
      .mockResolvedValue({ path: "/path/to/bundle", hash: "mockhash" }),
    hashFile: vi.fn().mockResolvedValue("mockhash"),
    deleteBundleVersion: vi.fn().mockResolvedValue(true),
    rollbackToVersion: vi.fn().mockResolvedValue(true),
    getFreeDiskSpace: vi.fn().mockResolvedValue(1024 * 1024 * 1024),
    addListener: vi.fn(),
    removeListeners: vi.fn(),
  };
}
