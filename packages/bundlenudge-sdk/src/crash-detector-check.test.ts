/**
 * CrashDetector Tests - checkForCrash
 *
 * Tests for crash detection and rollback triggering.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CrashDetector,
  type CrashDetectorConfig,
  DEFAULT_CRASH_THRESHOLD,
  DEFAULT_CRASH_WINDOW_MS,
} from "./crash-detector";
import { createMockStorage } from "./crash-detector.test-utils";
import type { Storage } from "./storage";

describe("CrashDetector checkForCrash", () => {
  let mockStorage: Storage;
  let mockConfig: CrashDetectorConfig;
  let crashDetector: CrashDetector;

  beforeEach(() => {
    vi.useFakeTimers();
    mockConfig = {
      verificationWindowMs: 1000,
      onRollback: vi.fn().mockResolvedValue(undefined),
      onVerified: vi.fn().mockResolvedValue(undefined),
      onCrashReported: vi.fn(),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("returns false when no crash occurred", async () => {
    mockStorage = createMockStorage();
    crashDetector = new CrashDetector(mockStorage, mockConfig);
    const result = await crashDetector.checkForCrash();
    expect(result).toBe(false);
    expect(mockConfig.onRollback).not.toHaveBeenCalled();
  });

  it("returns false for incomplete pending update state", async () => {
    mockStorage = createMockStorage({
      metadata: {
        previousVersion: "1.0.0",
        pendingUpdateFlag: true,
        pendingVersion: null,
        lastCrashTime: Date.now() - 1000,
      },
    });
    crashDetector = new CrashDetector(mockStorage, mockConfig);
    const result = await crashDetector.checkForCrash();
    expect(result).toBe(false);
  });

  it("returns false without previous version", async () => {
    mockStorage = createMockStorage({
      metadata: { crashCount: 1, previousVersion: null, lastCrashTime: Date.now() - 1000 },
    });
    crashDetector = new CrashDetector(mockStorage, mockConfig);
    const result = await crashDetector.checkForCrash();
    expect(result).toBe(false);
    expect(mockConfig.onRollback).not.toHaveBeenCalled();
  });

  it("increments crash count within window but does not rollback until threshold", async () => {
    const now = Date.now();
    mockStorage = createMockStorage({
      metadata: {
        previousVersion: "1.0.0",
        currentVersion: "2.0.0",
        crashCount: 1,
        lastCrashTime: now - 1000,
      },
    });
    crashDetector = new CrashDetector(mockStorage, {
      ...mockConfig,
      crashThreshold: 3,
      crashWindowMs: 10000,
    });
    const result = await crashDetector.checkForCrash();
    expect(result).toBe(false);
    expect(mockStorage.recordCrash).toHaveBeenCalled();
    expect(mockConfig.onCrashReported).toHaveBeenCalledWith(2);
    expect(mockConfig.onRollback).not.toHaveBeenCalled();
  });

  it("triggers rollback when crash threshold is reached", async () => {
    const now = Date.now();
    mockStorage = createMockStorage({
      metadata: {
        previousVersion: "1.0.0",
        currentVersion: "2.0.0",
        crashCount: 2,
        lastCrashTime: now - 1000,
      },
    });
    mockStorage.recordCrash = vi.fn().mockResolvedValue(3);
    crashDetector = new CrashDetector(mockStorage, {
      ...mockConfig,
      crashThreshold: 3,
      crashWindowMs: 10000,
    });
    const result = await crashDetector.checkForCrash();
    expect(result).toBe(true);
    expect(mockStorage.recordCrash).toHaveBeenCalled();
    expect(mockConfig.onCrashReported).toHaveBeenCalledWith(3);
    expect(mockConfig.onRollback).toHaveBeenCalled();
  });

  it("resets crash count when crash is outside window", async () => {
    const now = Date.now();
    mockStorage = createMockStorage({
      metadata: {
        previousVersion: "1.0.0",
        currentVersion: "2.0.0",
        crashCount: 2,
        lastCrashTime: now - 20000,
      },
    });
    crashDetector = new CrashDetector(mockStorage, {
      ...mockConfig,
      crashThreshold: 3,
      crashWindowMs: 10000,
    });
    const result = await crashDetector.checkForCrash();
    expect(result).toBe(false);
    expect(mockStorage.clearCrashCount).toHaveBeenCalled();
    expect(mockStorage.recordCrash).not.toHaveBeenCalled();
    expect(mockConfig.onRollback).not.toHaveBeenCalled();
  });

  it("uses default threshold of 3 when not configured", async () => {
    const now = Date.now();
    mockStorage = createMockStorage({
      metadata: {
        previousVersion: "1.0.0",
        currentVersion: "2.0.0",
        crashCount: 1,
        lastCrashTime: now - 1000,
      },
    });
    crashDetector = new CrashDetector(mockStorage, mockConfig);
    const result = await crashDetector.checkForCrash();
    expect(result).toBe(false);
    expect(DEFAULT_CRASH_THRESHOLD).toBe(3);
  });

  it("uses default window of 10 seconds when not configured", async () => {
    const now = Date.now();
    mockStorage = createMockStorage({
      metadata: {
        previousVersion: "1.0.0",
        currentVersion: "2.0.0",
        crashCount: 2,
        lastCrashTime: now - 15000,
      },
    });
    crashDetector = new CrashDetector(mockStorage, mockConfig);
    const result = await crashDetector.checkForCrash();
    expect(result).toBe(false);
    expect(mockStorage.clearCrashCount).toHaveBeenCalled();
    expect(DEFAULT_CRASH_WINDOW_MS).toBe(10_000);
  });

  it("does nothing when no lastCrashTime is set", async () => {
    mockStorage = createMockStorage({
      metadata: {
        previousVersion: "1.0.0",
        currentVersion: "2.0.0",
        crashCount: 0,
        lastCrashTime: null,
      },
    });
    crashDetector = new CrashDetector(mockStorage, mockConfig);
    const result = await crashDetector.checkForCrash();
    expect(result).toBe(false);
    expect(mockStorage.recordCrash).not.toHaveBeenCalled();
    expect(mockStorage.clearCrashCount).not.toHaveBeenCalled();
  });
});
