/**
 * HealthMonitor Tests - State Management
 *
 * Tests for getMissingEvents, getMissingEndpoints, and reset.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CrashDetector } from "./crash-detector";
import { type CriticalEndpoint, HealthMonitor, type HealthMonitorConfig } from "./health-monitor";

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

describe("HealthMonitor - getMissingEvents", () => {
  let mockCrashDetector: CrashDetector;

  beforeEach(() => {
    mockCrashDetector = createMockCrashDetector();
    vi.clearAllMocks();
  });

  it("returns missing required events", () => {
    const config = createConfig({
      events: [
        { name: "event_a", required: true },
        { name: "event_b", required: true },
        { name: "event_c", required: false },
      ],
      crashDetector: mockCrashDetector,
    });
    const monitor = new HealthMonitor(config);

    monitor.reportEvent("event_a");

    const missing = monitor.getMissingEvents();
    expect(missing).toEqual(["event_b"]);
  });

  it("returns empty array when all required events passed", () => {
    const config = createConfig({
      events: [{ name: "event_a", required: true }],
      crashDetector: mockCrashDetector,
    });
    const monitor = new HealthMonitor(config);

    monitor.reportEvent("event_a");

    expect(monitor.getMissingEvents()).toEqual([]);
  });
});

describe("HealthMonitor - getMissingEndpoints", () => {
  let mockCrashDetector: CrashDetector;

  beforeEach(() => {
    mockCrashDetector = createMockCrashDetector();
    vi.clearAllMocks();
  });

  it("returns missing required endpoints", () => {
    const endpoint1: CriticalEndpoint = {
      method: "GET",
      url: "/api/health",
      expectedStatus: [200],
      required: true,
    };
    const endpoint2: CriticalEndpoint = {
      method: "POST",
      url: "/api/data",
      expectedStatus: [201],
      required: true,
    };
    const config = createConfig({
      endpoints: [endpoint1, endpoint2],
      crashDetector: mockCrashDetector,
    });
    const monitor = new HealthMonitor(config);

    monitor.reportEndpoint("GET", "/api/health", 200);

    const missing = monitor.getMissingEndpoints();
    expect(missing).toEqual([endpoint2]);
  });
});

describe("HealthMonitor - reset", () => {
  let mockCrashDetector: CrashDetector;

  beforeEach(() => {
    mockCrashDetector = createMockCrashDetector();
    vi.clearAllMocks();
  });

  it("clears all state", () => {
    const config = createConfig({
      events: [{ name: "app_loaded", required: true }],
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

    // Complete verification
    monitor.reportEvent("app_loaded");
    monitor.reportEndpoint("GET", "/api/health", 200);
    expect(monitor.isFullyVerified()).toBe(true);

    // Reset
    monitor.reset();

    expect(monitor.isFullyVerified()).toBe(false);
    expect(monitor.getMissingEvents()).toEqual(["app_loaded"]);
    expect(monitor.getMissingEndpoints()).toHaveLength(1);
  });

  it("allows re-verification after reset", () => {
    const config = createConfig({
      events: [{ name: "app_loaded", required: true }],
      crashDetector: mockCrashDetector,
    });
    const monitor = new HealthMonitor(config);

    monitor.reportEvent("app_loaded");
    expect(mockCrashDetector.notifyHealthPassed).toHaveBeenCalledTimes(1);

    monitor.reset();
    monitor.reportEvent("app_loaded");

    expect(mockCrashDetector.notifyHealthPassed).toHaveBeenCalledTimes(2);
  });
});
