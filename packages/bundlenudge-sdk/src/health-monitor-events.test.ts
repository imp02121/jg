/**
 * HealthMonitor Tests - Event Handling
 *
 * Tests for single and multiple required events in HealthMonitor.
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

describe("HealthMonitor - single required event", () => {
  let mockCrashDetector: CrashDetector;

  beforeEach(() => {
    mockCrashDetector = createMockCrashDetector();
    vi.clearAllMocks();
  });

  it("notifyHealthPassed is called when single required event passes", () => {
    const config = createConfig({
      events: [{ name: "app_loaded", required: true }],
      crashDetector: mockCrashDetector,
    });
    const monitor = new HealthMonitor(config);

    monitor.reportEvent("app_loaded");

    expect(mockCrashDetector.notifyHealthPassed).toHaveBeenCalledTimes(1);
    expect(monitor.isFullyVerified()).toBe(true);
  });

  it("onAllPassed callback is called when event passes", () => {
    const onAllPassed = vi.fn();
    const config = createConfig({
      events: [{ name: "app_loaded", required: true }],
      crashDetector: mockCrashDetector,
      onAllPassed,
    });
    const monitor = new HealthMonitor(config);

    monitor.reportEvent("app_loaded");

    expect(onAllPassed).toHaveBeenCalledTimes(1);
  });
});

describe("HealthMonitor - multiple required events", () => {
  let mockCrashDetector: CrashDetector;

  beforeEach(() => {
    mockCrashDetector = createMockCrashDetector();
    vi.clearAllMocks();
  });

  it("only passes when ALL required events fire", () => {
    const config = createConfig({
      events: [
        { name: "app_loaded", required: true },
        { name: "user_logged_in", required: true },
        { name: "data_fetched", required: true },
      ],
      crashDetector: mockCrashDetector,
    });
    const monitor = new HealthMonitor(config);

    // First event
    monitor.reportEvent("app_loaded");
    expect(mockCrashDetector.notifyHealthPassed).not.toHaveBeenCalled();
    expect(monitor.isFullyVerified()).toBe(false);

    // Second event
    monitor.reportEvent("user_logged_in");
    expect(mockCrashDetector.notifyHealthPassed).not.toHaveBeenCalled();
    expect(monitor.isFullyVerified()).toBe(false);

    // Third event - should trigger verification
    monitor.reportEvent("data_fetched");
    expect(mockCrashDetector.notifyHealthPassed).toHaveBeenCalledTimes(1);
    expect(monitor.isFullyVerified()).toBe(true);
  });

  it("order of events does not matter", () => {
    const config = createConfig({
      events: [
        { name: "event_a", required: true },
        { name: "event_b", required: true },
      ],
      crashDetector: mockCrashDetector,
    });
    const monitor = new HealthMonitor(config);

    // Fire in reverse order
    monitor.reportEvent("event_b");
    expect(monitor.isFullyVerified()).toBe(false);

    monitor.reportEvent("event_a");
    expect(monitor.isFullyVerified()).toBe(true);
    expect(mockCrashDetector.notifyHealthPassed).toHaveBeenCalledTimes(1);
  });
});

describe("HealthMonitor - optional events", () => {
  let mockCrashDetector: CrashDetector;

  beforeEach(() => {
    mockCrashDetector = createMockCrashDetector();
    vi.clearAllMocks();
  });

  it("optional events do not block verification", () => {
    const config = createConfig({
      events: [
        { name: "app_loaded", required: true },
        { name: "analytics_init", required: false },
      ],
      crashDetector: mockCrashDetector,
    });
    const monitor = new HealthMonitor(config);

    // Only fire required event
    monitor.reportEvent("app_loaded");

    expect(mockCrashDetector.notifyHealthPassed).toHaveBeenCalledTimes(1);
    expect(monitor.isFullyVerified()).toBe(true);
  });

  it("optional events can still be reported", () => {
    const config = createConfig({
      events: [
        { name: "app_loaded", required: true },
        { name: "analytics_init", required: false },
      ],
      crashDetector: mockCrashDetector,
    });
    const monitor = new HealthMonitor(config);

    monitor.reportEvent("analytics_init");
    expect(monitor.isFullyVerified()).toBe(false);

    monitor.reportEvent("app_loaded");
    expect(monitor.isFullyVerified()).toBe(true);
  });
});
