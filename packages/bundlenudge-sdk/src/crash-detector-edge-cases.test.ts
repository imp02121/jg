/**
 * CrashDetector Edge Case Tests
 *
 * Tests for edge cases in crash detection and automatic rollback:
 * - 2A.1: Crash on first launch after update - verify automatic rollback
 * - 2A.3: Crash exactly at threshold boundary - verify correct detection
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CrashDetector, type CrashDetectorConfig, DEFAULT_CRASH_THRESHOLD } from "./crash-detector";
import { createMockStorage } from "./crash-detector.test-utils";

describe("CrashDetector Edge Cases", () => {
  let mockConfig: CrashDetectorConfig;
  let onRollbackMock: ReturnType<typeof vi.fn>;
  let onVerifiedMock: ReturnType<typeof vi.fn>;
  let onCrashReportedMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    onRollbackMock = vi.fn().mockResolvedValue(undefined);
    onVerifiedMock = vi.fn().mockResolvedValue(undefined);
    onCrashReportedMock = vi.fn();

    mockConfig = {
      verificationWindowMs: 1000,
      onRollback: onRollbackMock as unknown as () => Promise<void>,
      onVerified: onVerifiedMock as unknown as () => Promise<void>,
      onCrashReported: onCrashReportedMock as unknown as (crashCount: number) => void,
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("2A.1: Crash on first launch after update", () => {
    it("triggers rollback immediately when crash threshold is 1", async () => {
      const now = Date.now();
      const mockStorage = createMockStorage({
        metadata: {
          previousVersion: "1.0.0",
          currentVersion: "2.0.0",
          crashCount: 0,
          lastCrashTime: now - 500, // Just crashed 500ms ago
        },
      });
      // First crash should trigger rollback with threshold of 1
      mockStorage.recordCrash = vi.fn().mockResolvedValue(1);

      const crashDetector = new CrashDetector(mockStorage, {
        ...mockConfig,
        crashThreshold: 1,
        crashWindowMs: 5000,
      });

      const result = await crashDetector.checkForCrash();

      expect(result).toBe(true);
      expect(mockStorage.recordCrash).toHaveBeenCalled();
      expect(onCrashReportedMock).toHaveBeenCalledWith(1);
      expect(onRollbackMock).toHaveBeenCalled();
    });

    it("triggers rollback on first crash after fresh OTA update", async () => {
      const now = Date.now();
      // Simulate a fresh update that just crashed
      const mockStorage = createMockStorage({
        metadata: {
          previousVersion: "1.0.0",
          currentVersion: "2.0.0",
          crashCount: 0,
          lastCrashTime: now - 100, // Very recent crash
          pendingVersion: null,
          pendingUpdateFlag: false,
        },
      });
      mockStorage.recordCrash = vi.fn().mockResolvedValue(1);

      const crashDetector = new CrashDetector(mockStorage, {
        ...mockConfig,
        crashThreshold: 1,
        crashWindowMs: 10000,
      });

      const result = await crashDetector.checkForCrash();

      expect(result).toBe(true);
      expect(onRollbackMock).toHaveBeenCalledTimes(1);
    });

    it("does not rollback if crash happened before update applied", async () => {
      const now = Date.now();
      // Crash happened but previousVersion doesn't exist (on embedded bundle)
      const mockStorage = createMockStorage({
        metadata: {
          previousVersion: null, // No previous version to rollback to
          currentVersion: null, // On embedded bundle
          crashCount: 2,
          lastCrashTime: now - 500,
        },
      });

      const crashDetector = new CrashDetector(mockStorage, {
        ...mockConfig,
        crashThreshold: 3,
      });

      const result = await crashDetector.checkForCrash();

      expect(result).toBe(false);
      expect(onRollbackMock).not.toHaveBeenCalled();
    });

    it("respects update state during crash detection", async () => {
      const now = Date.now();
      // Pending update flag is set but no pending version - incomplete state
      const mockStorage = createMockStorage({
        metadata: {
          previousVersion: "1.0.0",
          currentVersion: "2.0.0",
          crashCount: 2,
          lastCrashTime: now - 500,
          pendingUpdateFlag: true,
          pendingVersion: null, // Incomplete state
        },
      });

      const crashDetector = new CrashDetector(mockStorage, mockConfig);
      const result = await crashDetector.checkForCrash();

      expect(result).toBe(false);
      expect(mockStorage.recordCrash).not.toHaveBeenCalled();
    });
  });

  describe("2A.3: Crash exactly at threshold boundary", () => {
    it("does not rollback when crash count is one below threshold", async () => {
      const now = Date.now();
      const threshold = DEFAULT_CRASH_THRESHOLD; // 3
      const mockStorage = createMockStorage({
        metadata: {
          previousVersion: "1.0.0",
          currentVersion: "2.0.0",
          crashCount: threshold - 2, // 1 crash recorded
          lastCrashTime: now - 500,
        },
      });
      // Will increment to threshold - 1 (2)
      mockStorage.recordCrash = vi.fn().mockResolvedValue(threshold - 1);

      const crashDetector = new CrashDetector(mockStorage, {
        ...mockConfig,
        crashThreshold: threshold,
        crashWindowMs: 10000,
      });

      const result = await crashDetector.checkForCrash();

      expect(result).toBe(false);
      expect(mockStorage.recordCrash).toHaveBeenCalled();
      expect(onCrashReportedMock).toHaveBeenCalledWith(threshold - 1);
      expect(onRollbackMock).not.toHaveBeenCalled();
    });

    it("triggers rollback exactly at threshold", async () => {
      const now = Date.now();
      const threshold = DEFAULT_CRASH_THRESHOLD; // 3
      const mockStorage = createMockStorage({
        metadata: {
          previousVersion: "1.0.0",
          currentVersion: "2.0.0",
          crashCount: threshold - 1, // 2 crashes recorded
          lastCrashTime: now - 500,
        },
      });
      // This crash will hit exactly the threshold (3)
      mockStorage.recordCrash = vi.fn().mockResolvedValue(threshold);

      const crashDetector = new CrashDetector(mockStorage, {
        ...mockConfig,
        crashThreshold: threshold,
        crashWindowMs: 10000,
      });

      const result = await crashDetector.checkForCrash();

      expect(result).toBe(true);
      expect(mockStorage.recordCrash).toHaveBeenCalled();
      expect(onCrashReportedMock).toHaveBeenCalledWith(threshold);
      expect(onRollbackMock).toHaveBeenCalledTimes(1);
    });

    it("triggers rollback when crash count exceeds threshold", async () => {
      const now = Date.now();
      const threshold = DEFAULT_CRASH_THRESHOLD; // 3
      const mockStorage = createMockStorage({
        metadata: {
          previousVersion: "1.0.0",
          currentVersion: "2.0.0",
          crashCount: threshold, // Already at threshold
          lastCrashTime: now - 500,
        },
      });
      // One more crash - exceeds threshold (4)
      mockStorage.recordCrash = vi.fn().mockResolvedValue(threshold + 1);

      const crashDetector = new CrashDetector(mockStorage, {
        ...mockConfig,
        crashThreshold: threshold,
        crashWindowMs: 10000,
      });

      const result = await crashDetector.checkForCrash();

      expect(result).toBe(true);
      expect(onRollbackMock).toHaveBeenCalledTimes(1);
    });

    it("handles threshold of 1 correctly", async () => {
      const now = Date.now();
      const mockStorage = createMockStorage({
        metadata: {
          previousVersion: "1.0.0",
          currentVersion: "2.0.0",
          crashCount: 0,
          lastCrashTime: now - 500,
        },
      });
      mockStorage.recordCrash = vi.fn().mockResolvedValue(1);

      const crashDetector = new CrashDetector(mockStorage, {
        ...mockConfig,
        crashThreshold: 1, // Rollback on first crash
        crashWindowMs: 10000,
      });

      const result = await crashDetector.checkForCrash();

      expect(result).toBe(true);
      expect(onRollbackMock).toHaveBeenCalled();
    });

    it("handles high threshold correctly", async () => {
      const now = Date.now();
      const highThreshold = 10;
      const mockStorage = createMockStorage({
        metadata: {
          previousVersion: "1.0.0",
          currentVersion: "2.0.0",
          crashCount: highThreshold - 1, // 9 crashes
          lastCrashTime: now - 500,
        },
      });
      mockStorage.recordCrash = vi.fn().mockResolvedValue(highThreshold);

      const crashDetector = new CrashDetector(mockStorage, {
        ...mockConfig,
        crashThreshold: highThreshold,
        crashWindowMs: 10000,
      });

      const result = await crashDetector.checkForCrash();

      expect(result).toBe(true);
      expect(onCrashReportedMock).toHaveBeenCalledWith(highThreshold);
      expect(onRollbackMock).toHaveBeenCalled();
    });
  });

  describe("Crash window boundary conditions", () => {
    it("resets crash count when exactly at window boundary", async () => {
      const now = Date.now();
      const windowMs = 10000;
      const mockStorage = createMockStorage({
        metadata: {
          previousVersion: "1.0.0",
          currentVersion: "2.0.0",
          crashCount: 2,
          // Crash time is exactly at the boundary (windowMs ago)
          lastCrashTime: now - windowMs,
        },
      });

      const crashDetector = new CrashDetector(mockStorage, {
        ...mockConfig,
        crashThreshold: 3,
        crashWindowMs: windowMs,
      });

      const result = await crashDetector.checkForCrash();

      expect(result).toBe(false);
      // Exactly at boundary should be outside window (>= not >)
      expect(mockStorage.clearCrashCount).toHaveBeenCalled();
      expect(mockStorage.recordCrash).not.toHaveBeenCalled();
    });

    it("counts crash when just inside window boundary", async () => {
      const now = Date.now();
      const windowMs = 10000;
      const mockStorage = createMockStorage({
        metadata: {
          previousVersion: "1.0.0",
          currentVersion: "2.0.0",
          crashCount: 1,
          // Crash time is 1ms inside the window
          lastCrashTime: now - windowMs + 1,
        },
      });
      mockStorage.recordCrash = vi.fn().mockResolvedValue(2);

      const crashDetector = new CrashDetector(mockStorage, {
        ...mockConfig,
        crashThreshold: 3,
        crashWindowMs: windowMs,
      });

      const result = await crashDetector.checkForCrash();

      expect(result).toBe(false);
      expect(mockStorage.recordCrash).toHaveBeenCalled();
      expect(mockStorage.clearCrashCount).not.toHaveBeenCalled();
    });

    it("resets crash count when 1ms outside window boundary", async () => {
      const now = Date.now();
      const windowMs = 10000;
      const mockStorage = createMockStorage({
        metadata: {
          previousVersion: "1.0.0",
          currentVersion: "2.0.0",
          crashCount: 2,
          // Crash time is 1ms outside the window
          lastCrashTime: now - windowMs - 1,
        },
      });

      const crashDetector = new CrashDetector(mockStorage, {
        ...mockConfig,
        crashThreshold: 3,
        crashWindowMs: windowMs,
      });

      const result = await crashDetector.checkForCrash();

      expect(result).toBe(false);
      expect(mockStorage.clearCrashCount).toHaveBeenCalled();
      expect(mockStorage.recordCrash).not.toHaveBeenCalled();
    });
  });

  describe("Rapid successive crashes", () => {
    it("handles rapid successive crashes within threshold", async () => {
      const now = Date.now();
      // Simulate multiple rapid crashes
      let crashCount = 0;
      const mockStorage = createMockStorage({
        metadata: {
          previousVersion: "1.0.0",
          currentVersion: "2.0.0",
          crashCount: 0,
          lastCrashTime: now - 100,
        },
      });
      mockStorage.recordCrash = vi.fn().mockImplementation(() => {
        crashCount++;
        return Promise.resolve(crashCount);
      });

      const crashDetector = new CrashDetector(mockStorage, {
        ...mockConfig,
        crashThreshold: 3,
        crashWindowMs: 5000,
      });

      // First crash
      let result = await crashDetector.checkForCrash();
      expect(result).toBe(false);
      expect(crashCount).toBe(1);

      // Simulate second crash (metadata now reflects updated count)
      mockStorage.getMetadata = vi.fn().mockReturnValue({
        deviceId: "test-device",
        accessToken: null,
        currentVersion: "2.0.0",
        currentVersionHash: null,
        previousVersion: "1.0.0",
        pendingVersion: null,
        pendingUpdateFlag: false,
        lastCheckTime: null,
        crashCount: 1,
        lastCrashTime: now - 50,
        verificationState: null,
        appVersionInfo: null,
        bundleHashes: {},
      });

      result = await crashDetector.checkForCrash();
      expect(result).toBe(false);
      expect(crashCount).toBe(2);

      // Third crash should trigger rollback
      mockStorage.getMetadata = vi.fn().mockReturnValue({
        deviceId: "test-device",
        accessToken: null,
        currentVersion: "2.0.0",
        currentVersionHash: null,
        previousVersion: "1.0.0",
        pendingVersion: null,
        pendingUpdateFlag: false,
        lastCheckTime: null,
        crashCount: 2,
        lastCrashTime: now - 25,
        verificationState: null,
        appVersionInfo: null,
        bundleHashes: {},
      });

      result = await crashDetector.checkForCrash();
      expect(result).toBe(true);
      expect(crashCount).toBe(3);
      expect(onRollbackMock).toHaveBeenCalledTimes(1);
    });
  });
});
