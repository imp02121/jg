/**
 * HealthMonitor Tests - Endpoint Verification
 *
 * Tests for endpoint verification and combined events/endpoints.
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

describe("HealthMonitor - endpoint verification", () => {
  let mockCrashDetector: CrashDetector;

  beforeEach(() => {
    mockCrashDetector = createMockCrashDetector();
    vi.clearAllMocks();
  });

  it("endpoint status matching works correctly", () => {
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

    monitor.reportEndpoint("GET", "/api/health", 200);

    expect(mockCrashDetector.notifyHealthPassed).toHaveBeenCalledTimes(1);
    expect(monitor.isFullyVerified()).toBe(true);
  });

  it("multiple expected statuses are supported", () => {
    const config = createConfig({
      endpoints: [
        {
          method: "GET",
          url: "/api/data",
          expectedStatus: [200, 201, 204],
          required: true,
        },
      ],
      crashDetector: mockCrashDetector,
    });
    const monitor = new HealthMonitor(config);

    // 204 should be accepted
    monitor.reportEndpoint("GET", "/api/data", 204);

    expect(monitor.isFullyVerified()).toBe(true);
  });

  it("unexpected status does not mark endpoint as passed", () => {
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

    monitor.reportEndpoint("GET", "/api/health", 500);

    expect(mockCrashDetector.notifyHealthPassed).not.toHaveBeenCalled();
    expect(monitor.isFullyVerified()).toBe(false);
  });

  it("onEndpointFailed callback is called for failed required endpoints", () => {
    const onEndpointFailed = vi.fn();
    const endpoint: CriticalEndpoint = {
      method: "GET",
      url: "/api/health",
      expectedStatus: [200],
      required: true,
    };
    const config = createConfig({
      endpoints: [endpoint],
      crashDetector: mockCrashDetector,
      onEndpointFailed,
    });
    const monitor = new HealthMonitor(config);

    monitor.reportEndpoint("GET", "/api/health", 503);

    expect(onEndpointFailed).toHaveBeenCalledWith(endpoint, 503);
  });
});

describe("HealthMonitor - combined events and endpoints", () => {
  let mockCrashDetector: CrashDetector;

  beforeEach(() => {
    mockCrashDetector = createMockCrashDetector();
    vi.clearAllMocks();
  });

  it("requires both events AND endpoints to pass", () => {
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

    // Only event
    monitor.reportEvent("app_loaded");
    expect(monitor.isFullyVerified()).toBe(false);

    // Now endpoint
    monitor.reportEndpoint("GET", "/api/health", 200);
    expect(monitor.isFullyVerified()).toBe(true);
    expect(mockCrashDetector.notifyHealthPassed).toHaveBeenCalledTimes(1);
  });
});
