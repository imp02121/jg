/**
 * Health Monitoring Tests - Edge Cases
 *
 * Tests for edge cases in health monitoring.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isHealthMonitoringActive,
  reportHealthEvent,
  startHealthMonitoring,
  stopHealthMonitoring,
} from "./health";

describe("health - edge cases", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    global.fetch = mockFetch;
    mockFetch.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    stopHealthMonitoring();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("handles single event correctly", async () => {
    startHealthMonitoring(
      { events: ["app_ready"], windowMs: 30000 },
      "release-123",
      "device-456",
      "https://api.bundlenudge.com",
      "token",
    );

    reportHealthEvent("app_ready");

    // All events fired, should stop immediately
    expect(isHealthMonitoringActive()).toBe(false);

    // Wait past timeout
    await vi.advanceTimersByTimeAsync(50000);

    // No network call
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("handles events fired in any order", () => {
    startHealthMonitoring(
      { events: ["first", "second", "third"] },
      "release-123",
      "device-456",
      "https://api.bundlenudge.com",
      "token",
    );

    reportHealthEvent("third");
    reportHealthEvent("first");
    reportHealthEvent("second");

    // All events fired, monitoring should be stopped
    expect(isHealthMonitoringActive()).toBe(false);
  });

  it("includes appVersion and osVersion when provided", async () => {
    startHealthMonitoring(
      { events: ["app_ready"], windowMs: 1000 },
      "release-123",
      "device-456",
      "https://api.bundlenudge.com",
      "token",
      "1.0.0",
      "iOS 17.0",
    );

    await vi.advanceTimersByTimeAsync(1001);

    const [, options] = mockFetch.mock.calls[0];
    const body = JSON.parse(options.body);

    expect(body.appVersion).toBe("1.0.0");
    expect(body.osVersion).toBe("iOS 17.0");
  });

  it("handles race condition where all events fire during timeout", async () => {
    startHealthMonitoring(
      { events: ["app_ready", "home_loaded"], windowMs: 1000 },
      "release-123",
      "device-456",
      "https://api.bundlenudge.com",
      "token",
    );

    // Fire events just before timeout
    vi.advanceTimersByTime(999);
    reportHealthEvent("app_ready");
    reportHealthEvent("home_loaded");

    // Monitoring should have stopped
    expect(isHealthMonitoringActive()).toBe(false);

    // Wait past timeout
    await vi.advanceTimersByTimeAsync(100);

    // No network call
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("reports all events as missing if none fire", async () => {
    startHealthMonitoring(
      { events: ["app_ready", "home_loaded", "data_loaded"], windowMs: 1000 },
      "release-123",
      "device-456",
      "https://api.bundlenudge.com",
      "token",
    );

    // Don't fire any events
    await vi.advanceTimersByTimeAsync(1001);

    const [, options] = mockFetch.mock.calls[0];
    const body = JSON.parse(options.body);

    expect(body.missingEvents).toHaveLength(3);
    expect(body.missingEvents).toContain("app_ready");
    expect(body.missingEvents).toContain("home_loaded");
    expect(body.missingEvents).toContain("data_loaded");
  });
});
