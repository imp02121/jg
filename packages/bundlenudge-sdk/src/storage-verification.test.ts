/**
 * Storage Verification State Tests
 *
 * Tests for verification state operations.
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

describe("Storage - Verification State", () => {
  let storage: Storage;

  beforeEach(() => {
    vi.clearAllMocks();
    storage = new Storage();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("verification state", () => {
    beforeEach(async () => {
      vi.mocked(AsyncStorage.getItem).mockResolvedValue(null);
      vi.mocked(AsyncStorage.setItem).mockResolvedValue();
      await storage.initialize();
    });

    it("returns null for initial verification state", () => {
      expect(storage.getVerificationState()).toBeNull();
    });

    it("setAppReady sets appReady flag correctly", async () => {
      await storage.setAppReady();

      const state = storage.getVerificationState();
      expect(state).not.toBeNull();
      expect(state?.appReady).toBe(true);
      expect(state?.healthPassed).toBe(false);
      expect(state?.verifiedAt).toBeNull();
    });

    it("setHealthPassed sets healthPassed flag correctly", async () => {
      await storage.setHealthPassed();

      const state = storage.getVerificationState();
      expect(state).not.toBeNull();
      expect(state?.appReady).toBe(false);
      expect(state?.healthPassed).toBe(true);
      expect(state?.verifiedAt).toBeNull();
    });

    it("isFullyVerified returns false when only appReady is true", async () => {
      await storage.setAppReady();

      expect(storage.isFullyVerified()).toBe(false);
    });

    it("isFullyVerified returns false when only healthPassed is true", async () => {
      await storage.setHealthPassed();

      expect(storage.isFullyVerified()).toBe(false);
    });

    it("isFullyVerified returns true when both flags are true", async () => {
      await storage.setAppReady();
      await storage.setHealthPassed();

      expect(storage.isFullyVerified()).toBe(true);
    });

    it("sets verifiedAt timestamp when both flags become true (appReady first)", async () => {
      const beforeTime = Date.now();
      await storage.setAppReady();

      // verifiedAt should not be set yet
      expect(storage.getVerificationState()?.verifiedAt).toBeNull();

      await storage.setHealthPassed();
      const afterTime = Date.now();

      const state = storage.getVerificationState();
      expect(state?.verifiedAt).not.toBeNull();
      expect(state?.verifiedAt).toBeGreaterThanOrEqual(beforeTime);
      expect(state?.verifiedAt).toBeLessThanOrEqual(afterTime);
    });

    it("sets verifiedAt timestamp when both flags become true (healthPassed first)", async () => {
      const beforeTime = Date.now();
      await storage.setHealthPassed();

      // verifiedAt should not be set yet
      expect(storage.getVerificationState()?.verifiedAt).toBeNull();

      await storage.setAppReady();
      const afterTime = Date.now();

      const state = storage.getVerificationState();
      expect(state?.verifiedAt).not.toBeNull();
      expect(state?.verifiedAt).toBeGreaterThanOrEqual(beforeTime);
      expect(state?.verifiedAt).toBeLessThanOrEqual(afterTime);
    });

    it("resetVerificationState clears state to null", async () => {
      await storage.setAppReady();
      await storage.setHealthPassed();

      expect(storage.isFullyVerified()).toBe(true);

      await storage.resetVerificationState();

      expect(storage.getVerificationState()).toBeNull();
      expect(storage.isFullyVerified()).toBe(false);
    });

    it("setVerificationState sets state directly", async () => {
      const timestamp = Date.now();
      await storage.setVerificationState({
        appReady: true,
        healthPassed: true,
        verifiedAt: timestamp,
      });

      const state = storage.getVerificationState();
      expect(state?.appReady).toBe(true);
      expect(state?.healthPassed).toBe(true);
      expect(state?.verifiedAt).toBe(timestamp);
    });

    it("isFullyVerified returns false when state is null", () => {
      expect(storage.isFullyVerified()).toBe(false);
    });

    it("loads existing verification state from storage", async () => {
      // Reset and reinitialize with existing verification state
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
        verificationState: {
          appReady: true,
          healthPassed: true,
          verifiedAt: 1700000000000,
        },
        appVersionInfo: null,
      };
      vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(existingMetadata));

      await storage.initialize();

      const state = storage.getVerificationState();
      expect(state?.appReady).toBe(true);
      expect(state?.healthPassed).toBe(true);
      expect(state?.verifiedAt).toBe(1700000000000);
      expect(storage.isFullyVerified()).toBe(true);
    });
  });
});
