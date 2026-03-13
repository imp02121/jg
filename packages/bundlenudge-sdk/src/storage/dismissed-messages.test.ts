/**
 * Dismissed Messages Storage Tests
 *
 * Tests for the dismissed in-app messages persistence layer.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock AsyncStorage
const mockStore = new Map<string, string>();

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn((key: string) => Promise.resolve(mockStore.get(key) ?? null)),
    setItem: vi.fn((key: string, value: string) => {
      mockStore.set(key, value);
      return Promise.resolve();
    }),
    removeItem: vi.fn((key: string) => {
      mockStore.delete(key);
      return Promise.resolve();
    }),
  },
}));

import { addDismissedMessage, clearDismissedMessages, isDismissed } from "./dismissed-messages";

describe("dismissed-messages", () => {
  beforeEach(() => {
    mockStore.clear();
    vi.clearAllMocks();
  });

  describe("isDismissed", () => {
    it("returns false for unknown ID", async () => {
      const result = await isDismissed("unknown-id");
      expect(result).toBe(false);
    });

    it("returns false when storage is empty", async () => {
      const result = await isDismissed("any-id");
      expect(result).toBe(false);
    });

    it("returns true after adding a message", async () => {
      await addDismissedMessage("msg-1");
      const result = await isDismissed("msg-1");
      expect(result).toBe(true);
    });

    it("returns false for a different ID", async () => {
      await addDismissedMessage("msg-1");
      const result = await isDismissed("msg-2");
      expect(result).toBe(false);
    });
  });

  describe("addDismissedMessage", () => {
    it("persists a message ID", async () => {
      await addDismissedMessage("msg-a");

      const raw = mockStore.get("@bundlenudge:dismissed_messages");
      expect(raw).toBeDefined();
      const ids = JSON.parse(raw!);
      expect(ids).toContain("msg-a");
    });

    it("does not duplicate an already-dismissed message", async () => {
      await addDismissedMessage("msg-a");
      await addDismissedMessage("msg-a");

      const raw = mockStore.get("@bundlenudge:dismissed_messages");
      const ids = JSON.parse(raw!);
      expect(ids.filter((id: string) => id === "msg-a")).toHaveLength(1);
    });

    it("FIFO eviction at 50 entries", async () => {
      // Add 50 messages
      for (let i = 0; i < 50; i++) {
        await addDismissedMessage(`msg-${String(i)}`);
      }

      // Verify all 50 are present
      const raw50 = mockStore.get("@bundlenudge:dismissed_messages");
      const ids50: string[] = JSON.parse(raw50!);
      expect(ids50).toHaveLength(50);
      expect(ids50[0]).toBe("msg-0");

      // Add one more — should evict the first
      await addDismissedMessage("msg-50");

      const raw51 = mockStore.get("@bundlenudge:dismissed_messages");
      const ids51: string[] = JSON.parse(raw51!);
      expect(ids51).toHaveLength(50);
      expect(ids51).not.toContain("msg-0");
      expect(ids51[0]).toBe("msg-1");
      expect(ids51[49]).toBe("msg-50");
    });
  });

  describe("clearDismissedMessages", () => {
    it("removes all dismissed messages", async () => {
      await addDismissedMessage("msg-1");
      await addDismissedMessage("msg-2");

      await clearDismissedMessages();

      const result1 = await isDismissed("msg-1");
      const result2 = await isDismissed("msg-2");
      expect(result1).toBe(false);
      expect(result2).toBe(false);
    });

    it("does not throw when storage is already empty", async () => {
      await expect(clearDismissedMessages()).resolves.not.toThrow();
    });
  });
});
