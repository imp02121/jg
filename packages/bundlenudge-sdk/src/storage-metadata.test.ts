/**
 * Storage Metadata Tests
 *
 * Tests for getMetadata, updateMetadata, and access token operations.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Storage } from "./storage";

// Mock AsyncStorage
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  },
}));

// Mock utils for stable device ID
vi.mock("./utils", () => ({
  generateDeviceId: () => "test-device-id-123",
}));

const STORAGE_KEY = "@bundlenudge:metadata";

describe("Storage - Metadata Operations", () => {
  let storage: Storage;

  beforeEach(() => {
    vi.clearAllMocks();
    storage = new Storage();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("getMetadata", () => {
    it("throws if not initialized", () => {
      expect(() => storage.getMetadata()).toThrow("Storage not initialized");
    });

    it("returns metadata after initialization", async () => {
      vi.mocked(AsyncStorage.getItem).mockResolvedValue(null);
      vi.mocked(AsyncStorage.setItem).mockResolvedValue();

      await storage.initialize();
      const metadata = storage.getMetadata();

      expect(metadata.deviceId).toBe("test-device-id-123");
      expect(metadata.crashCount).toBe(0);
    });
  });

  describe("updateMetadata", () => {
    it("throws if not initialized", async () => {
      await expect(storage.updateMetadata({ crashCount: 1 })).rejects.toThrow(
        "Storage not initialized",
      );
    });

    it("updates and persists metadata", async () => {
      vi.mocked(AsyncStorage.getItem).mockResolvedValue(null);
      vi.mocked(AsyncStorage.setItem).mockResolvedValue();

      await storage.initialize();
      vi.clearAllMocks();

      await storage.updateMetadata({ currentVersion: "2.0.0" });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        expect.stringContaining('"currentVersion":"2.0.0"'),
      );
    });
  });

  describe("access token", () => {
    beforeEach(async () => {
      vi.mocked(AsyncStorage.getItem).mockResolvedValue(null);
      vi.mocked(AsyncStorage.setItem).mockResolvedValue();
      await storage.initialize();
    });

    it("returns null when no token set", () => {
      expect(storage.getAccessToken()).toBeNull();
    });

    it("sets and retrieves access token", async () => {
      await storage.setAccessToken("new-token-xyz");
      expect(storage.getAccessToken()).toBe("new-token-xyz");
    });
  });
});
