/**
 * Health Monitoring Tests - Privacy Guarantee
 *
 * Critical tests for privacy-first health monitoring.
 * The key guarantee: healthy devices send ZERO network calls.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isHealthMonitoringActive,
  reportHealthEvent,
  startHealthMonitoring,
  stopHealthMonitoring,
} from "./health";

describe("health - privacy guarantee", () => {
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

  it("CRITICAL: sends ZERO network calls when all events fire", async () => {
    startHealthMonitoring(
      { events: ["app_ready", "home_loaded", "data_loaded"], windowMs: 30000 },
      "release-123",
      "device-456",
      "https://api.bundlenudge.com",
      "token",
    );

    // Fire all events
    reportHealthEvent("app_ready");
    reportHealthEvent("home_loaded");
    reportHealthEvent("data_loaded");

    // Wait well past the timeout
    await vi.advanceTimersByTimeAsync(100000);

    // CRITICAL: No network calls
    expect(mockFetch).not.toHaveBeenCalled();
    expect(isHealthMonitoringActive()).toBe(false);
  });

  it("CRITICAL: sends exactly ONE network call on failure", async () => {
    startHealthMonitoring(
      { events: ["app_ready", "home_loaded"], windowMs: 30000 },
      "release-123",
      "device-456",
      "https://api.bundlenudge.com",
      "token",
    );

    // Fire only one event
    reportHealthEvent("app_ready");

    // Wait for timeout
    await vi.advanceTimersByTimeAsync(30001);

    // Exactly ONE network call
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.bundlenudge.com/v1/health/failure",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer token",
        }),
      }),
    );
  });

  it("includes missing events in failure report", async () => {
    startHealthMonitoring(
      { events: ["app_ready", "home_loaded", "data_loaded"], windowMs: 30000 },
      "release-123",
      "device-456",
      "https://api.bundlenudge.com",
      "token",
    );

    // Fire only one event
    reportHealthEvent("app_ready");

    // Wait for timeout
    await vi.advanceTimersByTimeAsync(30001);

    const [, options] = mockFetch.mock.calls[0];
    const body = JSON.parse(options.body);

    expect(body.releaseId).toBe("release-123");
    expect(body.deviceId).toBe("device-456");
    expect(body.missingEvents).toContain("home_loaded");
    expect(body.missingEvents).toContain("data_loaded");
    expect(body.missingEvents).not.toContain("app_ready");
  });

  it("CRITICAL: does not send network call when no events were expected", async () => {
    startHealthMonitoring(
      { events: [], windowMs: 30000 },
      "release-123",
      "device-456",
      "https://api.bundlenudge.com",
      "token",
    );

    // Wait past timeout
    await vi.advanceTimersByTimeAsync(50000);

    // No network call
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("does not include Authorization header when accessToken is null", async () => {
    startHealthMonitoring(
      { events: ["app_ready"], windowMs: 30000 },
      "release-123",
      "device-456",
      "https://api.bundlenudge.com",
      null,
    );

    // Let timeout happen
    await vi.advanceTimersByTimeAsync(30001);

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers.Authorization).toBeUndefined();
  });
});
