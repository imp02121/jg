/**
 * Endpoint Health Check Tests - Report to Server
 *
 * Tests for fire-and-forget reporting functionality.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHealthCheckService } from "./health-check";

describe("health-check reportToServer", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    global.fetch = mockFetch;
    mockFetch.mockResolvedValue({ ok: true, status: 200 });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  const createService = (): ReturnType<typeof createHealthCheckService> =>
    createHealthCheckService({
      apiUrl: "https://api.bundlenudge.com",
      appId: "test-app",
      getAccessToken: () => "test-token",
    });

  it("sends report without blocking", async () => {
    const service = createService();
    const result = { passed: true, results: [], durationMs: 100 };

    // Should not throw or block
    service.reportToServer("release-123", "device-456", result);

    // Verify fetch was called
    await vi.advanceTimersByTimeAsync(0);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.bundlenudge.com/v1/health/endpoint-check",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("includes authorization header when token available", async () => {
    const service = createService();
    const result = { passed: true, results: [], durationMs: 100 };

    service.reportToServer("release-123", "device-456", result);

    await vi.advanceTimersByTimeAsync(0);
    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers.Authorization).toBe("Bearer test-token");
  });

  it("excludes authorization header when no token", async () => {
    const service = createHealthCheckService({
      apiUrl: "https://api.bundlenudge.com",
      appId: "test-app",
      getAccessToken: () => null,
    });
    const result = { passed: true, results: [], durationMs: 100 };

    service.reportToServer("release-123", "device-456", result);

    await vi.advanceTimersByTimeAsync(0);
    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers.Authorization).toBeUndefined();
  });

  it("ignores network errors (fire-and-forget)", () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const service = createService();
    const result = { passed: true, results: [], durationMs: 100 };

    // Should not throw (fire-and-forget)
    service.reportToServer("release-123", "device-456", result);
    // No assertion needed - test passes if no exception thrown
  });

  it("includes all required fields in report", async () => {
    const service = createService();
    const result = {
      passed: false,
      results: [
        {
          endpointId: "api-health",
          status: "fail" as const,
          responseStatus: 500,
          responseTimeMs: 150,
          retryCount: 2,
          errorMessage: "Server error",
        },
      ],
      durationMs: 500,
    };

    service.reportToServer("release-123", "device-456", result);

    await vi.advanceTimersByTimeAsync(0);
    const [, options] = mockFetch.mock.calls[0];
    const body = JSON.parse(options.body);

    expect(body.appId).toBe("test-app");
    expect(body.releaseId).toBe("release-123");
    expect(body.deviceId).toBe("device-456");
    expect(body.passed).toBe(false);
    expect(body.results).toHaveLength(1);
    expect(body.durationMs).toBe(500);
    expect(body.timestamp).toBeDefined();
  });
});
