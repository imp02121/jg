/**
 * HealthMonitor Tests - Verification Edge Cases
 *
 * Tests for:
 * - 2C.1: Heavy load scenarios affecting health verification
 * - 2C.3: Multiple rapid verifications and state consistency
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CrashDetector } from "./crash-detector";
import { HealthMonitor, type HealthMonitorConfig } from "./health-monitor";

function createMockCrashDetector(): CrashDetector {
  return {
    notifyHealthPassed: vi.fn().mockResolvedValue(undefined),
    notifyAppReady: vi.fn().mockResolvedValue(undefined),
    checkForCrash: vi.fn().mockResolvedValue(false),
    startVerificationWindow: vi.fn(),
    stop: vi.fn(),
    reset: vi.fn(),
    isVerificationInProgress: vi.fn().mockReturnValue(true),
    isVerificationCompleted: vi.fn().mockReturnValue(false),
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

describe("2C.1: HealthMonitor under heavy load", () => {
  let mockCrashDetector: CrashDetector;

  beforeEach(() => {
    vi.useFakeTimers();
    mockCrashDetector = createMockCrashDetector();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("handles many rapid event reports without corruption", () => {
    const onAllPassed = vi.fn();
    const config = createConfig({
      events: [
        { name: "event_a", required: true },
        { name: "event_b", required: true },
        { name: "event_c", required: true },
      ],
      crashDetector: mockCrashDetector,
      onAllPassed,
    });
    const monitor = new HealthMonitor(config);

    // Rapid fire many events
    for (let i = 0; i < 100; i++) {
      monitor.reportEvent("event_a");
      monitor.reportEvent("event_b");
    }

    // Should not be complete yet (event_c missing)
    expect(monitor.isFullyVerified()).toBe(false);
    expect(onAllPassed).not.toHaveBeenCalled();

    // Complete the verification
    monitor.reportEvent("event_c");

    expect(monitor.isFullyVerified()).toBe(true);
    expect(onAllPassed).toHaveBeenCalledTimes(1);
    expect(mockCrashDetector.notifyHealthPassed).toHaveBeenCalledTimes(1);
  });

  it("handles many rapid endpoint reports without corruption", () => {
    const onAllPassed = vi.fn();
    const config = createConfig({
      endpoints: [
        { method: "GET", url: "/api/a", expectedStatus: [200], required: true },
        { method: "GET", url: "/api/b", expectedStatus: [200], required: true },
        { method: "GET", url: "/api/c", expectedStatus: [200], required: true },
      ],
      crashDetector: mockCrashDetector,
      onAllPassed,
    });
    const monitor = new HealthMonitor(config);

    // Rapid fire many endpoint reports
    for (let i = 0; i < 100; i++) {
      monitor.reportEndpoint("GET", "/api/a", 200);
      monitor.reportEndpoint("GET", "/api/b", 200);
    }

    // Should not be complete yet (/api/c missing)
    expect(monitor.isFullyVerified()).toBe(false);
    expect(onAllPassed).not.toHaveBeenCalled();

    // Complete the verification
    monitor.reportEndpoint("GET", "/api/c", 200);

    expect(monitor.isFullyVerified()).toBe(true);
    expect(onAllPassed).toHaveBeenCalledTimes(1);
    expect(mockCrashDetector.notifyHealthPassed).toHaveBeenCalledTimes(1);
  });

  it("mixed events and endpoints under load complete correctly", () => {
    const onAllPassed = vi.fn();
    const config = createConfig({
      events: [
        { name: "app_loaded", required: true },
        { name: "user_auth", required: true },
      ],
      endpoints: [
        { method: "GET", url: "/api/health", expectedStatus: [200], required: true },
        { method: "POST", url: "/api/data", expectedStatus: [200, 201], required: true },
      ],
      crashDetector: mockCrashDetector,
      onAllPassed,
    });
    const monitor = new HealthMonitor(config);

    // Simulate load with interleaved reports
    for (let i = 0; i < 50; i++) {
      monitor.reportEvent("app_loaded");
      monitor.reportEndpoint("GET", "/api/health", 200);
      monitor.reportEvent("user_auth");
    }

    // Last required item
    monitor.reportEndpoint("POST", "/api/data", 201);

    expect(monitor.isFullyVerified()).toBe(true);
    expect(onAllPassed).toHaveBeenCalledTimes(1);
    expect(mockCrashDetector.notifyHealthPassed).toHaveBeenCalledTimes(1);
  });

  it("onEndpointFailed callback is called once per unique failure", () => {
    const onEndpointFailed = vi.fn();
    const config = createConfig({
      endpoints: [{ method: "GET", url: "/api/health", expectedStatus: [200], required: true }],
      crashDetector: mockCrashDetector,
      onEndpointFailed,
    });
    const monitor = new HealthMonitor(config);

    // Report failure multiple times
    monitor.reportEndpoint("GET", "/api/health", 500);
    monitor.reportEndpoint("GET", "/api/health", 500);
    monitor.reportEndpoint("GET", "/api/health", 500);

    // Each failure triggers callback
    expect(onEndpointFailed).toHaveBeenCalledTimes(3);
    expect(monitor.isFullyVerified()).toBe(false);
  });
});

describe("2C.3: Multiple verifications in quick succession", () => {
  let mockCrashDetector: CrashDetector;

  beforeEach(() => {
    mockCrashDetector = createMockCrashDetector();
    vi.clearAllMocks();
  });

  it("reset followed by same events verifies again", () => {
    const onAllPassed = vi.fn();
    const config = createConfig({
      events: [{ name: "app_loaded", required: true }],
      crashDetector: mockCrashDetector,
      onAllPassed,
    });
    const monitor = new HealthMonitor(config);

    // First verification
    monitor.reportEvent("app_loaded");
    expect(monitor.isFullyVerified()).toBe(true);
    expect(onAllPassed).toHaveBeenCalledTimes(1);

    // Reset
    monitor.reset();
    expect(monitor.isFullyVerified()).toBe(false);

    // Second verification
    monitor.reportEvent("app_loaded");
    expect(monitor.isFullyVerified()).toBe(true);
    expect(onAllPassed).toHaveBeenCalledTimes(2);
  });

  it("rapid reset-verify cycles maintain correct state", () => {
    const onAllPassed = vi.fn();
    const config = createConfig({
      events: [{ name: "event_a", required: true }],
      endpoints: [{ method: "GET", url: "/api/health", expectedStatus: [200], required: true }],
      crashDetector: mockCrashDetector,
      onAllPassed,
    });
    const monitor = new HealthMonitor(config);

    // Run 5 complete cycles rapidly
    for (let i = 0; i < 5; i++) {
      monitor.reset();
      expect(monitor.isFullyVerified()).toBe(false);
      expect(monitor.getMissingEvents()).toEqual(["event_a"]);
      expect(monitor.getMissingEndpoints().length).toBe(1);

      monitor.reportEvent("event_a");
      monitor.reportEndpoint("GET", "/api/health", 200);

      expect(monitor.isFullyVerified()).toBe(true);
      expect(monitor.getMissingEvents()).toEqual([]);
      expect(monitor.getMissingEndpoints()).toEqual([]);
    }

    expect(onAllPassed).toHaveBeenCalledTimes(5);
    expect(mockCrashDetector.notifyHealthPassed).toHaveBeenCalledTimes(5);
  });

  it("getMissingEvents returns consistent results during rapid checks", () => {
    const config = createConfig({
      events: [
        { name: "event_a", required: true },
        { name: "event_b", required: true },
        { name: "event_c", required: false },
      ],
      crashDetector: mockCrashDetector,
    });
    const monitor = new HealthMonitor(config);

    // Check multiple times before any reports
    for (let i = 0; i < 10; i++) {
      const missing = monitor.getMissingEvents();
      expect(missing).toEqual(["event_a", "event_b"]);
    }

    // Report one event
    monitor.reportEvent("event_a");

    // Check multiple times after one report
    for (let i = 0; i < 10; i++) {
      const missing = monitor.getMissingEvents();
      expect(missing).toEqual(["event_b"]);
    }
  });

  it("getMissingEndpoints returns consistent results during rapid checks", () => {
    const config = createConfig({
      endpoints: [
        { method: "GET", url: "/api/a", expectedStatus: [200], required: true },
        { method: "POST", url: "/api/b", expectedStatus: [201], required: true },
        { method: "GET", url: "/api/c", expectedStatus: [200], required: false },
      ],
      crashDetector: mockCrashDetector,
    });
    const monitor = new HealthMonitor(config);

    // Check multiple times before any reports
    for (let i = 0; i < 10; i++) {
      const missing = monitor.getMissingEndpoints();
      expect(missing.length).toBe(2);
      expect(missing.map((e) => e.url)).toContain("/api/a");
      expect(missing.map((e) => e.url)).toContain("/api/b");
    }

    // Report one endpoint
    monitor.reportEndpoint("GET", "/api/a", 200);

    // Check multiple times after one report
    for (let i = 0; i < 10; i++) {
      const missing = monitor.getMissingEndpoints();
      expect(missing.length).toBe(1);
      expect(missing[0].url).toBe("/api/b");
    }
  });

  it("reports after completion do not change state", () => {
    const onAllPassed = vi.fn();
    const config = createConfig({
      events: [{ name: "event_a", required: true }],
      endpoints: [{ method: "GET", url: "/api/health", expectedStatus: [200], required: true }],
      crashDetector: mockCrashDetector,
      onAllPassed,
    });
    const monitor = new HealthMonitor(config);

    // Complete verification
    monitor.reportEvent("event_a");
    monitor.reportEndpoint("GET", "/api/health", 200);
    expect(monitor.isFullyVerified()).toBe(true);
    expect(onAllPassed).toHaveBeenCalledTimes(1);

    // Try to report more after completion
    monitor.reportEvent("event_a");
    monitor.reportEvent("event_a");
    monitor.reportEndpoint("GET", "/api/health", 200);
    monitor.reportEndpoint("GET", "/api/health", 200);

    // Should still be verified, callback not called again
    expect(monitor.isFullyVerified()).toBe(true);
    expect(onAllPassed).toHaveBeenCalledTimes(1);
    expect(mockCrashDetector.notifyHealthPassed).toHaveBeenCalledTimes(1);
  });

  it("only required items must pass for verification", () => {
    const onAllPassed = vi.fn();
    const config = createConfig({
      events: [
        { name: "required_event", required: true },
        { name: "optional_event", required: false },
      ],
      endpoints: [
        { method: "GET", url: "/api/required", expectedStatus: [200], required: true },
        { method: "GET", url: "/api/optional", expectedStatus: [200], required: false },
      ],
      crashDetector: mockCrashDetector,
      onAllPassed,
    });
    const monitor = new HealthMonitor(config);

    // Report only required items
    monitor.reportEvent("required_event");
    monitor.reportEndpoint("GET", "/api/required", 200);

    // Should be verified without optional items
    expect(monitor.isFullyVerified()).toBe(true);
    expect(onAllPassed).toHaveBeenCalledTimes(1);
  });
});

describe("HealthMonitor state consistency", () => {
  let mockCrashDetector: CrashDetector;

  beforeEach(() => {
    mockCrashDetector = createMockCrashDetector();
    vi.clearAllMocks();
  });

  it("reset clears all passed events and endpoints", () => {
    const config = createConfig({
      events: [
        { name: "event_a", required: true },
        { name: "event_b", required: true },
      ],
      endpoints: [{ method: "GET", url: "/api/a", expectedStatus: [200], required: true }],
      crashDetector: mockCrashDetector,
    });
    const monitor = new HealthMonitor(config);

    // Pass everything
    monitor.reportEvent("event_a");
    monitor.reportEvent("event_b");
    monitor.reportEndpoint("GET", "/api/a", 200);
    expect(monitor.isFullyVerified()).toBe(true);

    // Reset
    monitor.reset();

    // All should be missing again
    expect(monitor.isFullyVerified()).toBe(false);
    expect(monitor.getMissingEvents()).toEqual(["event_a", "event_b"]);
    expect(monitor.getMissingEndpoints().length).toBe(1);
  });

  it("partial status codes work correctly with multiple expected statuses", () => {
    const config = createConfig({
      endpoints: [
        { method: "POST", url: "/api/create", expectedStatus: [200, 201, 202], required: true },
      ],
      crashDetector: mockCrashDetector,
    });
    const monitor = new HealthMonitor(config);

    // First report with wrong status
    monitor.reportEndpoint("POST", "/api/create", 500);
    expect(monitor.isFullyVerified()).toBe(false);

    // Second report with one of the expected statuses
    monitor.reportEndpoint("POST", "/api/create", 201);
    expect(monitor.isFullyVerified()).toBe(true);
  });

  it("endpoint method must match exactly", () => {
    const config = createConfig({
      endpoints: [{ method: "GET", url: "/api/data", expectedStatus: [200], required: true }],
      crashDetector: mockCrashDetector,
    });
    const monitor = new HealthMonitor(config);

    // Wrong method
    monitor.reportEndpoint("POST", "/api/data", 200);
    expect(monitor.isFullyVerified()).toBe(false);
    expect(monitor.getMissingEndpoints().length).toBe(1);

    // Correct method
    monitor.reportEndpoint("GET", "/api/data", 200);
    expect(monitor.isFullyVerified()).toBe(true);
  });

  it("endpoint URL must match exactly", () => {
    const config = createConfig({
      endpoints: [{ method: "GET", url: "/api/data", expectedStatus: [200], required: true }],
      crashDetector: mockCrashDetector,
    });
    const monitor = new HealthMonitor(config);

    // Similar but different URLs
    monitor.reportEndpoint("GET", "/api/data/", 200);
    monitor.reportEndpoint("GET", "/api/Data", 200);
    monitor.reportEndpoint("GET", "api/data", 200);
    expect(monitor.isFullyVerified()).toBe(false);

    // Exact match
    monitor.reportEndpoint("GET", "/api/data", 200);
    expect(monitor.isFullyVerified()).toBe(true);
  });
});
