/**
 * Endpoint Health Check Tests - Verify Health
 *
 * Tests for HTTP endpoint verification with multiple endpoints and status checks.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHealthCheckService } from "./health-check";
import type { EndpointHealthCheckConfig } from "./health-check";

describe("health-check verifyHealth", () => {
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

  it("returns passed=true when disabled", async () => {
    const service = createService();
    const result = await service.verifyHealth({ enabled: false, endpoints: [] });

    expect(result.passed).toBe(true);
    expect(result.results).toEqual([]);
  });

  it("returns passed=true when no endpoints", async () => {
    const service = createService();
    const result = await service.verifyHealth({ enabled: true, endpoints: [] });

    expect(result.passed).toBe(true);
  });

  it("passes when endpoint returns expected status", async () => {
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
    };

    const result = await service.verifyHealth(config);

    expect(result.passed).toBe(true);
    expect(result.results[0].status).toBe("pass");
    expect(result.results[0].responseStatus).toBe(200);
  });

  it("fails when endpoint returns unexpected status", async () => {
    mockFetch.mockResolvedValue({ status: 500, ok: false });

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
      retryCount: 0, // No retries for this test
    };

    const result = await service.verifyHealth(config);

    expect(result.passed).toBe(false);
    expect(result.results[0].status).toBe("fail");
    expect(result.results[0].responseStatus).toBe(500);
  });

  it("checks multiple endpoints sequentially", async () => {
    mockFetch
      .mockResolvedValueOnce({ status: 200, ok: true })
      .mockResolvedValueOnce({ status: 200, ok: true })
      .mockResolvedValueOnce({ status: 200, ok: true });

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
        {
          id: "endpoint-3",
          name: "Third",
          url: "https://api.example.com/3",
          method: "GET",
          expectedStatus: 200,
        },
      ],
      retryCount: 0,
    };

    const result = await service.verifyHealth(config);

    expect(result.passed).toBe(true);
    expect(result.results).toHaveLength(3);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("fails if any endpoint fails", async () => {
    mockFetch
      .mockResolvedValueOnce({ status: 200, ok: true })
      .mockResolvedValueOnce({ status: 500, ok: false })
      .mockResolvedValueOnce({ status: 200, ok: true });

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
        {
          id: "endpoint-3",
          name: "Third",
          url: "https://api.example.com/3",
          method: "GET",
          expectedStatus: 200,
        },
      ],
      retryCount: 0,
    };

    const result = await service.verifyHealth(config);

    expect(result.passed).toBe(false);
    expect(result.results[1].status).toBe("fail");
  });
});
