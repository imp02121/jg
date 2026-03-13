/**
 * Health Monitoring Tests - Start Monitoring
 *
 * Tests for startHealthMonitoring function.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getHealthMonitoringState,
  isHealthMonitoringActive,
  startHealthMonitoring,
  stopHealthMonitoring,
} from "./health";

describe("health - startHealthMonitoring", () => {
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

  it("starts monitoring with specified events", () => {
    startHealthMonitoring(
      { events: ["app_ready", "home_loaded"] },
      "release-123",
      "device-456",
      "https://api.bundlenudge.com",
      "token",
    );

    expect(isHealthMonitoringActive()).toBe(true);
    const state = getHealthMonitoringState();
    expect(state?.events).toContain("app_ready");
    expect(state?.events).toContain("home_loaded");
    expect(state?.firedEvents).toEqual([]);
  });

  it("does nothing with empty events array", () => {
    startHealthMonitoring(
      { events: [] },
      "release-123",
      "device-456",
      "https://api.bundlenudge.com",
      "token",
    );

    expect(isHealthMonitoringActive()).toBe(false);
  });

  it("stops previous monitoring when starting new", () => {
    startHealthMonitoring(
      { events: ["event1"] },
      "release-1",
      "device-1",
      "https://api.bundlenudge.com",
      "token",
    );

    startHealthMonitoring(
      { events: ["event2"] },
      "release-2",
      "device-2",
      "https://api.bundlenudge.com",
      "token",
    );

    const state = getHealthMonitoringState();
    expect(state?.events).toContain("event2");
    expect(state?.events).not.toContain("event1");
  });

  it("works with null accessToken", () => {
    startHealthMonitoring(
      { events: ["app_ready"] },
      "release-123",
      "device-456",
      "https://api.bundlenudge.com",
      null,
    );

    expect(isHealthMonitoringActive()).toBe(true);
  });
});
