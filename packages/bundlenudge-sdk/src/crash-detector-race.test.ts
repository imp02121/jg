/**
 * CrashDetector Verification Race Condition Tests (Fix #67)
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { CrashDetector } from "./crash-detector";
import type { Storage } from "./storage";

describe("CrashDetector verification race condition", () => {
  let mockStorage: Storage;
  let onVerified: () => Promise<void>;
  let detector: CrashDetector;

  beforeEach(() => {
    vi.useFakeTimers();

    const verificationState = { appReady: false, healthPassed: false };

    mockStorage = {
      getMetadata: vi.fn().mockReturnValue({ previousVersion: "1.0.0" }),
      getVerificationState: vi.fn().mockImplementation(() => ({
        ...verificationState,
      })),
      setAppReady: vi.fn().mockImplementation(async () => {
        verificationState.appReady = true;
      }),
      setHealthPassed: vi.fn().mockImplementation(async () => {
        verificationState.healthPassed = true;
      }),
      clearCrashCount: vi.fn<[], Promise<void>>().mockResolvedValue(undefined),
      resetVerificationState: vi.fn<[], Promise<void>>().mockResolvedValue(undefined),
    } as unknown as Storage;

    onVerified = vi.fn().mockResolvedValue(undefined) as unknown as () => Promise<void>;

    detector = new CrashDetector(mockStorage, {
      onRollback: vi.fn().mockResolvedValue(undefined) as unknown as () => Promise<void>,
      onVerified,
    });
  });

  it("calls onVerified exactly once even with rapid concurrent calls", async () => {
    detector.startVerificationWindow();

    // Fire both notifications concurrently
    await Promise.all([detector.notifyAppReady(), detector.notifyHealthPassed()]);

    // Only one should trigger the verified callback
    expect(vi.mocked(onVerified)).toHaveBeenCalledTimes(1);
    expect(mockStorage.clearCrashCount).toHaveBeenCalledTimes(1);
  });

  it("does not call onVerified again after verification completes", async () => {
    detector.startVerificationWindow();

    await detector.notifyAppReady();
    await detector.notifyHealthPassed();

    expect(vi.mocked(onVerified)).toHaveBeenCalledTimes(1);

    // Calling again should be a no-op
    await detector.notifyAppReady();
    await detector.notifyHealthPassed();

    expect(vi.mocked(onVerified)).toHaveBeenCalledTimes(1);
  });

  it("completes normally when called sequentially", async () => {
    detector.startVerificationWindow();

    await detector.notifyAppReady();
    expect(vi.mocked(onVerified)).not.toHaveBeenCalled();

    await detector.notifyHealthPassed();
    expect(vi.mocked(onVerified)).toHaveBeenCalledTimes(1);
  });

  it("reset allows re-verification", async () => {
    detector.startVerificationWindow();
    await detector.notifyAppReady();
    await detector.notifyHealthPassed();
    expect(vi.mocked(onVerified)).toHaveBeenCalledTimes(1);

    // Reset allows starting over
    detector.reset();
    expect(detector.isVerificationCompleted()).toBe(false);
  });
});
