/**
 * CrashDetector Tests - Dual-Flag Verification and Stop
 *
 * Tests for dual-flag verification (appReady + healthPassed),
 * stop behavior, and timeout safety.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CrashDetector, type CrashDetectorConfig } from "./crash-detector";
import { createMockStorage } from "./crash-detector.test-utils";
import type { Storage } from "./storage";

describe("CrashDetector dual-flag verification", () => {
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

  it("triggers onVerified when BOTH appReady AND healthPassed are true", async () => {
    mockStorage = createMockStorage({ metadata: { previousVersion: "1.0.0" } });
    crashDetector = new CrashDetector(mockStorage, mockConfig);
    crashDetector.startVerificationWindow();
    await crashDetector.notifyAppReady();
    expect(mockConfig.onVerified).not.toHaveBeenCalled();
    await crashDetector.notifyHealthPassed();
    expect(mockConfig.onVerified).toHaveBeenCalledTimes(1);
    expect(mockStorage.clearCrashCount).toHaveBeenCalled();
    expect(mockStorage.resetVerificationState).toHaveBeenCalled();
  });

  it("triggers onVerified when healthPassed first, then appReady", async () => {
    mockStorage = createMockStorage({ metadata: { previousVersion: "1.0.0" } });
    crashDetector = new CrashDetector(mockStorage, mockConfig);
    crashDetector.startVerificationWindow();
    await crashDetector.notifyHealthPassed();
    expect(mockConfig.onVerified).not.toHaveBeenCalled();
    await crashDetector.notifyAppReady();
    expect(mockConfig.onVerified).toHaveBeenCalledTimes(1);
    expect(mockStorage.clearCrashCount).toHaveBeenCalled();
    expect(mockStorage.resetVerificationState).toHaveBeenCalled();
  });

  it("only calls onVerified once even with multiple calls", async () => {
    mockStorage = createMockStorage({ metadata: { previousVersion: "1.0.0" } });
    crashDetector = new CrashDetector(mockStorage, mockConfig);
    crashDetector.startVerificationWindow();
    await crashDetector.notifyAppReady();
    await crashDetector.notifyHealthPassed();
    await crashDetector.notifyAppReady();
    await crashDetector.notifyHealthPassed();
    expect(mockConfig.onVerified).toHaveBeenCalledTimes(1);
  });

  it("clears verification timer when both flags are set", async () => {
    mockStorage = createMockStorage({ metadata: { previousVersion: "1.0.0" } });
    crashDetector = new CrashDetector(mockStorage, mockConfig);
    crashDetector.startVerificationWindow();
    await crashDetector.notifyAppReady();
    await crashDetector.notifyHealthPassed();
    vi.advanceTimersByTime(2000);
    expect(mockConfig.onVerified).toHaveBeenCalledTimes(1);
  });
});

describe("CrashDetector stop", () => {
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

  it("clears verification timer", async () => {
    mockStorage = createMockStorage({ metadata: { previousVersion: "1.0.0" } });
    crashDetector = new CrashDetector(mockStorage, mockConfig);
    crashDetector.startVerificationWindow();
    crashDetector.stop();
    vi.advanceTimersByTime(2000);
    await vi.runAllTimersAsync();
    expect(mockConfig.onVerified).not.toHaveBeenCalled();
  });

  it("resets verification state so notifyAppReady does nothing", async () => {
    mockStorage = createMockStorage({ metadata: { previousVersion: "1.0.0" } });
    crashDetector = new CrashDetector(mockStorage, mockConfig);
    crashDetector.startVerificationWindow();
    crashDetector.stop();
    await crashDetector.notifyAppReady();
    expect(mockStorage.setAppReady).not.toHaveBeenCalled();
  });

  it("resets verification state so notifyHealthPassed does nothing", async () => {
    mockStorage = createMockStorage({ metadata: { previousVersion: "1.0.0" } });
    crashDetector = new CrashDetector(mockStorage, mockConfig);
    crashDetector.startVerificationWindow();
    crashDetector.stop();
    await crashDetector.notifyHealthPassed();
    expect(mockStorage.setHealthPassed).not.toHaveBeenCalled();
  });
});

describe("CrashDetector timeout safety", () => {
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

  it("timeout does NOT clear previousVersion - preserves rollback ability", async () => {
    mockStorage = createMockStorage({ metadata: { previousVersion: "1.0.0" } });
    crashDetector = new CrashDetector(mockStorage, mockConfig);
    crashDetector.startVerificationWindow();
    vi.advanceTimersByTime(2000);
    await vi.runAllTimersAsync();
    expect(mockStorage.clearPreviousVersion).not.toHaveBeenCalled();
    expect(mockConfig.onVerified).not.toHaveBeenCalled();
  });

  it("after timeout, can still verify with both flags", async () => {
    mockStorage = createMockStorage({ metadata: { previousVersion: "1.0.0" } });
    crashDetector = new CrashDetector(mockStorage, mockConfig);
    crashDetector.startVerificationWindow();
    vi.advanceTimersByTime(2000);
    await vi.runAllTimersAsync();
    await crashDetector.notifyAppReady();
    await crashDetector.notifyHealthPassed();
    expect(mockConfig.onVerified).not.toHaveBeenCalled();
  });
});
