/**
 * Endpoint Health Check Tests - HTTP Methods and Edge Cases
 *
 * Tests for different HTTP methods and edge case scenarios.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHealthCheckService } from "./health-check";
import type { EndpointHealthCheckConfig } from "./health-check";

describe("health-check HTTP methods", () => {
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

  it("supports GET method", async () => {
    mockFetch.mockResolvedValue({ status: 200, ok: true });

    const service = createService();
    const config: EndpointHealthCheckConfig = {
      enabled: true,
      endpoints: [
        {
          id: "get-endpoint",
          name: "GET Endpoint",
          url: "https://api.example.com/health",
          method: "GET",
          expectedStatus: 200,
        },
      ],
      retryCount: 0,
    };

    await service.verifyHealth(config);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.example.com/health",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("supports POST method with body", async () => {
    mockFetch.mockResolvedValue({ status: 201, ok: true });

    const service = createService();
    const config: EndpointHealthCheckConfig = {
      enabled: true,
      endpoints: [
        {
          id: "post-endpoint",
          name: "POST Endpoint",
          url: "https://api.example.com/check",
          method: "POST",
          body: JSON.stringify({ test: true }),
          expectedStatus: 201,
        },
      ],
      retryCount: 0,
    };

    await service.verifyHealth(config);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.example.com/check",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ test: true }),
      }),
    );
  });

  it("supports custom headers", async () => {
    mockFetch.mockResolvedValue({ status: 200, ok: true });

    const service = createService();
    const config: EndpointHealthCheckConfig = {
      enabled: true,
      endpoints: [
        {
          id: "custom-headers",
          name: "Custom Headers",
          url: "https://api.example.com/health",
          method: "GET",
          headers: {
            "X-Custom-Header": "custom-value",
            "X-Another-Header": "another-value",
          },
          expectedStatus: 200,
        },
      ],
      retryCount: 0,
    };

    await service.verifyHealth(config);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.example.com/health",
      expect.objectContaining({
        headers: {
          "X-Custom-Header": "custom-value",
          "X-Another-Header": "another-value",
        },
      }),
    );
  });
});

describe("health-check edge cases", () => {
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

  it("handles empty response", async () => {
    mockFetch.mockResolvedValue({ status: 204, ok: true });

    const service = createService();
    const config: EndpointHealthCheckConfig = {
      enabled: true,
      endpoints: [
        {
          id: "no-content",
          name: "No Content",
          url: "https://api.example.com/health",
          method: "GET",
          expectedStatus: 204,
        },
      ],
      retryCount: 0,
    };

    const result = await service.verifyHealth(config);

    expect(result.passed).toBe(true);
    expect(result.results[0].status).toBe("pass");
    expect(result.results[0].responseStatus).toBe(204);
  });

  it("tracks response time for each endpoint", async () => {
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
      retryCount: 0,
    };

    const result = await service.verifyHealth(config);

    expect(result.results[0].responseTimeMs).toBeGreaterThanOrEqual(0);
  });

  it("calculates total duration across all endpoints", async () => {
    mockFetch.mockResolvedValue({ status: 200, ok: true });

    const service = createService();
    const config: EndpointHealthCheckConfig = {
      enabled: true,
      endpoints: [
        {
          id: "endpoint-1",
          name: "First",
          url: "https://api.example.com/1",
          method: "GET",
          expectedStatus: 200,
        },
        {
          id: "endpoint-2",
          name: "Second",
          url: "https://api.example.com/2",
          method: "GET",
          expectedStatus: 200,
        },
      ],
      retryCount: 0,
    };

    const result = await service.verifyHealth(config);

    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("handles different expected status codes", async () => {
    mockFetch.mockResolvedValue({ status: 301, ok: false });

    const service = createService();
    const config: EndpointHealthCheckConfig = {
      enabled: true,
      endpoints: [
        {
          id: "redirect",
          name: "Redirect",
          url: "https://api.example.com/old",
          method: "GET",
          expectedStatus: 301, // Expecting redirect
        },
      ],
      retryCount: 0,
    };

    const result = await service.verifyHealth(config);

    expect(result.passed).toBe(true);
    expect(result.results[0].status).toBe("pass");
    expect(result.results[0].responseStatus).toBe(301);
  });
});
