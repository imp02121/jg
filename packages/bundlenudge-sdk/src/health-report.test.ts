/**
 * Health Monitoring Tests - Report Events
 *
 * Tests for reportHealthEvent function.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getHealthMonitoringState,
  isHealthMonitoringActive,
  reportHealthEvent,
  startHealthMonitoring,
  stopHealthMonitoring,
} from "./health";

describe("health - reportHealthEvent", () => {
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

  it("tracks fired events", () => {
    startHealthMonitoring(
      { events: ["app_ready", "home_loaded"] },
      "release-123",
      "device-456",
      "https://api.bundlenudge.com",
      "token",
    );

    reportHealthEvent("app_ready");

    const state = getHealthMonitoringState();
    expect(state?.firedEvents).toContain("app_ready");
  });

  it("ignores unknown events", () => {
    startHealthMonitoring(
      { events: ["app_ready"] },
      "release-123",
      "device-456",
      "https://api.bundlenudge.com",
      "token",
    );

    reportHealthEvent("unknown_event");

    const state = getHealthMonitoringState();
    expect(state?.firedEvents).toEqual([]);
  });

  it("does nothing when not monitoring", () => {
    // Should not throw
    reportHealthEvent("app_ready");
    expect(isHealthMonitoringActive()).toBe(false);
  });

  it("ignores duplicate events (Set behavior)", () => {
    startHealthMonitoring(
      { events: ["app_ready", "home_loaded"] },
      "release-123",
      "device-456",
      "https://api.bundlenudge.com",
      "token",
    );

    reportHealthEvent("app_ready");
    reportHealthEvent("app_ready");
    reportHealthEvent("app_ready");

    const state = getHealthMonitoringState();
    expect(state?.firedEvents).toHaveLength(1);
    expect(state?.firedEvents).toContain("app_ready");
  });
});
