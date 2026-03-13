/**
 * Storage Initialization Tests
 *
 * Tests for Storage class initialization and error handling.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Storage } from "./storage";

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: { getItem: vi.fn(), setItem: vi.fn() },
}));

vi.mock("./utils", () => ({ generateDeviceId: () => "test-device-id-123" }));

const STORAGE_KEY = "@bundlenudge:metadata";

function createMetadata(overrides: Record<string, unknown> = {}) {
  return {
    deviceId: "valid-device-id",
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
    ...overrides,
  };
}

describe("Storage - Initialization", () => {
  let storage: Storage;

  beforeEach(() => {
    vi.clearAllMocks();
    storage = new Storage();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("initialize", () => {
    it("creates default metadata on first launch", async () => {
      vi.mocked(AsyncStorage.getItem).mockResolvedValue(null);
      vi.mocked(AsyncStorage.setItem).mockResolvedValue();
      await storage.initialize();
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        expect.stringContaining("test-device-id-123"),
      );
    });

    it("loads existing metadata from storage", async () => {
      const existing = createMetadata({
        deviceId: "existing-device-123",
        accessToken: "token-abc",
        currentVersion: "1.0.0",
        currentVersionHash: "hash123",
      });
      vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(existing));
      await storage.initialize();
      expect(storage.getDeviceId()).toBe("existing-device-123");
      expect(storage.getAccessToken()).toBe("token-abc");
      expect(storage.getCurrentVersion()).toBe("1.0.0");
    });

    it("resets corrupted storage to defaults", async () => {
      vi.mocked(AsyncStorage.getItem).mockResolvedValue("invalid-json{{{");
      vi.mocked(AsyncStorage.setItem).mockResolvedValue();
      await storage.initialize();
      expect(AsyncStorage.setItem).toHaveBeenCalled();
      expect(storage.getDeviceId()).toBe("test-device-id-123");
    });

    it("resets metadata when schema validation fails (invalid type)", async () => {
      const invalid = createMetadata({ deviceId: 123 }); // Should be string
      vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(invalid));
      vi.mocked(AsyncStorage.setItem).mockResolvedValue();
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      await storage.initialize();
      expect(warnSpy).toHaveBeenCalledWith(
        "[BundleNudge]",
        "Corrupted metadata detected, resetting",
        "",
      );
      expect(storage.getDeviceId()).toBe("test-device-id-123");
      warnSpy.mockRestore();
    });

    it("resets metadata when crashCount exceeds max (100)", async () => {
      const invalid = createMetadata({ crashCount: 150 });
      vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(invalid));
      vi.mocked(AsyncStorage.setItem).mockResolvedValue();
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      await storage.initialize();
      expect(warnSpy).toHaveBeenCalledWith(
        "[BundleNudge]",
        "Corrupted metadata detected, resetting",
        "",
      );
      expect(storage.getMetadata().crashCount).toBe(0);
      warnSpy.mockRestore();
    });

    it("resets metadata when crashCount is negative", async () => {
      const invalid = createMetadata({ crashCount: -5 });
      vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(invalid));
      vi.mocked(AsyncStorage.setItem).mockResolvedValue();
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      await storage.initialize();
      expect(warnSpy).toHaveBeenCalledWith(
        "[BundleNudge]",
        "Corrupted metadata detected, resetting",
        "",
      );
      expect(storage.getMetadata().crashCount).toBe(0);
      warnSpy.mockRestore();
    });

    it("resets metadata when required field is missing", async () => {
      const { deviceId: _ignored, ...invalidWithoutId } = createMetadata();
      vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(invalidWithoutId));
      vi.mocked(AsyncStorage.setItem).mockResolvedValue();
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      await storage.initialize();
      expect(warnSpy).toHaveBeenCalledWith(
        "[BundleNudge]",
        "Corrupted metadata detected, resetting",
        "",
      );
      expect(storage.getDeviceId()).toBe("test-device-id-123");
      warnSpy.mockRestore();
    });

    it("resets metadata when deviceId is empty string", async () => {
      const invalid = createMetadata({ deviceId: "" });
      vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(invalid));
      vi.mocked(AsyncStorage.setItem).mockResolvedValue();
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      await storage.initialize();
      expect(warnSpy).toHaveBeenCalledWith(
        "[BundleNudge]",
        "Corrupted metadata detected, resetting",
        "",
      );
      expect(storage.getDeviceId()).toBe("test-device-id-123");
      warnSpy.mockRestore();
    });

    it("accepts valid metadata at crashCount boundary (100)", async () => {
      const valid = createMetadata({ crashCount: 100 });
      vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(valid));
      await storage.initialize();
      expect(storage.getMetadata().crashCount).toBe(100);
    });
  });

  describe("error handling", () => {
    it("resets to defaults on AsyncStorage.getItem error", async () => {
      vi.mocked(AsyncStorage.getItem).mockRejectedValue(new Error("Storage read error"));
      vi.mocked(AsyncStorage.setItem).mockResolvedValue();
      await storage.initialize();
      expect(storage.getDeviceId()).toBe("test-device-id-123");
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it("throws on AsyncStorage.setItem error during persist", async () => {
      vi.mocked(AsyncStorage.getItem).mockResolvedValue(null);
      vi.mocked(AsyncStorage.setItem).mockRejectedValue(new Error("Storage write error"));
      await expect(storage.initialize()).rejects.toThrow("Failed to write to storage");
    });
  });
});
