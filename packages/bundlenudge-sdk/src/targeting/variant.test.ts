/**
 * Variant Tracking Tests
 *
 * Tests for the variant tracking module that manages A/B test assignments.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearVariant,
  createVariantManager,
  getVariant,
  isControlGroup,
  loadVariant,
  setVariant,
} from "./variant";
import type { VariantInfo } from "./variant";

// Mock AsyncStorage
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

const STORAGE_KEY = "@bundlenudge:variant";

const testVariant: VariantInfo = {
  id: "variant-123",
  name: "test-variant",
  isControl: false,
};

const controlVariant: VariantInfo = {
  id: "control-456",
  name: "control",
  isControl: true,
};

describe("createVariantManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(AsyncStorage.setItem).mockResolvedValue();
    vi.mocked(AsyncStorage.removeItem).mockResolvedValue();
  });

  describe("getVariant", () => {
    it("returns null when no variant assigned", () => {
      const manager = createVariantManager();
      expect(manager.getVariant()).toBeNull();
    });

    it("returns variant after setVariant", async () => {
      const manager = createVariantManager();
      await manager.setVariant(testVariant);
      expect(manager.getVariant()).toEqual(testVariant);
    });
  });

  describe("setVariant", () => {
    it("sets variant in memory", async () => {
      const manager = createVariantManager();
      await manager.setVariant(testVariant);
      expect(manager.getVariant()).toEqual(testVariant);
    });

    it("persists variant to AsyncStorage", async () => {
      const manager = createVariantManager();
      await manager.setVariant(testVariant);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify(testVariant));
    });

    it("does not throw on storage failure (fire-and-forget)", async () => {
      vi.mocked(AsyncStorage.setItem).mockRejectedValue(new Error("Storage error"));

      const manager = createVariantManager();
      // Should not throw
      await expect(manager.setVariant(testVariant)).resolves.not.toThrow();
      expect(manager.getVariant()).toEqual(testVariant);
    });
  });

  describe("clearVariant", () => {
    it("clears variant from memory", async () => {
      const manager = createVariantManager();
      await manager.setVariant(testVariant);
      await manager.clearVariant();
      expect(manager.getVariant()).toBeNull();
    });

    it("removes variant from AsyncStorage", async () => {
      const manager = createVariantManager();
      await manager.setVariant(testVariant);
      await manager.clearVariant();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
    });
  });

  describe("isControlGroup", () => {
    it("returns false when no variant assigned", () => {
      const manager = createVariantManager();
      expect(manager.isControlGroup()).toBe(false);
    });

    it("returns false when assigned to treatment variant", async () => {
      const manager = createVariantManager();
      await manager.setVariant(testVariant);
      expect(manager.isControlGroup()).toBe(false);
    });

    it("returns true when assigned to control variant", async () => {
      const manager = createVariantManager();
      await manager.setVariant(controlVariant);
      expect(manager.isControlGroup()).toBe(true);
    });
  });
});

describe("singleton functions", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(AsyncStorage.setItem).mockResolvedValue();
    vi.mocked(AsyncStorage.removeItem).mockResolvedValue();
    // Clear singleton state
    await clearVariant();
  });

  it("getVariant returns null initially", () => {
    expect(getVariant()).toBeNull();
  });

  it("setVariant and getVariant work together", async () => {
    await setVariant(testVariant);
    expect(getVariant()).toEqual(testVariant);
  });

  it("clearVariant clears the singleton", async () => {
    await setVariant(testVariant);
    await clearVariant();
    expect(getVariant()).toBeNull();
  });

  it("isControlGroup uses singleton", async () => {
    expect(isControlGroup()).toBe(false);
    await setVariant(controlVariant);
    expect(isControlGroup()).toBe(true);
  });
});

describe("loadVariant", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(AsyncStorage.setItem).mockResolvedValue();
    vi.mocked(AsyncStorage.removeItem).mockResolvedValue();
    await clearVariant();
  });

  it("returns null when no stored variant", async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(null);
    const result = await loadVariant();
    expect(result).toBeNull();
  });

  it("loads and returns stored variant", async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(testVariant));
    const result = await loadVariant();
    expect(result).toEqual(testVariant);
    expect(getVariant()).toEqual(testVariant);
  });

  it("returns null and clears on invalid JSON", async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValue("invalid-json{{{");
    const result = await loadVariant();
    expect(result).toBeNull();
  });

  it("returns null and clears on invalid variant structure", async () => {
    const invalidVariant = { id: 123, name: "test" }; // missing isControl, wrong id type
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(invalidVariant));

    const result = await loadVariant();

    expect(result).toBeNull();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
  });

  it("returns null on storage error", async () => {
    vi.mocked(AsyncStorage.getItem).mockRejectedValue(new Error("Storage error"));
    const result = await loadVariant();
    expect(result).toBeNull();
  });

  it("validates variant has required string id", async () => {
    const invalid = { id: null, name: "test", isControl: false };
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(invalid));

    const result = await loadVariant();
    expect(result).toBeNull();
  });

  it("validates variant has required string name", async () => {
    const invalid = { id: "id", name: 123, isControl: false };
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(invalid));

    const result = await loadVariant();
    expect(result).toBeNull();
  });

  it("validates variant has required boolean isControl", async () => {
    const invalid = { id: "id", name: "name", isControl: "true" };
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(invalid));

    const result = await loadVariant();
    expect(result).toBeNull();
  });
});
