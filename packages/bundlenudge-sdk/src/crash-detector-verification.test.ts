/**
 * CrashDetector Tests - Verification Window
 *
 * Tests for startVerificationWindow, notifyAppReady, and notifyHealthPassed.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CrashDetector,
  type CrashDetectorConfig,
  DEFAULT_VERIFICATION_WINDOW_MS,
} from "./crash-detector";
import { createMockStorage } from "./crash-detector.test-utils";
import type { Storage } from "./storage";

describe("CrashDetector startVerificationWindow", () => {
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

  it("does nothing without previous version", () => {
    mockStorage = createMockStorage({ metadata: { previousVersion: null } });
    crashDetector = new CrashDetector(mockStorage, mockConfig);
    crashDetector.startVerificationWindow();
    vi.advanceTimersByTime(2000);
    expect(mockConfig.onVerified).not.toHaveBeenCalled();
  });

  it("timeout does NOT call onVerified or clear previousVersion", async () => {
    mockStorage = createMockStorage({ metadata: { previousVersion: "1.0.0" } });
    crashDetector = new CrashDetector(mockStorage, mockConfig);
    crashDetector.startVerificationWindow();
    vi.advanceTimersByTime(500);
    expect(mockConfig.onVerified).not.toHaveBeenCalled();
    vi.advanceTimersByTime(600);
    await vi.runAllTimersAsync();
    expect(mockStorage.clearPreviousVersion).not.toHaveBeenCalled();
    expect(mockConfig.onVerified).not.toHaveBeenCalled();
  });

  it("uses default 60 second window when not configured", async () => {
    mockStorage = createMockStorage({ metadata: { previousVersion: "1.0.0" } });
    const configWithoutWindow = {
      onRollback: vi.fn().mockResolvedValue(undefined),
      onVerified: vi.fn().mockResolvedValue(undefined),
    };
    crashDetector = new CrashDetector(mockStorage, configWithoutWindow);
    crashDetector.startVerificationWindow();
    vi.advanceTimersByTime(59000);
    expect(configWithoutWindow.onVerified).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2000);
    await vi.runAllTimersAsync();
    expect(configWithoutWindow.onVerified).not.toHaveBeenCalled();
    expect(DEFAULT_VERIFICATION_WINDOW_MS).toBe(60_000);
  });

  it("does not start multiple verification windows", () => {
    mockStorage = createMockStorage({ metadata: { previousVersion: "1.0.0" } });
    crashDetector = new CrashDetector(mockStorage, mockConfig);
    crashDetector.startVerificationWindow();
    crashDetector.startVerificationWindow();
    vi.advanceTimersByTime(1500);
    expect(mockConfig.onVerified).not.toHaveBeenCalled();
  });
});

describe("CrashDetector notifyAppReady", () => {
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

  it("does nothing if not verifying", async () => {
    mockStorage = createMockStorage();
    crashDetector = new CrashDetector(mockStorage, mockConfig);
    await crashDetector.notifyAppReady();
    expect(mockStorage.setAppReady).not.toHaveBeenCalled();
    expect(mockConfig.onVerified).not.toHaveBeenCalled();
  });

  it("appReady alone does NOT trigger onVerified", async () => {
    mockStorage = createMockStorage({ metadata: { previousVersion: "1.0.0" } });
    crashDetector = new CrashDetector(mockStorage, mockConfig);
    crashDetector.startVerificationWindow();
    await crashDetector.notifyAppReady();
    expect(mockStorage.setAppReady).toHaveBeenCalled();
    expect(mockStorage.clearCrashCount).not.toHaveBeenCalled();
    expect(mockConfig.onVerified).not.toHaveBeenCalled();
  });

  it("cancels timeout but does not trigger verification with appReady only", async () => {
    mockStorage = createMockStorage({ metadata: { previousVersion: "1.0.0" } });
    crashDetector = new CrashDetector(mockStorage, mockConfig);
    crashDetector.startVerificationWindow();
    vi.advanceTimersByTime(500);
    await crashDetector.notifyAppReady();
    vi.advanceTimersByTime(1000);
    expect(mockConfig.onVerified).not.toHaveBeenCalled();
  });
});

describe("CrashDetector notifyHealthPassed", () => {
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

  it("does nothing if not verifying", async () => {
    mockStorage = createMockStorage();
    crashDetector = new CrashDetector(mockStorage, mockConfig);
    await crashDetector.notifyHealthPassed();
    expect(mockStorage.setHealthPassed).not.toHaveBeenCalled();
    expect(mockConfig.onVerified).not.toHaveBeenCalled();
  });

  it("healthPassed alone does NOT trigger onVerified", async () => {
    mockStorage = createMockStorage({ metadata: { previousVersion: "1.0.0" } });
    crashDetector = new CrashDetector(mockStorage, mockConfig);
    crashDetector.startVerificationWindow();
    await crashDetector.notifyHealthPassed();
    expect(mockStorage.setHealthPassed).toHaveBeenCalled();
    expect(mockStorage.clearCrashCount).not.toHaveBeenCalled();
    expect(mockConfig.onVerified).not.toHaveBeenCalled();
  });
});
