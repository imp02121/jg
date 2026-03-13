/**
 * Health Monitoring Tests - Stop and State
 *
 * Tests for stopHealthMonitoring and getHealthMonitoringState functions.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getHealthMonitoringState,
  isHealthMonitoringActive,
  reportHealthEvent,
  startHealthMonitoring,
  stopHealthMonitoring,
} from "./health";

describe("health - stopHealthMonitoring", () => {
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

  it("stops active monitoring", () => {
    startHealthMonitoring(
      { events: ["app_ready"] },
      "release-123",
      "device-456",
      "https://api.bundlenudge.com",
      "token",
    );

    stopHealthMonitoring();

    expect(isHealthMonitoringActive()).toBe(false);
  });

  it("is safe to call multiple times", () => {
    stopHealthMonitoring();
    stopHealthMonitoring();
    expect(isHealthMonitoringActive()).toBe(false);
  });

  it("cancels pending timeout", async () => {
    startHealthMonitoring(
      { events: ["app_ready"], windowMs: 30000 },
      "release-123",
      "device-456",
      "https://api.bundlenudge.com",
      "token",
    );

    stopHealthMonitoring();

    // Wait past original timeout
    await vi.advanceTimersByTimeAsync(50000);

    // No network call should have been made
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe("health - getHealthMonitoringState", () => {
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

  it("returns null when not monitoring", () => {
    expect(getHealthMonitoringState()).toBeNull();
  });

  it("returns current state when monitoring", () => {
    startHealthMonitoring(
      { events: ["app_ready", "home_loaded"], windowMs: 30000 },
      "release-123",
      "device-456",
      "https://api.bundlenudge.com",
      "token",
    );

    reportHealthEvent("app_ready");

    const state = getHealthMonitoringState();
    expect(state).not.toBeNull();
    expect(state?.isActive).toBe(true);
    expect(state?.events).toContain("app_ready");
    expect(state?.events).toContain("home_loaded");
    expect(state?.firedEvents).toContain("app_ready");
    expect(state?.remainingMs).toBeLessThanOrEqual(30000);
  });

  it("returns decreasing remainingMs over time", () => {
    startHealthMonitoring(
      { events: ["app_ready"], windowMs: 30000 },
      "release-123",
      "device-456",
      "https://api.bundlenudge.com",
      "token",
    );

    const state1 = getHealthMonitoringState();
    expect(state1?.remainingMs).toBeLessThanOrEqual(30000);

    vi.advanceTimersByTime(10000);

    const state2 = getHealthMonitoringState();
    expect(state2?.remainingMs).toBeLessThanOrEqual(20000);
  });
});
