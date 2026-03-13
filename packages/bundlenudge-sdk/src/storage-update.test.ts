/**
 * Storage Update Tests
 *
 * Tests for pending update and rollback operations.
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

describe("Storage - Update Operations", () => {
  let storage: Storage;

  beforeEach(() => {
    vi.clearAllMocks();
    storage = new Storage();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("pending update", () => {
    beforeEach(async () => {
      vi.mocked(AsyncStorage.getItem).mockResolvedValue(null);
      vi.mocked(AsyncStorage.setItem).mockResolvedValue();
      await storage.initialize();
    });

    it("sets pending update flag", async () => {
      await storage.setPendingUpdate("1.1.0", "hash456");

      const metadata = storage.getMetadata();
      expect(metadata.pendingVersion).toBe("1.1.0");
      expect(metadata.pendingUpdateFlag).toBe(true);
    });

    it("stores pending hash alongside version", async () => {
      await storage.setPendingUpdate("1.1.0", "sha256:abc123");

      const metadata = storage.getMetadata();
      expect(metadata.pendingVersion).toBe("1.1.0");
      expect(metadata.pendingVersionHash).toBe("sha256:abc123");
    });

    it("applies pending update and carries hash to currentVersionHash", async () => {
      await storage.updateMetadata({ currentVersion: "1.0.0" });
      await storage.setPendingUpdate("1.1.0", "sha256:abc123");
      await storage.applyPendingUpdate();

      const metadata = storage.getMetadata();
      expect(metadata.currentVersion).toBe("1.1.0");
      expect(metadata.currentVersionHash).toBe("sha256:abc123");
      expect(metadata.previousVersion).toBe("1.0.0");
      expect(metadata.pendingVersion).toBeNull();
      expect(metadata.pendingVersionHash).toBeNull();
      expect(metadata.pendingUpdateFlag).toBe(false);
    });

    it("clears currentVersionHash on rollback", async () => {
      await storage.updateMetadata({
        currentVersion: "2.0.0",
        currentVersionHash: "sha256:badhash",
        previousVersion: "1.0.0",
      });
      await storage.rollback();

      const metadata = storage.getMetadata();
      expect(metadata.currentVersion).toBe("1.0.0");
      expect(metadata.currentVersionHash).toBeNull();
    });
  });

  describe("rollback", () => {
    beforeEach(async () => {
      vi.mocked(AsyncStorage.getItem).mockResolvedValue(null);
      vi.mocked(AsyncStorage.setItem).mockResolvedValue();
      await storage.initialize();
    });

    it("rolls back to previous version", async () => {
      await storage.updateMetadata({
        currentVersion: "2.0.0",
        previousVersion: "1.0.0",
        crashCount: 2,
      });

      await storage.rollback();

      const metadata = storage.getMetadata();
      expect(metadata.currentVersion).toBe("1.0.0");
      expect(metadata.previousVersion).toBeNull();
      expect(metadata.crashCount).toBe(0);
    });

    it("does nothing if no previous version", async () => {
      await storage.updateMetadata({ currentVersion: "1.0.0" });
      await storage.rollback();

      expect(storage.getCurrentVersion()).toBe("1.0.0");
    });

    it("rolls back to embedded bundle when previousVersion is __embedded__", async () => {
      await storage.updateMetadata({
        currentVersion: "1.0.22",
        previousVersion: "__embedded__",
        crashCount: 3,
      });

      await storage.rollback();

      const metadata = storage.getMetadata();
      expect(metadata.currentVersion).toBeNull();
      expect(metadata.previousVersion).toBeNull();
      expect(metadata.crashCount).toBe(0);
    });

    it("clears previous version", async () => {
      await storage.updateMetadata({ previousVersion: "0.9.0" });
      await storage.clearPreviousVersion();

      expect(storage.getMetadata().previousVersion).toBeNull();
    });
  });

  describe("first OTA → embedded rollback", () => {
    beforeEach(async () => {
      vi.mocked(AsyncStorage.getItem).mockResolvedValue(null);
      vi.mocked(AsyncStorage.setItem).mockResolvedValue();
      await storage.initialize();
    });

    it("sets previousVersion to __embedded__ on first OTA apply", async () => {
      // currentVersion is null (fresh install, no OTA yet)
      expect(storage.getCurrentVersion()).toBeNull();

      await storage.setPendingUpdate("1.0.22", "hash123");
      await storage.applyPendingUpdate();

      const metadata = storage.getMetadata();
      expect(metadata.currentVersion).toBe("1.0.22");
      expect(metadata.previousVersion).toBe("__embedded__");
    });

    it("sets normal previousVersion on subsequent OTA apply", async () => {
      await storage.updateMetadata({ currentVersion: "1.0.22" });
      await storage.setPendingUpdate("1.0.23", "hash456");
      await storage.applyPendingUpdate();

      const metadata = storage.getMetadata();
      expect(metadata.currentVersion).toBe("1.0.23");
      expect(metadata.previousVersion).toBe("1.0.22");
    });
  });

  describe("crash tracking", () => {
    beforeEach(async () => {
      vi.mocked(AsyncStorage.getItem).mockResolvedValue(null);
      vi.mocked(AsyncStorage.setItem).mockResolvedValue();
      await storage.initialize();
    });

    it("records crash and increments count", async () => {
      const count1 = await storage.recordCrash();
      expect(count1).toBe(1);

      const count2 = await storage.recordCrash();
      expect(count2).toBe(2);

      expect(storage.getMetadata().lastCrashTime).not.toBeNull();
    });

    it("clears crash count", async () => {
      await storage.recordCrash();
      await storage.recordCrash();
      await storage.clearCrashCount();

      const metadata = storage.getMetadata();
      expect(metadata.crashCount).toBe(0);
      expect(metadata.lastCrashTime).toBeNull();
    });
  });
});
