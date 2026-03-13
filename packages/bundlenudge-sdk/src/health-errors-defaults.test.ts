/**
 * Health Monitoring Tests - Network Errors and Default Values
 *
 * Tests for error handling and default configuration.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_HEALTH_WINDOW_MS,
  isHealthMonitoringActive,
  startHealthMonitoring,
  stopHealthMonitoring,
} from "./health";

describe("health - network error handling", () => {
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

  it("ignores network errors (fire-and-forget)", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    startHealthMonitoring(
      { events: ["app_ready"], windowMs: 30000 },
      "release-123",
      "device-456",
      "https://api.bundlenudge.com",
      "token",
    );

    // Don't fire event, let timeout happen
    await vi.advanceTimersByTimeAsync(30001);

    // Should not throw, monitoring should be stopped
    expect(isHealthMonitoringActive()).toBe(false);
  });

  it("handles server error responses gracefully", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });

    startHealthMonitoring(
      { events: ["app_ready"], windowMs: 30000 },
      "release-123",
      "device-456",
      "https://api.bundlenudge.com",
      "token",
    );

    // Let timeout happen
    await vi.advanceTimersByTimeAsync(30001);

    // Should not throw
    expect(isHealthMonitoringActive()).toBe(false);
  });
});

describe("health - default values", () => {
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

  it("uses DEFAULT_HEALTH_WINDOW_MS when not specified", () => {
    expect(DEFAULT_HEALTH_WINDOW_MS).toBe(30000);
  });

  it("applies default window when not provided in config", async () => {
    startHealthMonitoring(
      { events: ["app_ready"] },
      "release-123",
      "device-456",
      "https://api.bundlenudge.com",
      "token",
    );

    // Wait less than default window
    await vi.advanceTimersByTimeAsync(25000);
    expect(mockFetch).not.toHaveBeenCalled();

    // Wait past default window
    await vi.advanceTimersByTimeAsync(10000);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
