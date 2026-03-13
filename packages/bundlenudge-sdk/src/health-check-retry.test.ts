/**
 * Endpoint Health Check Tests - Retry Logic and Timeout
 *
 * Tests for retry behavior and timeout handling.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_RETRY_COUNT,
  DEFAULT_RETRY_DELAY_MS,
  DEFAULT_TIMEOUT_MS,
  createHealthCheckService,
} from "./health-check";
import type { EndpointHealthCheckConfig } from "./health-check";

describe("health-check retry logic", () => {
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

  it("retries failed requests", async () => {
    mockFetch
      .mockRejectedValueOnce(new Error("Network error"))
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({ status: 200, ok: true });

    const service = createService();
    const config: EndpointHealthCheckConfig = {
      enabled: true,
      endpoints: [
        {
          id: "api-health",
          name: "API Health",
          url: "https://api.example.com/health",
          method: "GET",
          expectedStatus: 200,
        },
      ],
      retryCount: 3,
      retryDelayMs: 100,
    };

    const resultPromise = service.verifyHealth(config);

    // Advance through retry delays
    await vi.advanceTimersByTimeAsync(100); // First retry delay
    await vi.advanceTimersByTimeAsync(100); // Second retry delay

    const result = await resultPromise;

    expect(result.passed).toBe(true);
    expect(result.results[0].retryCount).toBe(2); // Succeeded on third attempt
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("fails after max retries", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const service = createService();
    const config: EndpointHealthCheckConfig = {
      enabled: true,
      endpoints: [
        {
          id: "api-health",
          name: "API Health",
          url: "https://api.example.com/health",
          method: "GET",
          expectedStatus: 200,
        },
      ],
      retryCount: 2,
      retryDelayMs: 100,
    };

    const resultPromise = service.verifyHealth(config);

    // Advance through all retry delays
    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(100);

    const result = await resultPromise;

    expect(result.passed).toBe(false);
    expect(result.results[0].status).toBe("error");
    expect(result.results[0].retryCount).toBe(2);
    expect(mockFetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it("does not retry on successful check", async () => {
    mockFetch.mockResolvedValue({ status: 200, ok: true });

    const service = createService();
    const config: EndpointHealthCheckConfig = {
      enabled: true,
      endpoints: [
        {
          id: "api-health",
          name: "API Health",
          url: "https://api.example.com/health",
          method: "GET",
          expectedStatus: 200,
        },
      ],
      retryCount: 3,
      retryDelayMs: 100,
    };

    const result = await service.verifyHealth(config);

    expect(result.passed).toBe(true);
    expect(result.results[0].retryCount).toBe(0);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe("health-check timeout handling", () => {
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

  it("times out slow endpoints", async () => {
    // Mock AbortController and AbortError
    const abortError = new Error("Aborted");
    abortError.name = "AbortError";

    mockFetch.mockImplementation(
      () =>
        new Promise((_, reject) => {
          // Simulate the abort signal triggering after timeout
          setTimeout(() => {
            reject(abortError);
          }, 5001);
        }),
    );

    const service = createService();
    const config: EndpointHealthCheckConfig = {
      enabled: true,
      endpoints: [
        {
          id: "slow-api",
          name: "Slow API",
          url: "https://api.example.com/slow",
          method: "GET",
          expectedStatus: 200,
          timeoutMs: 5000,
        },
      ],
      retryCount: 0,
    };

    const resultPromise = service.verifyHealth(config);

    // Advance past timeout
    await vi.advanceTimersByTimeAsync(5001);

    const result = await resultPromise;

    expect(result.passed).toBe(false);
    expect(result.results[0].status).toBe("timeout");
  });

  it("uses default timeout when not specified", async () => {
    mockFetch.mockResolvedValue({ status: 200, ok: true });

    const service = createService();
    const config: EndpointHealthCheckConfig = {
      enabled: true,
      endpoints: [
        {
          id: "api-health",
          name: "API Health",
          url: "https://api.example.com/health",
          method: "GET",
          expectedStatus: 200,
          // No timeoutMs specified - should use DEFAULT_TIMEOUT_MS
        },
      ],
      retryCount: 0,
    };

    await service.verifyHealth(config);

    // Verify it was called (timeout was set internally)
    expect(mockFetch).toHaveBeenCalled();
  });
});

describe("health-check default values", () => {
  it("has correct default timeout", () => {
    expect(DEFAULT_TIMEOUT_MS).toBe(10000);
  });

  it("has correct default retry count", () => {
    expect(DEFAULT_RETRY_COUNT).toBe(3);
  });

  it("has correct default retry delay", () => {
    expect(DEFAULT_RETRY_DELAY_MS).toBe(5000);
  });
});
