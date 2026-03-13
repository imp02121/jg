/** Tests for telemetry retry queue. */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearTelemetryQueue, getTelemetryQueueLength, sendTelemetry } from "./telemetry";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock react-native
vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

describe("telemetry retry queue", () => {
  const apiUrl = "https://api.bundlenudge.com";
  const event = {
    deviceId: "device-1",
    appId: "app-1",
    eventType: "update_downloaded",
    bundleVersion: "1.0.0",
    timestamp: Date.now(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    clearTelemetryQueue();
    mockFetch.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    clearTelemetryQueue();
    vi.useRealTimers();
  });

  it("sends event to telemetry endpoint", async () => {
    sendTelemetry(apiUrl, event, "token-123");
    await vi.waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        `${apiUrl}/v1/telemetry`,
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"eventType":"update_downloaded"'),
        }),
      );
    });
  });

  it("includes authorization header when token provided", async () => {
    sendTelemetry(apiUrl, event, "token-abc");
    await vi.waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer token-abc",
          }),
        }),
      );
    });
  });

  it("sends without auth header when token is null", async () => {
    sendTelemetry(apiUrl, event, null);
    await vi.waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: { "Content-Type": "application/json" },
        }),
      );
    });
  });

  it("retries failed events with backoff", async () => {
    vi.useFakeTimers();
    let callCount = 0;
    mockFetch.mockImplementation(() => {
      callCount++;
      if (callCount <= 2) {
        return Promise.reject(new Error("Network error"));
      }
      return Promise.resolve({ ok: true });
    });

    sendTelemetry(apiUrl, event, null);

    // First attempt (immediate)
    await vi.advanceTimersByTimeAsync(0);
    expect(callCount).toBe(1);

    // After first retry delay (1s backoff)
    await vi.advanceTimersByTimeAsync(1_100);
    expect(callCount).toBe(2);

    // After second retry delay (2s backoff)
    await vi.advanceTimersByTimeAsync(2_100);
    expect(callCount).toBe(3);
  });

  it("drops event after max retries", async () => {
    vi.useFakeTimers();
    mockFetch.mockRejectedValue(new Error("Permanent failure"));

    sendTelemetry(apiUrl, event, null);

    // Process all retries
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(1_100);
    await vi.advanceTimersByTimeAsync(2_100);
    await vi.advanceTimersByTimeAsync(4_100);

    expect(getTelemetryQueueLength()).toBe(0);
  });

  it("clears queue with clearTelemetryQueue", () => {
    mockFetch.mockReturnValue(
      new Promise((_resolve) => {
        /* never resolves */
      }),
    );
    sendTelemetry(apiUrl, event, null);
    sendTelemetry(apiUrl, event, null);

    clearTelemetryQueue();
    expect(getTelemetryQueueLength()).toBe(0);
  });

  it("drops oldest event when queue is full", () => {
    mockFetch.mockReturnValue(
      new Promise((_resolve) => {
        /* never resolves */
      }),
    );
    for (let i = 0; i < 51; i++) {
      sendTelemetry(apiUrl, { ...event, eventType: `event_${String(i)}` }, null);
    }

    expect(getTelemetryQueueLength()).toBeLessThanOrEqual(50);
  });
});
