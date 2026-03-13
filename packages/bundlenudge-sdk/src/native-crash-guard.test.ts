/**
 * NativeCrashGuard Tests
 *
 * Tests for pre-JS crash detection using persistent storage flags.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkForCrashOnStart, clearBundleLoading, markBundleLoading } from "./native-crash-guard";

// Mock AsyncStorage
const mockStore: Record<string, string> = {};
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn((key: string) => Promise.resolve(mockStore[key] ?? null)),
    setItem: vi.fn((key: string, value: string) => {
      mockStore[key] = value;
      return Promise.resolve();
    }),
    removeItem: vi.fn((key: string) => {
      Reflect.deleteProperty(mockStore, key);
      return Promise.resolve();
    }),
  },
}));

// Mock logger to suppress output
vi.mock("./debug/logger", () => ({
  logWarn: vi.fn(),
  logError: vi.fn(),
}));

const CRASH_GUARD_KEY = "@bundlenudge/crash_guard";

describe("NativeCrashGuard", () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach((key) => Reflect.deleteProperty(mockStore, key));
    vi.clearAllMocks();
  });

  describe("checkForCrashOnStart", () => {
    it("returns crashed:false when no flag is set", async () => {
      const result = await checkForCrashOnStart();
      expect(result).toEqual({ crashed: false });
    });

    it("returns crashed:true with version/hash when flag is set", async () => {
      mockStore[CRASH_GUARD_KEY] = JSON.stringify({
        loadingOtaBundle: true,
        bundleVersion: "2.0.0",
        bundleHash: "abc123",
        timestamp: Date.now(),
      });

      const result = await checkForCrashOnStart();
      expect(result).toEqual({
        crashed: true,
        version: "2.0.0",
        hash: "abc123",
      });
    });

    it("clears the flag after detecting a crash", async () => {
      mockStore[CRASH_GUARD_KEY] = JSON.stringify({
        loadingOtaBundle: true,
        bundleVersion: "2.0.0",
        bundleHash: "abc123",
        timestamp: Date.now(),
      });

      const first = await checkForCrashOnStart();
      expect(first.crashed).toBe(true);

      // Second call should return false because flag was cleared
      const second = await checkForCrashOnStart();
      expect(second.crashed).toBe(false);
    });

    it("returns crashed:false for invalid JSON in storage", async () => {
      mockStore[CRASH_GUARD_KEY] = "not-valid-json{{{";

      const result = await checkForCrashOnStart();
      expect(result).toEqual({ crashed: false });
    });

    it("returns crashed:false for malformed state object", async () => {
      mockStore[CRASH_GUARD_KEY] = JSON.stringify({
        loadingOtaBundle: "yes",
        bundleVersion: 123,
      });

      const result = await checkForCrashOnStart();
      expect(result).toEqual({ crashed: false });
    });

    it("returns crashed:false when loadingOtaBundle is false", async () => {
      mockStore[CRASH_GUARD_KEY] = JSON.stringify({
        loadingOtaBundle: false,
        bundleVersion: "2.0.0",
        bundleHash: "abc123",
        timestamp: Date.now(),
      });

      const result = await checkForCrashOnStart();
      expect(result).toEqual({ crashed: false });
    });
  });

  describe("markBundleLoading", () => {
    it("writes the crash guard flag to storage", async () => {
      await markBundleLoading("3.0.0", "def456");

      const stored = JSON.parse(mockStore[CRASH_GUARD_KEY]) as Record<string, unknown>;
      expect(stored.loadingOtaBundle).toBe(true);
      expect(stored.bundleVersion).toBe("3.0.0");
      expect(stored.bundleHash).toBe("def456");
      expect(typeof stored.timestamp).toBe("number");
    });

    it("overwrites any previous flag", async () => {
      await markBundleLoading("1.0.0", "first");
      await markBundleLoading("2.0.0", "second");

      const stored = JSON.parse(mockStore[CRASH_GUARD_KEY]) as Record<string, unknown>;
      expect(stored.bundleVersion).toBe("2.0.0");
      expect(stored.bundleHash).toBe("second");
    });
  });

  describe("clearBundleLoading", () => {
    it("removes the crash guard flag from storage", async () => {
      await markBundleLoading("2.0.0", "abc123");
      expect(mockStore[CRASH_GUARD_KEY]).toBeDefined();

      await clearBundleLoading();
      expect(mockStore[CRASH_GUARD_KEY]).toBeUndefined();
    });

    it("does not throw when no flag exists", async () => {
      await expect(clearBundleLoading()).resolves.toBeUndefined();
    });
  });

  describe("full lifecycle", () => {
    it("mark + clear + check returns no crash", async () => {
      await markBundleLoading("2.0.0", "abc123");
      await clearBundleLoading();

      const result = await checkForCrashOnStart();
      expect(result).toEqual({ crashed: false });
    });

    it("mark + no clear + check returns crash (simulates crash)", async () => {
      await markBundleLoading("2.0.0", "abc123");
      // No clearBundleLoading() — simulates a crash

      const result = await checkForCrashOnStart();
      expect(result).toEqual({
        crashed: true,
        version: "2.0.0",
        hash: "abc123",
      });
    });

    it("persists through guard recreation (storage round-trip)", async () => {
      // markBundleLoading writes to the shared mockStore
      await markBundleLoading("4.0.0", "hash999");

      // Simulate app restart — checkForCrashOnStart reads from same store
      const result = await checkForCrashOnStart();
      expect(result).toEqual({
        crashed: true,
        version: "4.0.0",
        hash: "hash999",
      });
    });
  });

  describe("error resilience", () => {
    it("checkForCrashOnStart returns false on AsyncStorage read error", async () => {
      const AsyncStorage = await import("@react-native-async-storage/async-storage");
      vi.mocked(AsyncStorage.default.getItem).mockRejectedValueOnce(
        new Error("Storage read failure"),
      );

      const result = await checkForCrashOnStart();
      expect(result).toEqual({ crashed: false });
    });

    it("markBundleLoading does not throw on write error", async () => {
      const AsyncStorage = await import("@react-native-async-storage/async-storage");
      vi.mocked(AsyncStorage.default.setItem).mockRejectedValueOnce(
        new Error("Storage write failure"),
      );

      await expect(markBundleLoading("1.0.0", "abc")).resolves.toBeUndefined();
    });

    it("clearBundleLoading does not throw on remove error", async () => {
      const AsyncStorage = await import("@react-native-async-storage/async-storage");
      vi.mocked(AsyncStorage.default.removeItem).mockRejectedValueOnce(
        new Error("Storage remove failure"),
      );

      await expect(clearBundleLoading()).resolves.toBeUndefined();
    });
  });
});
