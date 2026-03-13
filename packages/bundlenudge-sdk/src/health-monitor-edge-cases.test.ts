/**
 * HealthMonitor Tests - Edge Cases
 *
 * Tests for edge cases in HealthMonitor.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CrashDetector } from "./crash-detector";
import { HealthMonitor, type HealthMonitorConfig } from "./health-monitor";

function createMockCrashDetector(): CrashDetector {
  return {
    notifyHealthPassed: vi.fn().mockResolvedValue(undefined),
    notifyAppReady: vi.fn().mockResolvedValue(undefined),
    checkForCrash: vi.fn().mockResolvedValue(false),
    startVerificationWindow: vi.fn(),
    stop: vi.fn(),
  } as unknown as CrashDetector;
}

function createConfig(overrides: Partial<HealthMonitorConfig> = {}): HealthMonitorConfig {
  return {
    events: [],
    endpoints: [],
    crashDetector: createMockCrashDetector(),
    ...overrides,
  };
}

describe("HealthMonitor - edge cases", () => {
  let mockCrashDetector: CrashDetector;

  beforeEach(() => {
    mockCrashDetector = createMockCrashDetector();
    vi.clearAllMocks();
  });

  it("ignores unknown events", () => {
    const config = createConfig({
      events: [{ name: "app_loaded", required: true }],
      crashDetector: mockCrashDetector,
    });
    const monitor = new HealthMonitor(config);

    monitor.reportEvent("unknown_event");

    expect(monitor.isFullyVerified()).toBe(false);
    expect(monitor.getMissingEvents()).toEqual(["app_loaded"]);
  });

  it("ignores unknown endpoints", () => {
    const config = createConfig({
      endpoints: [
        {
          method: "GET",
          url: "/api/health",
          expectedStatus: [200],
          required: true,
        },
      ],
      crashDetector: mockCrashDetector,
    });
    const monitor = new HealthMonitor(config);

    monitor.reportEndpoint("POST", "/api/unknown", 200);

    expect(monitor.isFullyVerified()).toBe(false);
  });

  it("duplicate event reports are idempotent", () => {
    const onAllPassed = vi.fn();
    const config = createConfig({
      events: [{ name: "app_loaded", required: true }],
      crashDetector: mockCrashDetector,
      onAllPassed,
    });
    const monitor = new HealthMonitor(config);

    monitor.reportEvent("app_loaded");
    monitor.reportEvent("app_loaded");
    monitor.reportEvent("app_loaded");

    expect(onAllPassed).toHaveBeenCalledTimes(1);
    expect(mockCrashDetector.notifyHealthPassed).toHaveBeenCalledTimes(1);
  });

  it("empty config passes immediately with no events/endpoints", () => {
    const config = createConfig({
      events: [],
      endpoints: [],
      crashDetector: mockCrashDetector,
    });
    const monitor = new HealthMonitor(config);

    // Should already be "verified" since no required items
    expect(monitor.getMissingEvents()).toEqual([]);
    expect(monitor.getMissingEndpoints()).toEqual([]);
  });

  it("reports after completion are ignored", () => {
    const onAllPassed = vi.fn();
    const config = createConfig({
      events: [{ name: "event_a", required: true }],
      crashDetector: mockCrashDetector,
      onAllPassed,
    });
    const monitor = new HealthMonitor(config);

    monitor.reportEvent("event_a");
    expect(monitor.isFullyVerified()).toBe(true);

    // Should not trigger again
    monitor.reportEvent("event_a");

    expect(onAllPassed).toHaveBeenCalledTimes(1);
  });
});
