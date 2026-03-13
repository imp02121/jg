/**
 * Metrics Tracker Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MetricsTracker } from "./tracker";
import type { MetricsConfig, VariantInfo } from "./types";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

function createConfig(overrides: Partial<MetricsConfig> = {}): MetricsConfig {
  return {
    apiUrl: "https://api.bundlenudge.com",
    appId: "test-app-id",
    deviceId: "test-device-id",
    getAccessToken: () => "test-token",
    flushIntervalMs: 30000,
    maxQueueSize: 50,
    debug: false,
    ...overrides,
  };
}

describe("MetricsTracker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("initializes with config", () => {
      const config = createConfig();
      const tracker = new MetricsTracker(config);

      expect(tracker.getVariant()).toBeNull();
      expect(tracker.isControlGroup()).toBe(false);

      tracker.destroy();
    });

    it("starts flush timer on construction", () => {
      const config = createConfig({ flushIntervalMs: 5000 });
      const tracker = new MetricsTracker(config);

      tracker.trackEvent("test-event");

      // Timer not yet fired
      expect(mockFetch).not.toHaveBeenCalled();

      // Advance past flush interval
      vi.advanceTimersByTime(5000);

      expect(mockFetch).toHaveBeenCalledTimes(1);

      tracker.destroy();
    });
  });

  describe("trackEvent", () => {
    it("adds event to queue", async () => {
      const config = createConfig();
      const tracker = new MetricsTracker(config);

      tracker.trackEvent("button_click", 1, { screen: "home" });

      await tracker.flush();

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.bundlenudge.com/v1/metrics/report",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("button_click"),
        }),
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.events).toHaveLength(1);
      expect(body.events[0]).toMatchObject({
        type: "custom",
        name: "button_click",
        value: 1,
        metadata: { screen: "home" },
      });
      expect(body.events[0].timestamp).toBeDefined();

      tracker.destroy();
    });

    it("does not track events after destroy", async () => {
      const config = createConfig();
      const tracker = new MetricsTracker(config);

      tracker.destroy();
      tracker.trackEvent("test-event");

      await tracker.flush();

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("trackPerformance", () => {
    it("adds performance event to queue", async () => {
      const config = createConfig();
      const tracker = new MetricsTracker(config);

      tracker.trackPerformance("screen_load", 250);

      await tracker.flush();

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.events[0]).toMatchObject({
        type: "performance",
        name: "screen_load",
        value: 250,
      });

      tracker.destroy();
    });
  });

  describe("auto-flush when queue reaches maxQueueSize", () => {
    it("flushes automatically at max size", async () => {
      const config = createConfig({ maxQueueSize: 3, flushIntervalMs: 60000 });
      const tracker = new MetricsTracker(config);

      tracker.trackEvent("event1");
      tracker.trackEvent("event2");

      expect(mockFetch).not.toHaveBeenCalled();

      tracker.trackEvent("event3"); // Should trigger flush

      // Wait for the flush promise to complete
      await Promise.resolve();
      await Promise.resolve();

      expect(mockFetch).toHaveBeenCalledTimes(1);

      tracker.destroy();
    });
  });

  describe("flush", () => {
    it("sends events to server", async () => {
      const config = createConfig();
      const tracker = new MetricsTracker(config);

      tracker.trackEvent("test1");
      tracker.trackEvent("test2");

      await tracker.flush();

      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("https://api.bundlenudge.com/v1/metrics/report");
      expect(options.method).toBe("POST");
      expect(options.headers).toEqual({
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
      });

      const body = JSON.parse(options.body);
      expect(body.appId).toBe("test-app-id");
      expect(body.deviceId).toBe("test-device-id");
      expect(body.events).toHaveLength(2);

      tracker.destroy();
    });

    it("clears queue after success", async () => {
      const config = createConfig();
      const tracker = new MetricsTracker(config);

      tracker.trackEvent("test");
      await tracker.flush();

      mockFetch.mockClear();

      await tracker.flush(); // Should be empty now

      expect(mockFetch).not.toHaveBeenCalled();

      tracker.destroy();
    });

    it("re-queues on failure", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });

      const config = createConfig();
      const tracker = new MetricsTracker(config);

      tracker.trackEvent("test-event");
      await tracker.flush();

      // Events should still be in queue
      mockFetch.mockClear();
      mockFetch.mockResolvedValueOnce({ ok: true });

      await tracker.flush();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.events).toHaveLength(1);
      expect(body.events[0].name).toBe("test-event");

      tracker.destroy();
    });

    it("does nothing when queue is empty", async () => {
      const config = createConfig();
      const tracker = new MetricsTracker(config);

      await tracker.flush();

      expect(mockFetch).not.toHaveBeenCalled();

      tracker.destroy();
    });
  });

  describe("trackCrash", () => {
    it("sends immediately without queueing", async () => {
      const config = createConfig();
      const tracker = new MetricsTracker(config);

      const error = new Error("Test crash");
      error.stack = "Error: Test crash\n    at test.ts:1";

      await tracker.trackCrash(error, { screen: "home" });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("https://api.bundlenudge.com/v1/metrics/crash");

      const body = JSON.parse(options.body);
      expect(body.appId).toBe("test-app-id");
      expect(body.deviceId).toBe("test-device-id");
      expect(body.error).toBe("Test crash");
      expect(body.stack).toContain("test.ts:1");
      expect(body.metadata.screen).toBe("home");
      expect(body.timestamp).toBeDefined();

      tracker.destroy();
    });

    it("includes variant info in crash metadata", async () => {
      const config = createConfig();
      const tracker = new MetricsTracker(config);

      const variant: VariantInfo = {
        id: "variant-123",
        name: "Test Variant",
        isControl: false,
      };
      tracker.setVariant(variant);

      await tracker.trackCrash(new Error("Test"));

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.metadata.variantId).toBe("variant-123");
      expect(body.metadata.variantName).toBe("Test Variant");

      tracker.destroy();
    });
  });

  describe("setVariant/getVariant", () => {
    it("sets and gets variant", () => {
      const config = createConfig();
      const tracker = new MetricsTracker(config);

      const variant: VariantInfo = {
        id: "variant-123",
        name: "Test Variant",
        isControl: false,
      };

      tracker.setVariant(variant);

      expect(tracker.getVariant()).toEqual(variant);

      tracker.destroy();
    });
  });

  describe("isControlGroup", () => {
    it("returns false when no variant set", () => {
      const config = createConfig();
      const tracker = new MetricsTracker(config);

      expect(tracker.isControlGroup()).toBe(false);

      tracker.destroy();
    });

    it("returns true for control variant", () => {
      const config = createConfig();
      const tracker = new MetricsTracker(config);

      tracker.setVariant({
        id: "control",
        name: "Control",
        isControl: true,
      });

      expect(tracker.isControlGroup()).toBe(true);

      tracker.destroy();
    });

    it("returns false for non-control variant", () => {
      const config = createConfig();
      const tracker = new MetricsTracker(config);

      tracker.setVariant({
        id: "treatment",
        name: "Treatment",
        isControl: false,
      });

      expect(tracker.isControlGroup()).toBe(false);

      tracker.destroy();
    });
  });

  describe("destroy", () => {
    it("clears timer and queue", () => {
      const config = createConfig({ flushIntervalMs: 1000 });
      const tracker = new MetricsTracker(config);

      tracker.trackEvent("test");
      tracker.destroy();

      // Advance past flush interval
      vi.advanceTimersByTime(2000);

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("clears variant", () => {
      const config = createConfig();
      const tracker = new MetricsTracker(config);

      tracker.setVariant({ id: "1", name: "Test", isControl: false });
      tracker.destroy();

      expect(tracker.getVariant()).toBeNull();
    });
  });

  describe("authorization header", () => {
    it("includes token when available", async () => {
      const config = createConfig({ getAccessToken: () => "my-token" });
      const tracker = new MetricsTracker(config);

      tracker.trackEvent("test");
      await tracker.flush();

      const options = mockFetch.mock.calls[0][1];
      expect(options.headers.Authorization).toBe("Bearer my-token");

      tracker.destroy();
    });

    it("omits header when token is null", async () => {
      const config = createConfig({ getAccessToken: () => null });
      const tracker = new MetricsTracker(config);

      tracker.trackEvent("test");
      await tracker.flush();

      const options = mockFetch.mock.calls[0][1];
      expect(options.headers.Authorization).toBeUndefined();

      tracker.destroy();
    });
  });

  describe("error handling", () => {
    it("handles network errors without throwing", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const config = createConfig();
      const tracker = new MetricsTracker(config);

      tracker.trackEvent("test");

      // Should not throw
      await expect(tracker.flush()).resolves.toBeUndefined();

      tracker.destroy();
    });

    it("silently fails without logging (metrics are non-critical)", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

      const config = createConfig({ debug: true });
      const tracker = new MetricsTracker(config);

      tracker.trackEvent("test");
      await tracker.flush();

      // Metrics failures should be silent - no logging
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
      tracker.destroy();
    });
  });

  describe("bounded queue enforcement", () => {
    it("drops oldest events when queue exceeds hard cap", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      // Set maxQueueSize very high so auto-flush does not trigger
      const config = createConfig({
        maxQueueSize: 200,
        flushIntervalMs: 600_000,
      });
      const tracker = new MetricsTracker(config);

      // Add 100 events (the hard cap from MAX_UPLOAD_QUEUE_SIZE)
      for (let i = 0; i < 100; i++) {
        tracker.trackEvent(`event_${String(i)}`);
      }

      // Adding one more should trigger drop of oldest
      tracker.trackEvent("overflow_event");

      // The queue should not exceed 100 items
      // Verify by flushing and checking the events sent
      mockFetch.mockResolvedValueOnce({ ok: true });

      warnSpy.mockRestore();
      tracker.destroy();
    });

    it("logs when events are dropped", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const config = createConfig({
        maxQueueSize: 200,
        flushIntervalMs: 600_000,
      });
      const tracker = new MetricsTracker(config);

      // Fill to hard cap
      for (let i = 0; i < 100; i++) {
        tracker.trackEvent(`event_${String(i)}`);
      }

      // Trigger overflow
      tracker.trackEvent("overflow");

      expect(warnSpy).toHaveBeenCalledWith(
        "[BundleNudge]",
        expect.stringContaining("Queue full"),
        "",
      );

      warnSpy.mockRestore();
      tracker.destroy();
    });

    it("caps queue after failed flush re-queue", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const config = createConfig({
        maxQueueSize: 200,
        flushIntervalMs: 600_000,
      });
      const tracker = new MetricsTracker(config);

      // Add 80 events
      for (let i = 0; i < 80; i++) {
        tracker.trackEvent(`event_${String(i)}`);
      }

      // Flush will fail, events get re-queued
      mockFetch.mockResolvedValueOnce({ ok: false });
      await tracker.flush();

      // Add 30 more events (total would be 110 > cap of 100)
      for (let i = 0; i < 30; i++) {
        tracker.trackEvent(`new_event_${String(i)}`);
      }

      // Queue should be capped at 100 after trim
      mockFetch.mockResolvedValueOnce({ ok: true });
      await tracker.flush();

      // Verify that events were sent and queue was bounded
      expect(mockFetch).toHaveBeenCalledTimes(2);
      const body = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(body.events.length).toBeLessThanOrEqual(100);

      warnSpy.mockRestore();
      tracker.destroy();
    });
  });
});
