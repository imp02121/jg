/**
 * CrashDetector Stability Timer Tests
 *
 * Tests for onStabilityConfirmed callback behavior.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CrashDetector } from "./crash-detector";
import { createMockStorage } from "./crash-detector.test-utils";

describe("CrashDetector onStabilityConfirmed", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("fires after stabilityWindowMs following notifyAppReady", async () => {
    const onStabilityConfirmed = vi.fn();
    const storage = createMockStorage({
      metadata: { previousVersion: "1.0.0" },
    });

    const detector = new CrashDetector(storage, {
      onRollback: vi.fn().mockResolvedValue(undefined),
      onVerified: vi.fn().mockResolvedValue(undefined),
      onStabilityConfirmed,
      stabilityWindowMs: 100,
    });

    detector.startVerificationWindow();
    await detector.notifyAppReady();

    expect(onStabilityConfirmed).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);

    expect(onStabilityConfirmed).toHaveBeenCalledOnce();
  });

  it("does NOT fire if stop() called before timer expires", async () => {
    const onStabilityConfirmed = vi.fn();
    const storage = createMockStorage({
      metadata: { previousVersion: "1.0.0" },
    });

    const detector = new CrashDetector(storage, {
      onRollback: vi.fn().mockResolvedValue(undefined),
      onVerified: vi.fn().mockResolvedValue(undefined),
      onStabilityConfirmed,
      stabilityWindowMs: 100,
    });

    detector.startVerificationWindow();
    await detector.notifyAppReady();

    detector.stop();

    vi.advanceTimersByTime(200);

    expect(onStabilityConfirmed).not.toHaveBeenCalled();
  });

  it("uses DEFAULT_STABILITY_WINDOW_MS when not configured", async () => {
    const onStabilityConfirmed = vi.fn();
    const storage = createMockStorage({
      metadata: { previousVersion: "1.0.0" },
    });

    const detector = new CrashDetector(storage, {
      onRollback: vi.fn().mockResolvedValue(undefined),
      onVerified: vi.fn().mockResolvedValue(undefined),
      onStabilityConfirmed,
      // stabilityWindowMs not set -> defaults to 30_000
    });

    detector.startVerificationWindow();
    await detector.notifyAppReady();

    vi.advanceTimersByTime(29_999);
    expect(onStabilityConfirmed).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onStabilityConfirmed).toHaveBeenCalledOnce();
  });
});
