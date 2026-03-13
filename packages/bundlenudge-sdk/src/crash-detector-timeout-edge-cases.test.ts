/**
 * CrashDetector Tests - Verification Timeout Edge Cases
 *
 * Tests for:
 * - 2C.1: Verification timeout expires during heavy load - verify proper handling
 * - 2C.3: Multiple verifications in quick succession - verify no state corruption
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CrashDetector, type CrashDetectorConfig } from "./crash-detector";
import { createMockStorage } from "./crash-detector.test-utils";
import type { Storage } from "./storage";

describe("2C.1: Verification timeout under heavy load", () => {
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

  it("preserves rollback ability when timeout expires without verification", async () => {
    mockStorage = createMockStorage({ metadata: { previousVersion: "1.0.0" } });
    crashDetector = new CrashDetector(mockStorage, mockConfig);

    crashDetector.startVerificationWindow();

    // Simulate heavy load - advance timer past the window
    vi.advanceTimersByTime(2000);
    await vi.runAllTimersAsync();

    // Verification should NOT have been called
    expect(mockConfig.onVerified).not.toHaveBeenCalled();
    // previousVersion should NOT be cleared - rollback is still possible
    expect(mockStorage.clearPreviousVersion).not.toHaveBeenCalled();
    // isVerifying should be false (timer expired)
    expect(crashDetector.isVerificationInProgress()).toBe(false);
  });

  it("timeout does not corrupt state when slow async operations pending", async () => {
    mockStorage = createMockStorage({ metadata: { previousVersion: "1.0.0" } });

    // Simulate slow storage operations
    const slowSetAppReady = vi.fn().mockImplementation(() => {
      return new Promise((resolve) => setTimeout(resolve, 500));
    });
    mockStorage.setAppReady = slowSetAppReady;

    crashDetector = new CrashDetector(mockStorage, mockConfig);
    crashDetector.startVerificationWindow();

    // Start notifyAppReady (will take 500ms)
    const readyPromise = crashDetector.notifyAppReady();

    // Advance timer to trigger timeout before setAppReady completes
    vi.advanceTimersByTime(800);

    // Let the slow operation complete
    vi.advanceTimersByTime(200);
    await readyPromise;

    // State should be consistent - no onVerified called since health not passed
    expect(mockConfig.onVerified).not.toHaveBeenCalled();
    // Storage was called even though timer expired during operation
    expect(slowSetAppReady).toHaveBeenCalled();
  });

  it("handles timeout with concurrent appReady and healthPassed calls", async () => {
    mockStorage = createMockStorage({ metadata: { previousVersion: "1.0.0" } });
    crashDetector = new CrashDetector(mockStorage, mockConfig);

    crashDetector.startVerificationWindow();

    // Start both operations near the timeout boundary
    vi.advanceTimersByTime(900);

    // Both flags at once - should trigger verification before timeout
    await crashDetector.notifyAppReady();
    await crashDetector.notifyHealthPassed();

    // Verification should complete successfully
    expect(mockConfig.onVerified).toHaveBeenCalledTimes(1);
    expect(mockStorage.clearCrashCount).toHaveBeenCalled();
    expect(mockStorage.resetVerificationState).toHaveBeenCalled();
  });

  it("timeout during verification does not call onVerified multiple times", async () => {
    mockStorage = createMockStorage({ metadata: { previousVersion: "1.0.0" } });
    crashDetector = new CrashDetector(mockStorage, mockConfig);

    crashDetector.startVerificationWindow();
    vi.advanceTimersByTime(500);

    // Complete verification
    await crashDetector.notifyAppReady();
    await crashDetector.notifyHealthPassed();

    expect(mockConfig.onVerified).toHaveBeenCalledTimes(1);

    // Advance past original timeout
    vi.advanceTimersByTime(1000);
    await vi.runAllTimersAsync();

    // Should still only be called once
    expect(mockConfig.onVerified).toHaveBeenCalledTimes(1);
  });

  it("maintains correct state after timeout with partial verification", async () => {
    mockStorage = createMockStorage({ metadata: { previousVersion: "1.0.0" } });
    crashDetector = new CrashDetector(mockStorage, mockConfig);

    crashDetector.startVerificationWindow();

    // Only call appReady, not healthPassed
    vi.advanceTimersByTime(500);
    await crashDetector.notifyAppReady();

    // Let timeout expire
    vi.advanceTimersByTime(1000);
    await vi.runAllTimersAsync();

    // Verification not complete
    expect(mockConfig.onVerified).not.toHaveBeenCalled();
    expect(crashDetector.isVerificationCompleted()).toBe(false);
    expect(crashDetector.isVerificationInProgress()).toBe(false);

    // Previous version preserved for rollback
    expect(mockStorage.clearPreviousVersion).not.toHaveBeenCalled();
  });

  it("uses clamped window for extreme timeout values", async () => {
    mockStorage = createMockStorage({ metadata: { previousVersion: "1.0.0" } });

    // Very long timeout - should be clamped to MAX_VERIFICATION_WINDOW_MS
    const longTimeoutConfig: CrashDetectorConfig = {
      verificationWindowMs: 600_000, // 10 minutes
      onRollback: vi.fn().mockResolvedValue(undefined),
      onVerified: vi.fn().mockResolvedValue(undefined),
    };
    crashDetector = new CrashDetector(mockStorage, longTimeoutConfig);
    crashDetector.startVerificationWindow();

    // Advance 5 minutes (max allowed)
    vi.advanceTimersByTime(300_000);
    await vi.runAllTimersAsync();

    // Should have timed out at 5 minutes
    expect(crashDetector.isVerificationInProgress()).toBe(false);
  });

  it("uses minimum window for very short timeout values", () => {
    mockStorage = createMockStorage({ metadata: { previousVersion: "1.0.0" } });

    // Very short timeout - should be clamped to MIN_VERIFICATION_WINDOW_MS
    const shortTimeoutConfig: CrashDetectorConfig = {
      verificationWindowMs: 100, // 100ms
      onRollback: vi.fn().mockResolvedValue(undefined),
      onVerified: vi.fn().mockResolvedValue(undefined),
    };
    crashDetector = new CrashDetector(mockStorage, shortTimeoutConfig);
    crashDetector.startVerificationWindow();

    // Advance just under 1 second (minimum)
    vi.advanceTimersByTime(900);
    expect(crashDetector.isVerificationInProgress()).toBe(true);

    // Advance past 1 second
    vi.advanceTimersByTime(200);
    expect(crashDetector.isVerificationInProgress()).toBe(false);
  });
});

describe("2C.3: Multiple verifications in quick succession", () => {
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

  it("rapid notifyAppReady calls do not corrupt state", async () => {
    mockStorage = createMockStorage({ metadata: { previousVersion: "1.0.0" } });
    crashDetector = new CrashDetector(mockStorage, mockConfig);

    crashDetector.startVerificationWindow();

    // Rapid fire notifyAppReady calls
    const promises = Array.from({ length: 10 }, () => crashDetector.notifyAppReady());
    await Promise.all(promises);

    // setAppReady should be called for each, but verification not complete
    expect(mockStorage.setAppReady).toHaveBeenCalledTimes(10);
    expect(mockConfig.onVerified).not.toHaveBeenCalled();

    // Complete verification
    await crashDetector.notifyHealthPassed();
    expect(mockConfig.onVerified).toHaveBeenCalledTimes(1);
  });

  it("rapid notifyHealthPassed calls do not corrupt state", async () => {
    mockStorage = createMockStorage({ metadata: { previousVersion: "1.0.0" } });
    crashDetector = new CrashDetector(mockStorage, mockConfig);

    crashDetector.startVerificationWindow();

    // Rapid fire notifyHealthPassed calls
    const promises = Array.from({ length: 10 }, () => crashDetector.notifyHealthPassed());
    await Promise.all(promises);

    // setHealthPassed should be called for each, but verification not complete
    expect(mockStorage.setHealthPassed).toHaveBeenCalledTimes(10);
    expect(mockConfig.onVerified).not.toHaveBeenCalled();

    // Complete verification
    await crashDetector.notifyAppReady();
    expect(mockConfig.onVerified).toHaveBeenCalledTimes(1);
  });

  it("interleaved appReady and healthPassed calls verify exactly once", async () => {
    mockStorage = createMockStorage({ metadata: { previousVersion: "1.0.0" } });
    crashDetector = new CrashDetector(mockStorage, mockConfig);

    crashDetector.startVerificationWindow();

    // Interleave calls rapidly
    const promises: Promise<void>[] = [];
    for (let i = 0; i < 5; i++) {
      promises.push(crashDetector.notifyAppReady());
      promises.push(crashDetector.notifyHealthPassed());
    }
    await Promise.all(promises);

    // Should verify exactly once
    expect(mockConfig.onVerified).toHaveBeenCalledTimes(1);
    expect(mockStorage.clearCrashCount).toHaveBeenCalledTimes(1);
    expect(mockStorage.resetVerificationState).toHaveBeenCalledTimes(1);
  });

  it("multiple startVerificationWindow calls do not start multiple timers", () => {
    mockStorage = createMockStorage({ metadata: { previousVersion: "1.0.0" } });
    crashDetector = new CrashDetector(mockStorage, mockConfig);

    // Start verification multiple times
    crashDetector.startVerificationWindow();
    crashDetector.startVerificationWindow();
    crashDetector.startVerificationWindow();

    // Only one verification should be in progress
    expect(crashDetector.isVerificationInProgress()).toBe(true);

    // Advance past timeout
    vi.advanceTimersByTime(2000);

    // Should only timeout once
    expect(crashDetector.isVerificationInProgress()).toBe(false);
  });

  it("reset followed by immediate start works correctly", async () => {
    mockStorage = createMockStorage({ metadata: { previousVersion: "1.0.0" } });
    crashDetector = new CrashDetector(mockStorage, mockConfig);

    // Start, then reset immediately
    crashDetector.startVerificationWindow();
    crashDetector.reset();
    crashDetector.startVerificationWindow();

    expect(crashDetector.isVerificationInProgress()).toBe(true);
    expect(crashDetector.isVerificationCompleted()).toBe(false);

    // Complete verification
    await crashDetector.notifyAppReady();
    await crashDetector.notifyHealthPassed();

    expect(mockConfig.onVerified).toHaveBeenCalledTimes(1);
  });

  it("stop followed by immediate start works correctly", async () => {
    mockStorage = createMockStorage({ metadata: { previousVersion: "1.0.0" } });
    crashDetector = new CrashDetector(mockStorage, mockConfig);

    // Start, then stop immediately
    crashDetector.startVerificationWindow();
    crashDetector.stop();
    crashDetector.startVerificationWindow();

    expect(crashDetector.isVerificationInProgress()).toBe(true);

    // Complete verification
    await crashDetector.notifyAppReady();
    await crashDetector.notifyHealthPassed();

    expect(mockConfig.onVerified).toHaveBeenCalledTimes(1);
  });

  it("rapid complete verification cycles work correctly", async () => {
    mockStorage = createMockStorage({ metadata: { previousVersion: "1.0.0" } });
    crashDetector = new CrashDetector(mockStorage, mockConfig);

    // Complete 3 verification cycles rapidly
    for (let i = 0; i < 3; i++) {
      crashDetector.reset();
      crashDetector.startVerificationWindow();
      await crashDetector.notifyAppReady();
      await crashDetector.notifyHealthPassed();
    }

    // Each cycle should call onVerified
    expect(mockConfig.onVerified).toHaveBeenCalledTimes(3);
  });

  it("concurrent verification completion does not double-clear state", async () => {
    mockStorage = createMockStorage({ metadata: { previousVersion: "1.0.0" } });
    crashDetector = new CrashDetector(mockStorage, mockConfig);

    crashDetector.startVerificationWindow();

    // Call appReady, then both appReady and healthPassed concurrently
    await crashDetector.notifyAppReady();
    await Promise.all([crashDetector.notifyAppReady(), crashDetector.notifyHealthPassed()]);

    // Should only verify once, only clear state once
    expect(mockConfig.onVerified).toHaveBeenCalledTimes(1);
    expect(mockStorage.clearCrashCount).toHaveBeenCalledTimes(1);
    expect(mockStorage.resetVerificationState).toHaveBeenCalledTimes(1);
  });

  it("state stays consistent with many operations", async () => {
    mockStorage = createMockStorage({ metadata: { previousVersion: "1.0.0" } });
    crashDetector = new CrashDetector(mockStorage, mockConfig);

    // Simulate chaotic usage pattern
    crashDetector.startVerificationWindow();
    vi.advanceTimersByTime(100);

    await crashDetector.notifyAppReady();
    vi.advanceTimersByTime(50);

    crashDetector.startVerificationWindow(); // Should be ignored
    vi.advanceTimersByTime(50);

    await crashDetector.notifyHealthPassed();

    // Should verify exactly once despite chaos
    expect(mockConfig.onVerified).toHaveBeenCalledTimes(1);
    expect(crashDetector.isVerificationCompleted()).toBe(true);
    expect(crashDetector.isVerificationInProgress()).toBe(false);
  });
});

describe("Verification state consistency under load", () => {
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

  it("calls after verification complete are no-ops", async () => {
    mockStorage = createMockStorage({ metadata: { previousVersion: "1.0.0" } });
    crashDetector = new CrashDetector(mockStorage, mockConfig);

    crashDetector.startVerificationWindow();
    await crashDetector.notifyAppReady();
    await crashDetector.notifyHealthPassed();

    // Clear call counts
    vi.clearAllMocks();

    // These should be no-ops after verification complete
    await crashDetector.notifyAppReady();
    await crashDetector.notifyHealthPassed();

    expect(mockStorage.setAppReady).not.toHaveBeenCalled();
    expect(mockStorage.setHealthPassed).not.toHaveBeenCalled();
    expect(mockConfig.onVerified).not.toHaveBeenCalled();
  });

  it("isVerificationInProgress returns false after completion", async () => {
    mockStorage = createMockStorage({ metadata: { previousVersion: "1.0.0" } });
    crashDetector = new CrashDetector(mockStorage, mockConfig);

    expect(crashDetector.isVerificationInProgress()).toBe(false);

    crashDetector.startVerificationWindow();
    expect(crashDetector.isVerificationInProgress()).toBe(true);

    await crashDetector.notifyAppReady();
    expect(crashDetector.isVerificationInProgress()).toBe(true);

    await crashDetector.notifyHealthPassed();
    expect(crashDetector.isVerificationInProgress()).toBe(false);
  });

  it("isVerificationCompleted reflects actual state", async () => {
    mockStorage = createMockStorage({ metadata: { previousVersion: "1.0.0" } });
    crashDetector = new CrashDetector(mockStorage, mockConfig);

    expect(crashDetector.isVerificationCompleted()).toBe(false);

    crashDetector.startVerificationWindow();
    expect(crashDetector.isVerificationCompleted()).toBe(false);

    await crashDetector.notifyAppReady();
    expect(crashDetector.isVerificationCompleted()).toBe(false);

    await crashDetector.notifyHealthPassed();
    expect(crashDetector.isVerificationCompleted()).toBe(true);
  });
});
