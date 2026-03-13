/**
 * Storage Reset Callback Tests (Fix #63)
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { Storage } from "./storage";

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn().mockResolvedValue(undefined),
  },
}));

import AsyncStorage from "@react-native-async-storage/async-storage";

describe("Storage onStorageReset callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls onStorageReset with 'corrupted_metadata' when data is invalid", async () => {
    const onStorageReset = vi.fn();
    (AsyncStorage.getItem as ReturnType<typeof vi.fn>).mockResolvedValue('{"invalid": true}');

    const storage = new Storage({ onStorageReset });
    await storage.initialize();

    expect(onStorageReset).toHaveBeenCalledWith("corrupted_metadata");
  });

  it("calls onStorageReset with 'storage_error' when read throws", async () => {
    const onStorageReset = vi.fn();
    (AsyncStorage.getItem as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("disk error"));

    const storage = new Storage({ onStorageReset });
    await storage.initialize();

    expect(onStorageReset).toHaveBeenCalledWith("storage_error");
  });

  it("does not call onStorageReset when data is valid", async () => {
    const onStorageReset = vi.fn();
    const validData = JSON.stringify({
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
    });
    (AsyncStorage.getItem as ReturnType<typeof vi.fn>).mockResolvedValue(validData);

    const storage = new Storage({ onStorageReset });
    await storage.initialize();

    expect(onStorageReset).not.toHaveBeenCalled();
  });

  it("does not throw when onStorageReset is not provided", async () => {
    (AsyncStorage.getItem as ReturnType<typeof vi.fn>).mockResolvedValue('{"invalid": true}');
    const storage = new Storage();
    await expect(storage.initialize()).resolves.not.toThrow();
  });

  it("does not call onStorageReset for fresh storage (no existing data)", async () => {
    const onStorageReset = vi.fn();
    (AsyncStorage.getItem as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const storage = new Storage({ onStorageReset });
    await storage.initialize();

    expect(onStorageReset).not.toHaveBeenCalled();
  });
});
