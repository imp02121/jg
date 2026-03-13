/** Storage Tests — covers all public methods on the Storage class. */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockStore = new Map<string, string>();
const { mockGetItem, mockSetItem, mockRemoveItem } = vi.hoisted(() => ({
  mockGetItem: vi.fn(),
  mockSetItem: vi.fn(),
  mockRemoveItem: vi.fn(),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: mockGetItem,
    setItem: mockSetItem,
    removeItem: mockRemoveItem,
  },
}));

vi.mock("../debug/logger", () => ({ logInfo: vi.fn(), logWarn: vi.fn() }));
vi.mock("../utils", () => ({
  generateDeviceId: () => "test-device-id-001",
}));

import { Storage } from "./storage";
import type { StoredMetadata } from "./types";
import { STORAGE_KEY } from "./types";

function buildMetadata(overrides: Partial<StoredMetadata> = {}): StoredMetadata {
  return {
    deviceId: "test-device-id-001",
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
    ...overrides,
  };
}

describe("Storage", () => {
  let storage: Storage;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    mockGetItem.mockImplementation((key: string) => Promise.resolve(mockStore.get(key) ?? null));
    mockSetItem.mockImplementation((key: string, val: string) => {
      mockStore.set(key, val);
      return Promise.resolve();
    });
    storage = new Storage();
  });

  describe("initialize", () => {
    it("creates default metadata on first run", async () => {
      await storage.initialize();
      const meta = storage.getMetadata();
      expect(meta.deviceId).toBe("test-device-id-001");
      expect(meta.crashCount).toBe(0);
    });

    it("loads existing metadata from AsyncStorage", async () => {
      const existing = buildMetadata({
        currentVersion: "1.2.0",
        crashCount: 3,
      });
      mockStore.set(STORAGE_KEY, JSON.stringify(existing));
      await storage.initialize();
      expect(storage.getMetadata().currentVersion).toBe("1.2.0");
      expect(storage.getMetadata().crashCount).toBe(3);
    });

    it("resets corrupted metadata and calls onStorageReset", async () => {
      const resetFn = vi.fn();
      const s = new Storage({ onStorageReset: resetFn });
      mockStore.set(STORAGE_KEY, "not-valid-json{{{");
      await s.initialize();
      expect(s.getMetadata().deviceId).toBe("test-device-id-001");
      expect(resetFn).toHaveBeenCalledWith("storage_error");
    });
  });

  describe("getMetadata / updateMetadata", () => {
    it("throws before initialization", () => {
      expect(() => storage.getMetadata()).toThrow("Storage not initialized");
    });

    it("merges partial updates into metadata", async () => {
      await storage.initialize();
      await storage.updateMetadata({ currentVersion: "2.0.0" });
      expect(storage.getMetadata().currentVersion).toBe("2.0.0");
      expect(storage.getMetadata().deviceId).toBe("test-device-id-001");
    });
  });

  describe("setPendingUpdate / applyPendingUpdate", () => {
    it("sets pending and applies it as current version", async () => {
      await storage.initialize();
      await storage.setPendingUpdate("3.0.0", "hash123", "Notes", "2026-01-01");
      expect(storage.getMetadata().pendingVersion).toBe("3.0.0");
      expect(storage.getMetadata().pendingUpdateFlag).toBe(true);

      await storage.applyPendingUpdate();
      const meta = storage.getMetadata();
      expect(meta.currentVersion).toBe("3.0.0");
      expect(meta.pendingVersion).toBeNull();
      expect(meta.pendingUpdateFlag).toBe(false);
      expect(meta.crashCount).toBe(0);
      expect(meta.currentReleaseNotes).toBe("Notes");
    });

    it("throws on empty version for setPendingUpdate", async () => {
      await storage.initialize();
      await expect(storage.setPendingUpdate("", "hash", "n")).rejects.toThrow(
        "version cannot be empty",
      );
    });

    it("applyPendingUpdate is no-op when no pending version", async () => {
      await storage.initialize();
      await storage.applyPendingUpdate();
      expect(storage.getMetadata().currentVersion).toBeNull();
    });

    it("stores pendingReleaseId via setPendingUpdate", async () => {
      await storage.initialize();
      await storage.setPendingUpdate("3.0.0", "hash123", "Notes", "2026-01-01", "rel-300");
      expect(storage.getMetadata().pendingReleaseId).toBe("rel-300");
    });

    it("moves pendingReleaseId to currentReleaseId on apply", async () => {
      await storage.initialize();
      await storage.setPendingUpdate("3.0.0", "hash123", "Notes", "2026-01-01", "rel-300");
      await storage.applyPendingUpdate();
      expect(storage.getMetadata().currentReleaseId).toBe("rel-300");
      expect(storage.getMetadata().pendingReleaseId).toBeNull();
    });
  });

  describe("rollback", () => {
    it("swaps current to previous version", async () => {
      const meta = buildMetadata({
        currentVersion: "2.0.0",
        previousVersion: "1.0.0",
        crashCount: 3,
      });
      mockStore.set(STORAGE_KEY, JSON.stringify(meta));
      await storage.initialize();

      await storage.rollback();
      expect(storage.getMetadata().currentVersion).toBe("1.0.0");
      expect(storage.getMetadata().previousVersion).toBeNull();
      expect(storage.getMetadata().crashCount).toBe(0);
    });

    it("is no-op when no previous version exists", async () => {
      await storage.initialize();
      await storage.updateMetadata({ currentVersion: "1.0.0" });
      await storage.rollback();
      expect(storage.getMetadata().currentVersion).toBe("1.0.0");
    });

    it("preserves rolledBackFromVersion after rollback", async () => {
      const meta = buildMetadata({
        currentVersion: "2.0.0",
        currentVersionHash: "hash200",
        currentReleaseId: "rel-200",
        previousVersion: "1.0.0",
      });
      mockStore.set(STORAGE_KEY, JSON.stringify(meta));
      await storage.initialize();

      await storage.rollback();
      expect(storage.getMetadata().rolledBackFromVersion).toBe("2.0.0");
    });

    it("preserves rolledBackFromHash after rollback", async () => {
      const meta = buildMetadata({
        currentVersion: "2.0.0",
        currentVersionHash: "hash200",
        currentReleaseId: "rel-200",
        previousVersion: "1.0.0",
      });
      mockStore.set(STORAGE_KEY, JSON.stringify(meta));
      await storage.initialize();

      await storage.rollback();
      expect(storage.getMetadata().rolledBackFromHash).toBe("hash200");
    });

    it("preserves rolledBackFromReleaseId after rollback", async () => {
      const meta = buildMetadata({
        currentVersion: "2.0.0",
        currentVersionHash: "hash200",
        currentReleaseId: "rel-200",
        previousVersion: "1.0.0",
      });
      mockStore.set(STORAGE_KEY, JSON.stringify(meta));
      await storage.initialize();

      await storage.rollback();
      expect(storage.getMetadata().rolledBackFromReleaseId).toBe("rel-200");
    });

    it("clears currentReleaseId after rollback", async () => {
      const meta = buildMetadata({
        currentVersion: "2.0.0",
        currentVersionHash: "hash200",
        currentReleaseId: "rel-200",
        previousVersion: "1.0.0",
      });
      mockStore.set(STORAGE_KEY, JSON.stringify(meta));
      await storage.initialize();

      await storage.rollback();
      expect(storage.getMetadata().currentReleaseId).toBeNull();
    });
  });

  describe("recordCrash / clearCrashCount", () => {
    it("increments crash count and clears it", async () => {
      await storage.initialize();
      const count = await storage.recordCrash();
      expect(count).toBe(1);
      expect(storage.getMetadata().crashCount).toBe(1);
      expect(storage.getMetadata().lastCrashTime).toBeTypeOf("number");

      await storage.clearCrashCount();
      expect(storage.getMetadata().crashCount).toBe(0);
      expect(storage.getMetadata().lastCrashTime).toBeNull();
    });
  });

  describe("deviceId / accessToken", () => {
    it("returns device id from metadata", async () => {
      await storage.initialize();
      expect(storage.getDeviceId()).toBe("test-device-id-001");
    });

    it("stores and retrieves access token", async () => {
      await storage.initialize();
      expect(storage.getAccessToken()).toBeNull();
      await storage.setAccessToken("jwt-token-xyz");
      expect(storage.getAccessToken()).toBe("jwt-token-xyz");
    });

    it("rejects empty access token", async () => {
      await storage.initialize();
      await expect(storage.setAccessToken("")).rejects.toThrow("cannot be empty");
      await expect(storage.setAccessToken("  ")).rejects.toThrow("cannot be empty");
    });
  });

  describe("bundle hash operations", () => {
    it("setBundleHash / getBundleHash / removeBundleVersion", async () => {
      await storage.initialize();
      await storage.setBundleHash("1.0.0", "sha256-hash-abc");
      expect(storage.getBundleHash("1.0.0")).toBe("sha256-hash-abc");
      expect(storage.getBundleHash("2.0.0")).toBeNull();

      await storage.removeBundleVersion("1.0.0");
      expect(storage.getBundleHash("1.0.0")).toBeNull();
    });

    it("clearAllBundles resets version state", async () => {
      await storage.initialize();
      await storage.updateMetadata({
        currentVersion: "1.0.0",
        previousVersion: "0.9.0",
      });
      await storage.setBundleHash("1.0.0", "hash1");
      await storage.clearAllBundles();

      expect(storage.getMetadata().currentVersion).toBeNull();
      expect(storage.getMetadata().previousVersion).toBeNull();
      expect(storage.getMetadata().bundleHashes).toEqual({});
    });
  });

  describe("verification state", () => {
    it("setAppReady + setHealthPassed → isFullyVerified", async () => {
      await storage.initialize();
      expect(storage.isFullyVerified()).toBe(false);

      await storage.setAppReady();
      expect(storage.isFullyVerified()).toBe(false);
      expect(storage.getVerificationState()?.appReady).toBe(true);

      await storage.setHealthPassed();
      expect(storage.isFullyVerified()).toBe(true);
      expect(storage.getVerificationState()?.verifiedAt).toBeTypeOf("number");
    });

    it("only appReady without healthPassed is not verified", async () => {
      await storage.initialize();
      await storage.setAppReady();
      expect(storage.isFullyVerified()).toBe(false);
      expect(storage.getVerificationState()?.healthPassed).toBe(false);
    });

    it("resetVerificationState clears state", async () => {
      await storage.initialize();
      await storage.setAppReady();
      await storage.setHealthPassed();
      await storage.resetVerificationState();
      expect(storage.getVerificationState()).toBeNull();
      expect(storage.isFullyVerified()).toBe(false);
    });
  });
});
