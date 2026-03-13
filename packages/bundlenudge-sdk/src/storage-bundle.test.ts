/**
 * Storage Bundle Tests
 *
 * Tests for app version info and bundle hash operations.
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

describe("Storage - Bundle Operations", () => {
  let storage: Storage;

  beforeEach(() => {
    vi.clearAllMocks();
    storage = new Storage();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("app version info", () => {
    beforeEach(async () => {
      vi.mocked(AsyncStorage.getItem).mockResolvedValue(null);
      vi.mocked(AsyncStorage.setItem).mockResolvedValue();
      await storage.initialize();
    });

    it("returns null for initial app version info", () => {
      expect(storage.getAppVersionInfo()).toBeNull();
    });

    it("sets and retrieves app version info", async () => {
      const versionInfo = {
        appVersion: "2.1.0",
        buildNumber: "142",
        recordedAt: 1700000000000,
      };
      await storage.setAppVersionInfo(versionInfo);

      const retrieved = storage.getAppVersionInfo();
      expect(retrieved?.appVersion).toBe("2.1.0");
      expect(retrieved?.buildNumber).toBe("142");
      expect(retrieved?.recordedAt).toBe(1700000000000);
    });

    it("clearAllBundles removes currentVersion, previousVersion, and pendingVersion", async () => {
      await storage.updateMetadata({
        currentVersion: "1.0.0",
        currentVersionHash: "hash123",
        previousVersion: "0.9.0",
        pendingVersion: "1.1.0",
        pendingUpdateFlag: true,
      });

      await storage.clearAllBundles();

      const metadata = storage.getMetadata();
      expect(metadata.currentVersion).toBeNull();
      expect(metadata.currentVersionHash).toBeNull();
      expect(metadata.previousVersion).toBeNull();
      expect(metadata.pendingVersion).toBeNull();
      expect(metadata.pendingUpdateFlag).toBe(false);
    });

    it("clearAllBundles preserves other metadata", async () => {
      const versionInfo = {
        appVersion: "2.0.0",
        buildNumber: "100",
        recordedAt: Date.now(),
      };
      await storage.setAppVersionInfo(versionInfo);
      await storage.setAccessToken("my-token");
      await storage.updateMetadata({ currentVersion: "1.0.0" });

      await storage.clearAllBundles();

      expect(storage.getAppVersionInfo()?.appVersion).toBe("2.0.0");
      expect(storage.getAccessToken()).toBe("my-token");
      expect(storage.getDeviceId()).toBe("test-device-id-123");
    });

    it("app version info persists across initialization", async () => {
      vi.clearAllMocks();
      storage = new Storage();

      const existingMetadata = {
        deviceId: "existing-device-123",
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
        appVersionInfo: {
          appVersion: "3.0.0",
          buildNumber: "200",
          recordedAt: 1700000000000,
        },
      };
      vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(existingMetadata));

      await storage.initialize();

      const versionInfo = storage.getAppVersionInfo();
      expect(versionInfo?.appVersion).toBe("3.0.0");
      expect(versionInfo?.buildNumber).toBe("200");
      expect(versionInfo?.recordedAt).toBe(1700000000000);
    });
  });

  describe("bundle hashes", () => {
    beforeEach(async () => {
      vi.mocked(AsyncStorage.getItem).mockResolvedValue(null);
      vi.mocked(AsyncStorage.setItem).mockResolvedValue();
      await storage.initialize();
    });

    it("gets and sets bundle hash", async () => {
      await storage.setBundleHash("1.0.0", "abc123");
      expect(storage.getBundleHash("1.0.0")).toBe("abc123");
    });

    it("returns null for unknown version hash", () => {
      expect(storage.getBundleHash("unknown-version")).toBeNull();
    });

    it("removeBundleVersion clears version and hash", async () => {
      await storage.updateMetadata({ currentVersion: "1.0.0" });
      await storage.setBundleHash("1.0.0", "hash123");

      await storage.removeBundleVersion("1.0.0");

      expect(storage.getCurrentVersion()).toBeNull();
      expect(storage.getBundleHash("1.0.0")).toBeNull();
    });

    it("stores multiple hashes correctly", async () => {
      await storage.setBundleHash("1.0.0", "hash1");
      await storage.setBundleHash("2.0.0", "hash2");
      await storage.setBundleHash("3.0.0", "hash3");

      expect(storage.getBundleHash("1.0.0")).toBe("hash1");
      expect(storage.getBundleHash("2.0.0")).toBe("hash2");
      expect(storage.getBundleHash("3.0.0")).toBe("hash3");
    });

    it("hashes persist across initialization", async () => {
      vi.clearAllMocks();
      storage = new Storage();

      const existingMetadata = {
        deviceId: "existing-device-123",
        accessToken: null,
        currentVersion: "1.0.0",
        currentVersionHash: null,
        previousVersion: null,
        pendingVersion: null,
        pendingUpdateFlag: false,
        lastCheckTime: null,
        crashCount: 0,
        lastCrashTime: null,
        verificationState: null,
        appVersionInfo: null,
        bundleHashes: { "1.0.0": "persisted-hash" },
      };
      vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(existingMetadata));

      await storage.initialize();

      expect(storage.getBundleHash("1.0.0")).toBe("persisted-hash");
    });

    it("removeBundleVersion clears previousVersion when matched", async () => {
      await storage.updateMetadata({ previousVersion: "0.9.0" });
      await storage.setBundleHash("0.9.0", "oldhash");

      await storage.removeBundleVersion("0.9.0");

      expect(storage.getMetadata().previousVersion).toBeNull();
      expect(storage.getBundleHash("0.9.0")).toBeNull();
    });

    it("removeBundleVersion clears pendingVersion when matched", async () => {
      await storage.updateMetadata({ pendingVersion: "2.0.0" });
      await storage.setBundleHash("2.0.0", "pendinghash");

      await storage.removeBundleVersion("2.0.0");

      expect(storage.getMetadata().pendingVersion).toBeNull();
      expect(storage.getBundleHash("2.0.0")).toBeNull();
    });
  });
});
