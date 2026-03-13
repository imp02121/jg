/**
 * useBundleNudge Hook Tests
 *
 * Tests for the React hook using manual mocking.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UpdateInfo } from "../types";

// Mock BundleNudge
const mockCheckForUpdate = vi.fn();
const mockDownloadAndInstall = vi.fn();
const mockSync = vi.fn();
const mockGetCurrentVersion = vi.fn();
const mockGetStatus = vi.fn();
let mockThrowOnGetInstance = false;

vi.mock("../bundlenudge", () => ({
  BundleNudge: {
    getInstance: () => {
      if (mockThrowOnGetInstance) {
        throw new Error("BundleNudge not initialized");
      }
      return {
        checkForUpdate: mockCheckForUpdate,
        downloadAndInstall: mockDownloadAndInstall,
        sync: mockSync,
        getCurrentVersion: mockGetCurrentVersion,
        getStatus: mockGetStatus,
      };
    },
  },
}));

// Track state for assertions
interface StateStore {
  status: string;
  updateAvailable: boolean;
  updateInfo: UpdateInfo | null;
  downloadProgress: number;
  error: Error | null;
  currentVersion: string | null;
}

let stateStore: StateStore = {
  status: "idle",
  updateAvailable: false,
  updateInfo: null,
  downloadProgress: 0,
  error: null,
  currentVersion: null,
};

vi.mock("react", () => {
  // Map to store state by key
  const states = new Map<number, unknown>();
  let stateCounter = 0;

  return {
    useState: <T>(initial: T): [T, (val: T | ((prev: T) => T)) => void] => {
      const key = stateCounter++;
      if (!states.has(key)) {
        states.set(key, initial);
      }

      const setState = (val: T | ((prev: T) => T)): void => {
        const newVal =
          typeof val === "function" ? (val as (prev: T) => T)(states.get(key) as T) : val;
        states.set(key, newVal);

        // Update stateStore for assertions
        const stateNames = [
          "status",
          "updateAvailable",
          "updateInfo",
          "downloadProgress",
          "error",
          "currentVersion",
        ];
        const idx = key % 6;
        const name = stateNames[idx] as keyof StateStore;
        (stateStore as unknown as Record<string, unknown>)[name] = newVal;
      };

      return [states.get(key) as T, setState];
    },
    useEffect: (callback: () => (() => void) | undefined): void => {
      callback();
    },
    useCallback: <T>(fn: T) => fn,
    useRef: <T>(initial: T) => ({ current: initial }),
  };
});

// Import hook after mocks are set up
import { useBundleNudge } from "./useBundleNudge";

describe("useBundleNudge", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockThrowOnGetInstance = false;
    mockGetCurrentVersion.mockReturnValue("1.0.0");
    mockGetStatus.mockReturnValue("idle");

    // Reset state store
    stateStore = {
      status: "idle",
      updateAvailable: false,
      updateInfo: null,
      downloadProgress: 0,
      error: null,
      currentVersion: null,
    };
  });

  it("returns initial idle state", () => {
    const result = useBundleNudge();

    expect(result.status).toBe("idle");
    expect(result.updateAvailable).toBe(false);
    expect(result.updateInfo).toBeNull();
    expect(result.downloadProgress).toBe(0);
    expect(result.error).toBeNull();
  });

  it("provides checkForUpdate method", () => {
    const result = useBundleNudge();

    expect(typeof result.checkForUpdate).toBe("function");
  });

  it("provides downloadAndApply method", () => {
    const result = useBundleNudge();

    expect(typeof result.downloadAndApply).toBe("function");
  });

  it("provides sync method", () => {
    const result = useBundleNudge();

    expect(typeof result.sync).toBe("function");
  });

  it("checkForUpdate calls SDK checkForUpdate", async () => {
    mockCheckForUpdate.mockResolvedValue(null);

    const result = useBundleNudge();
    await result.checkForUpdate();

    expect(mockCheckForUpdate).toHaveBeenCalled();
  });

  it("checkForUpdate handles update available", async () => {
    const mockUpdate: UpdateInfo = {
      version: "2.0.0",
      bundleUrl: "https://cdn.example.com/bundle.js",
      bundleSize: 1024,
      bundleHash: "abc123",
      releaseId: "release-1",
    };
    mockCheckForUpdate.mockResolvedValue(mockUpdate);

    const result = useBundleNudge();
    await result.checkForUpdate();

    expect(mockCheckForUpdate).toHaveBeenCalled();
    expect(stateStore.updateAvailable).toBe(true);
    expect(stateStore.updateInfo).toEqual(mockUpdate);
  });

  it("checkForUpdate handles errors", async () => {
    const testError = new Error("Network error");
    mockCheckForUpdate.mockRejectedValue(testError);

    const result = useBundleNudge();
    await result.checkForUpdate();

    expect(stateStore.status).toBe("error");
    expect(stateStore.error).toEqual(testError);
  });

  it("sync calls SDK sync method", async () => {
    mockSync.mockResolvedValue(undefined);

    const result = useBundleNudge();
    await result.sync();

    expect(mockSync).toHaveBeenCalled();
  });

  it("sync handles errors", async () => {
    const testError = new Error("Sync failed");
    mockSync.mockRejectedValue(testError);

    const result = useBundleNudge();
    await result.sync();

    expect(stateStore.status).toBe("error");
    expect(stateStore.error).toEqual(testError);
  });

  it("handles SDK not initialized gracefully", () => {
    mockThrowOnGetInstance = true;

    // Should not throw
    const result = useBundleNudge();
    expect(result.status).toBe("idle");
  });
});
