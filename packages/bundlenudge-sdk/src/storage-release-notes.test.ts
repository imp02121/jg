/**
 * Storage Release Notes Tests
 *
 * Tests for release notes and releasedAt fields in pending/current updates,
 * including rollback behavior that clears these fields.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Storage } from "./storage";

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  },
}));

vi.mock("./utils", () => ({
  generateDeviceId: () => "test-device-id-123",
}));

describe("Storage - Release Notes", () => {
  let storage: Storage;

  beforeEach(async () => {
    vi.clearAllMocks();
    storage = new Storage();
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(null);
    vi.mocked(AsyncStorage.setItem).mockResolvedValue();
    await storage.initialize();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("setPendingUpdate", () => {
    it("stores releaseNotes and releasedAt", async () => {
      await storage.setPendingUpdate(
        "2.0.0",
        "hash-abc",
        "Fixed crash on launch.",
        "2026-02-01T12:00:00Z",
      );

      const metadata = storage.getMetadata();
      expect(metadata.pendingReleaseNotes).toBe("Fixed crash on launch.");
      expect(metadata.pendingReleasedAt).toBe("2026-02-01T12:00:00Z");
    });

    it("stores null when releaseNotes not provided", async () => {
      await storage.setPendingUpdate("2.0.0", "hash-abc");

      const metadata = storage.getMetadata();
      expect(metadata.pendingReleaseNotes).toBeNull();
      expect(metadata.pendingReleasedAt).toBeNull();
    });

    it("stores null when releaseNotes is undefined", async () => {
      await storage.setPendingUpdate("2.0.0", "hash-abc", undefined, undefined);

      const metadata = storage.getMetadata();
      expect(metadata.pendingReleaseNotes).toBeNull();
      expect(metadata.pendingReleasedAt).toBeNull();
    });
  });

  describe("applyPendingUpdate", () => {
    it("copies pending release notes to current", async () => {
      await storage.setPendingUpdate(
        "2.0.0",
        "hash-abc",
        "New dark mode feature.",
        "2026-01-20T08:30:00Z",
      );
      await storage.applyPendingUpdate();

      const metadata = storage.getMetadata();
      expect(metadata.currentReleaseNotes).toBe("New dark mode feature.");
      expect(metadata.currentReleasedAt).toBe("2026-01-20T08:30:00Z");
    });

    it("clears pending release notes after apply", async () => {
      await storage.setPendingUpdate(
        "2.0.0",
        "hash-abc",
        "Performance improvements.",
        "2026-01-25T14:00:00Z",
      );
      await storage.applyPendingUpdate();

      const metadata = storage.getMetadata();
      expect(metadata.pendingReleaseNotes).toBeNull();
      expect(metadata.pendingReleasedAt).toBeNull();
    });

    it("sets current release notes to null when pending has none", async () => {
      await storage.updateMetadata({
        currentReleaseNotes: "Old notes",
        currentReleasedAt: "2026-01-01T00:00:00Z",
      });
      await storage.setPendingUpdate("3.0.0", "hash-xyz");
      await storage.applyPendingUpdate();

      const metadata = storage.getMetadata();
      expect(metadata.currentReleaseNotes).toBeNull();
      expect(metadata.currentReleasedAt).toBeNull();
    });
  });

  describe("getReleaseNotes and getReleasedAt", () => {
    it("returns null when no release notes stored", () => {
      expect(storage.getReleaseNotes()).toBeNull();
      expect(storage.getReleasedAt()).toBeNull();
    });

    it("returns correct values after update applied", async () => {
      await storage.setPendingUpdate(
        "2.0.0",
        "hash-abc",
        "Added push notifications.",
        "2026-02-05T16:00:00Z",
      );
      await storage.applyPendingUpdate();

      expect(storage.getReleaseNotes()).toBe("Added push notifications.");
      expect(storage.getReleasedAt()).toBe("2026-02-05T16:00:00Z");
    });

    it("returns values set directly via updateMetadata", async () => {
      await storage.updateMetadata({
        currentReleaseNotes: "Direct notes",
        currentReleasedAt: "2026-02-07T09:00:00Z",
      });

      expect(storage.getReleaseNotes()).toBe("Direct notes");
      expect(storage.getReleasedAt()).toBe("2026-02-07T09:00:00Z");
    });
  });

  describe("rollback clears release notes", () => {
    it("clears currentReleaseNotes and currentReleasedAt", async () => {
      await storage.updateMetadata({
        currentVersion: "2.0.0",
        previousVersion: "1.0.0",
        currentReleaseNotes: "Version 2 notes.",
        currentReleasedAt: "2026-02-01T12:00:00Z",
        crashCount: 3,
      });

      await storage.rollback();

      const metadata = storage.getMetadata();
      expect(metadata.currentVersion).toBe("1.0.0");
      expect(metadata.currentReleaseNotes).toBeNull();
      expect(metadata.currentReleasedAt).toBeNull();
    });

    it("is a no-op when no previous version", async () => {
      await storage.updateMetadata({
        currentVersion: "2.0.0",
        currentReleaseNotes: "Keep these notes.",
        currentReleasedAt: "2026-02-01T12:00:00Z",
      });

      await storage.rollback();

      expect(storage.getReleaseNotes()).toBe("Keep these notes.");
      expect(storage.getReleasedAt()).toBe("2026-02-01T12:00:00Z");
    });
  });
});
