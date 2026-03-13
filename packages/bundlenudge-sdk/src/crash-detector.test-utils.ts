/**
 * CrashDetector Test Utilities
 *
 * Shared mock storage factory for crash detector tests.
 */

import { vi } from "vitest";
import type { Storage, VerificationState } from "./storage";
import type { StoredMetadata } from "./types";

export interface MockStorageOptions {
  metadata?: Partial<StoredMetadata>;
  verificationState?: VerificationState | null;
}

export function createMockStorage(options: MockStorageOptions = {}): Storage {
  const { metadata = {}, verificationState = null } = options;

  const defaultMetadata: StoredMetadata = {
    deviceId: "test-device",
    accessToken: null,
    currentVersion: null,
    currentVersionHash: null,
    previousVersion: null,
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

  let currentVerificationState = verificationState;

  return {
    getMetadata: vi.fn().mockReturnValue(defaultMetadata),
    recordCrash: vi.fn().mockResolvedValue(defaultMetadata.crashCount + 1),
    clearCrashCount: vi.fn().mockResolvedValue(undefined),
    clearPreviousVersion: vi.fn().mockResolvedValue(undefined),
    getVerificationState: vi.fn().mockImplementation(() => currentVerificationState),
    setAppReady: vi.fn().mockImplementation(() => {
      if (!currentVerificationState) {
        currentVerificationState = {
          appReady: true,
          healthPassed: false,
          verifiedAt: null,
        };
      } else {
        currentVerificationState = {
          ...currentVerificationState,
          appReady: true,
        };
      }
      return Promise.resolve();
    }),
    setHealthPassed: vi.fn().mockImplementation(() => {
      if (!currentVerificationState) {
        currentVerificationState = {
          appReady: false,
          healthPassed: true,
          verifiedAt: null,
        };
      } else {
        currentVerificationState = {
          ...currentVerificationState,
          healthPassed: true,
        };
      }
      return Promise.resolve();
    }),
    resetVerificationState: vi.fn().mockImplementation(() => {
      currentVerificationState = null;
      return Promise.resolve();
    }),
  } as unknown as Storage;
}
