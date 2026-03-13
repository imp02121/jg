import { createHash } from "node:crypto";
/** CircuitBreaker Tests — all hashes are real SHA-256 digests. */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetItem, mockSetItem } = vi.hoisted(() => ({
  mockGetItem: vi.fn(),
  mockSetItem: vi.fn(),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: { getItem: mockGetItem, setItem: mockSetItem },
}));

vi.mock("./debug/logger", () => ({ logInfo: vi.fn(), logWarn: vi.fn() }));

import { CircuitBreaker } from "./circuit-breaker";

function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

const HASH_V1 = sha256("bundle-v1.0.0");
const HASH_V2 = sha256("bundle-v2.0.0");
const HASH_V3 = sha256("bundle-v3.0.0");
const HASH_V1_FIX = sha256("bundle-v1.0.0-fix");
const HASH_V5 = sha256("bundle-v5.0.0");

describe("CircuitBreaker", () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue(undefined);
    breaker = new CircuitBreaker();
  });

  describe("isBlacklisted", () => {
    it("returns false for empty blacklist", () => {
      expect(breaker.isBlacklisted("1.0.0", HASH_V1)).toBe(false);
      expect(breaker.size).toBe(0);
    });

    it("matches on exact version+hash combination", () => {
      breaker.blacklist("1.0.0", HASH_V1);
      expect(breaker.isBlacklisted("1.0.0", HASH_V1)).toBe(true);
      expect(breaker.isBlacklisted("1.0.0", HASH_V1_FIX)).toBe(false);
    });

    it("rejects partial hash match — must be exact", () => {
      // Security: partial hash collisions must not bypass the blacklist.
      // If only a prefix were checked, an attacker could craft a bundle
      // whose hash shares a prefix with a known-good bundle.
      breaker.blacklist("1.0.0", HASH_V1);
      expect(breaker.isBlacklisted("1.0.0", HASH_V1.slice(0, 16))).toBe(false);
      expect(breaker.isBlacklisted("1.0.0", HASH_V1)).toBe(true);
    });

    it("requires both version and hash to match", () => {
      breaker.blacklist("1.0.0", HASH_V1);
      expect(breaker.isBlacklisted("2.0.0", HASH_V1)).toBe(false);
      expect(breaker.isBlacklisted("", HASH_V1)).toBe(false);
      expect(breaker.isBlacklisted("1.0.0", "")).toBe(false);
    });
  });

  describe("blacklist", () => {
    it("adds entry and increments size", () => {
      breaker.blacklist("1.0.0", HASH_V1);
      expect(breaker.size).toBe(1);
      expect(breaker.isBlacklisted("1.0.0", HASH_V1)).toBe(true);
    });

    it("ignores empty version or empty hash", () => {
      breaker.blacklist("", HASH_V1);
      breaker.blacklist("1.0.0", "");
      expect(breaker.size).toBe(0);
    });

    it("tracks multiple distinct version+hash pairs", () => {
      breaker.blacklist("1.0.0", HASH_V1);
      breaker.blacklist("2.0.0", HASH_V2);
      breaker.blacklist("1.0.0", HASH_V1_FIX);
      expect(breaker.size).toBe(3);
      expect(breaker.isBlacklisted("2.0.0", HASH_V2)).toBe(true);
    });

    it("overwrites duplicate without increasing size", () => {
      breaker.blacklist("1.0.0", HASH_V1);
      breaker.blacklist("1.0.0", HASH_V1);
      expect(breaker.size).toBe(1);
      expect(breaker.isBlacklisted("1.0.0", HASH_V1)).toBe(true);
    });

    it("enforces max 50 entries by evicting oldest first", () => {
      const hashes: string[] = [];
      for (let i = 0; i < 55; i++) {
        const h = sha256(`bundle-overflow-${String(i)}`);
        hashes.push(h);
        breaker.blacklist(`${String(i)}.0.0`, h);
      }
      expect(breaker.size).toBe(50);
      expect(breaker.isBlacklisted("0.0.0", hashes[0])).toBe(false);
      expect(breaker.isBlacklisted("54.0.0", hashes[54])).toBe(true);
    });
  });

  describe("pruneOlderThan", () => {
    it("removes entries with different versions, keeps current", () => {
      breaker.blacklist("1.0.0", HASH_V1);
      breaker.blacklist("2.0.0", HASH_V2);
      breaker.blacklist("3.0.0", HASH_V3);
      breaker.pruneOlderThan("3.0.0");
      expect(breaker.isBlacklisted("1.0.0", HASH_V1)).toBe(false);
      expect(breaker.isBlacklisted("3.0.0", HASH_V3)).toBe(true);
      expect(breaker.size).toBe(1);
    });

    it("keeps all entries matching the current version", () => {
      breaker.blacklist("2.0.0", HASH_V2);
      breaker.blacklist("2.0.0", HASH_V1_FIX);
      breaker.pruneOlderThan("2.0.0");
      expect(breaker.size).toBe(2);
      expect(breaker.isBlacklisted("2.0.0", HASH_V2)).toBe(true);
    });

    it("does nothing for empty version or empty blacklist", () => {
      breaker.blacklist("1.0.0", HASH_V1);
      breaker.pruneOlderThan("");
      expect(breaker.size).toBe(1);

      const empty = new CircuitBreaker();
      empty.pruneOlderThan("1.0.0");
      expect(empty.size).toBe(0);
    });
  });

  describe("persistence (load/save)", () => {
    it("loads valid entries from AsyncStorage", async () => {
      const now = Date.now();
      const stored = [
        { version: "1.0.0", bundleHash: HASH_V1, rolledBackAt: now - 1000 },
        { version: "2.0.0", bundleHash: HASH_V2, rolledBackAt: now - 2000 },
      ];
      mockGetItem.mockResolvedValue(JSON.stringify(stored));
      await breaker.load();
      expect(breaker.size).toBe(2);
      expect(breaker.isBlacklisted("1.0.0", HASH_V1)).toBe(true);
      expect(breaker.isLoaded()).toBe(true);
    });

    it("saves and round-trips through new instance", async () => {
      breaker.blacklist("1.0.0", HASH_V1);
      breaker.blacklist("3.0.0", HASH_V3);
      await breaker.save();

      const saved = JSON.parse(mockSetItem.mock.calls[0][1] as string) as {
        version: string;
        bundleHash: string;
      }[];
      expect(saved).toHaveLength(2);
      expect(saved.map((e) => e.bundleHash)).toContain(HASH_V1);

      mockGetItem.mockResolvedValue(mockSetItem.mock.calls[0][1] as string);
      const breaker2 = new CircuitBreaker();
      await breaker2.load();
      expect(breaker2.isBlacklisted("1.0.0", HASH_V1)).toBe(true);
      expect(breaker2.isBlacklisted("1.0.0", HASH_V1_FIX)).toBe(false);
    });

    it("handles empty storage, corrupted JSON, and non-array JSON", async () => {
      mockGetItem.mockResolvedValue(null);
      await breaker.load();
      expect(breaker.size).toBe(0);
      expect(breaker.isLoaded()).toBe(true);

      const b2 = new CircuitBreaker();
      mockGetItem.mockResolvedValue("not-valid-json{{{");
      await b2.load();
      expect(b2.size).toBe(0);
      expect(b2.isLoaded()).toBe(true);

      const b3 = new CircuitBreaker();
      mockGetItem.mockResolvedValue(JSON.stringify({ foo: "bar" }));
      await b3.load();
      expect(b3.size).toBe(0);
    });

    it("skips invalid entries during load, keeps valid ones", async () => {
      const now = Date.now();
      const stored = [
        { version: "1.0.0", bundleHash: HASH_V1, rolledBackAt: now - 1000 },
        { version: "", bundleHash: HASH_V2, rolledBackAt: now - 2000 },
        { version: "3.0.0", bundleHash: "", rolledBackAt: now - 3000 },
        null,
        42,
        { version: "4.0.0", bundleHash: HASH_V3, rolledBackAt: -1 },
        { version: "5.0.0", bundleHash: HASH_V5, rolledBackAt: now - 5000 },
      ];
      mockGetItem.mockResolvedValue(JSON.stringify(stored));
      await breaker.load();
      expect(breaker.size).toBe(2);
      expect(breaker.isBlacklisted("1.0.0", HASH_V1)).toBe(true);
      expect(breaker.isBlacklisted("5.0.0", HASH_V5)).toBe(true);
      expect(breaker.isBlacklisted("4.0.0", HASH_V3)).toBe(false);
    });

    it("handles AsyncStorage errors without crashing", async () => {
      mockGetItem.mockRejectedValue(new Error("Storage error"));
      await breaker.load();
      expect(breaker.size).toBe(0);
      expect(breaker.isLoaded()).toBe(true);

      mockSetItem.mockRejectedValue(new Error("Storage error"));
      breaker.blacklist("1.0.0", HASH_V1);
      await breaker.save();
      expect(breaker.isBlacklisted("1.0.0", HASH_V1)).toBe(true);
    });
  });

  describe("isLoaded", () => {
    it("returns false before load, true after success or failure", async () => {
      expect(breaker.isLoaded()).toBe(false);
      await breaker.load();
      expect(breaker.isLoaded()).toBe(true);

      mockGetItem.mockRejectedValue(new Error("fail"));
      const b2 = new CircuitBreaker();
      await b2.load();
      expect(b2.isLoaded()).toBe(true);
    });
  });

  describe("integration: full crash-rollback-blacklist cycle", () => {
    it("blocks re-offered crashed bundle, allows re-published fix", async () => {
      const crashedHash = sha256("crashed-bundle-content");
      breaker.blacklist("1.0.0", crashedHash);
      await breaker.save();

      const savedValue = mockSetItem.mock.calls[0][1] as string;
      mockGetItem.mockResolvedValue(savedValue);
      const fresh = new CircuitBreaker();
      await fresh.load();

      expect(fresh.isBlacklisted("1.0.0", crashedHash)).toBe(true);
      const fixedHash = sha256("fixed-bundle-content");
      expect(fresh.isBlacklisted("1.0.0", fixedHash)).toBe(false);

      fresh.pruneOlderThan("2.0.0");
      expect(fresh.size).toBe(0);
    });
  });
});
