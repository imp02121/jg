/**
 * Health Config Fetcher Tests
 *
 * Tests for fetching health configuration with fail-safe design.
 * The fetcher should never throw and return default config on any error.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONFIG_FETCH_TIMEOUT_MS,
  DEFAULT_HEALTH_CONFIG,
  HealthConfigFetcher,
  createHealthConfigFetcher,
} from "./health-config";
import type { HealthConfig, HealthConfigFetcherConfig } from "./health-config";

describe("health-config", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  const createFetcher = (overrides?: Partial<HealthConfigFetcherConfig>): HealthConfigFetcher =>
    createHealthConfigFetcher({
      apiUrl: "https://api.bundlenudge.com",
      appId: "test-app-123",
      getAccessToken: () => "test-token",
      ...overrides,
    });

  const validConfig: HealthConfig = {
    events: [
      { name: "app_ready", required: true, timeoutMs: 5000 },
      { name: "data_loaded", required: false, timeoutMs: 10000 },
    ],
    endpoints: [
      {
        method: "GET",
        url: "https://api.example.com/health",
        expectedStatus: [200],
        required: true,
      },
      {
        method: "POST",
        url: "https://api.example.com/check",
        expectedStatus: [200, 201],
        required: false,
      },
    ],
  };

  describe("fetchConfig - successful fetch", () => {
    it("returns parsed config from wrapped API response", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ config: validConfig }),
      });

      const fetcher = createFetcher();
      const result = await fetcher.fetchConfig();

      expect(result).toEqual(validConfig);
    });

    it("returns parsed config from legacy flat response", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(validConfig),
      });

      const fetcher = createFetcher();
      const result = await fetcher.fetchConfig();

      expect(result).toEqual(validConfig);
    });

    it("calls correct API endpoint", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ config: validConfig }),
      });

      const fetcher = createFetcher();
      await fetcher.fetchConfig();

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.bundlenudge.com/v1/apps/test-app-123/health-config",
        expect.objectContaining({
          method: "GET",

          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: "Bearer test-token",
          }),
        }),
      );
    });

    it("includes authorization header when token available", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ config: validConfig }),
      });

      const fetcher = createFetcher({
        getAccessToken: () => "my-secret-token",
      });
      await fetcher.fetchConfig();

      const calls = mockFetch.mock.calls as [string, { headers: Record<string, string> }][];
      const [, options] = calls[0];
      expect(options.headers.Authorization).toBe("Bearer my-secret-token");
    });

    it("excludes authorization header when no token", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ config: validConfig }),
      });

      const fetcher = createFetcher({ getAccessToken: () => null });
      await fetcher.fetchConfig();

      const calls = mockFetch.mock.calls as [
        string,
        { headers: Record<string, string | undefined> },
      ][];
      const [, options] = calls[0];
      expect(options.headers.Authorization).toBeUndefined();
    });
  });

  describe("fetchConfig - 404 error", () => {
    it("returns default config on 404", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: "Not found" }),
      });

      const fetcher = createFetcher();
      const result = await fetcher.fetchConfig();

      expect(result).toEqual(DEFAULT_HEALTH_CONFIG);
    });
  });

  describe("fetchConfig - network error", () => {
    it("returns default config on network error", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const fetcher = createFetcher();
      const result = await fetcher.fetchConfig();

      expect(result).toEqual(DEFAULT_HEALTH_CONFIG);
    });

    it("returns default config on connection refused", async () => {
      mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));

      const fetcher = createFetcher();
      const result = await fetcher.fetchConfig();

      expect(result).toEqual(DEFAULT_HEALTH_CONFIG);
    });
  });

  describe("fetchConfig - unauthorized", () => {
    it("returns default config on 401", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: "Unauthorized" }),
      });

      const fetcher = createFetcher();
      const result = await fetcher.fetchConfig();

      expect(result).toEqual(DEFAULT_HEALTH_CONFIG);
    });

    it("returns default config on 403", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ error: "Forbidden" }),
      });

      const fetcher = createFetcher();
      const result = await fetcher.fetchConfig();

      expect(result).toEqual(DEFAULT_HEALTH_CONFIG);
    });
  });

  describe("fetchConfig - timeout", () => {
    it("returns default config on timeout", async () => {
      const abortError = new Error("Aborted");
      abortError.name = "AbortError";

      mockFetch.mockImplementation(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => {
              reject(abortError);
            }, CONFIG_FETCH_TIMEOUT_MS + 100);
          }),
      );

      const fetcher = createFetcher();
      const resultPromise = fetcher.fetchConfig();

      await vi.advanceTimersByTimeAsync(CONFIG_FETCH_TIMEOUT_MS + 100);

      const result = await resultPromise;

      expect(result).toEqual(DEFAULT_HEALTH_CONFIG);
    });
  });

  describe("fetchConfig - config parsing", () => {
    it("returns config with empty arrays (wrapped)", async () => {
      const emptyConfig: HealthConfig = { events: [], endpoints: [] };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ config: emptyConfig }),
      });

      const fetcher = createFetcher();
      const result = await fetcher.fetchConfig();

      expect(result).toEqual(emptyConfig);
    });

    it("returns config with empty arrays (flat/legacy)", async () => {
      const emptyConfig: HealthConfig = { events: [], endpoints: [] };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(emptyConfig),
      });

      const fetcher = createFetcher();
      const result = await fetcher.fetchConfig();

      expect(result).toEqual(emptyConfig);
    });

    it("returns default config on invalid JSON", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.reject(new SyntaxError("Unexpected token")),
      });

      const fetcher = createFetcher();
      const result = await fetcher.fetchConfig();

      expect(result).toEqual(DEFAULT_HEALTH_CONFIG);
    });

    it("returns default config when events is not an array", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ events: "invalid", endpoints: [] }),
      });

      const fetcher = createFetcher();
      const result = await fetcher.fetchConfig();

      expect(result).toEqual(DEFAULT_HEALTH_CONFIG);
    });

    it("returns default config when endpoints is not an array", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ events: [], endpoints: null }),
      });

      const fetcher = createFetcher();
      const result = await fetcher.fetchConfig();

      expect(result).toEqual(DEFAULT_HEALTH_CONFIG);
    });

    it("returns default config when event is missing required fields", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            events: [{ name: "test" }], // missing required and timeoutMs
            endpoints: [],
          }),
      });

      const fetcher = createFetcher();
      const result = await fetcher.fetchConfig();

      expect(result).toEqual(DEFAULT_HEALTH_CONFIG);
    });

    it("returns default config when endpoint has invalid method", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            events: [],
            endpoints: [
              {
                method: "PATCH", // Invalid method
                url: "https://api.example.com/health",
                expectedStatus: [200],
                required: true,
              },
            ],
          }),
      });

      const fetcher = createFetcher();
      const result = await fetcher.fetchConfig();

      expect(result).toEqual(DEFAULT_HEALTH_CONFIG);
    });

    it("returns default config when endpoint expectedStatus is not array", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            events: [],
            endpoints: [
              {
                method: "GET",
                url: "https://api.example.com/health",
                expectedStatus: 200, // Should be array
                required: true,
              },
            ],
          }),
      });

      const fetcher = createFetcher();
      const result = await fetcher.fetchConfig();

      expect(result).toEqual(DEFAULT_HEALTH_CONFIG);
    });

    it("accepts all valid HTTP methods", async () => {
      const configWithAllMethods: HealthConfig = {
        events: [],
        endpoints: [
          { method: "GET", url: "/get", expectedStatus: [200], required: true },
          {
            method: "POST",
            url: "/post",
            expectedStatus: [201],
            required: true,
          },
          { method: "PUT", url: "/put", expectedStatus: [200], required: true },
          {
            method: "DELETE",
            url: "/delete",
            expectedStatus: [204],
            required: true,
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ config: configWithAllMethods }),
      });

      const fetcher = createFetcher();
      const result = await fetcher.fetchConfig();

      expect(result).toEqual(configWithAllMethods);
    });
  });

  describe("fetchConfig - server errors", () => {
    it("returns default config on 500", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "Internal server error" }),
      });

      const fetcher = createFetcher();
      const result = await fetcher.fetchConfig();

      expect(result).toEqual(DEFAULT_HEALTH_CONFIG);
    });

    it("returns default config on 503", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        json: () => Promise.resolve({ error: "Service unavailable" }),
      });

      const fetcher = createFetcher();
      const result = await fetcher.fetchConfig();

      expect(result).toEqual(DEFAULT_HEALTH_CONFIG);
    });
  });

  describe("DEFAULT_HEALTH_CONFIG", () => {
    it("has empty events array", () => {
      expect(DEFAULT_HEALTH_CONFIG.events).toEqual([]);
    });

    it("has empty endpoints array", () => {
      expect(DEFAULT_HEALTH_CONFIG.endpoints).toEqual([]);
    });

    it("is immutable reference", () => {
      expect(DEFAULT_HEALTH_CONFIG).toEqual({ events: [], endpoints: [] });
    });
  });

  describe("CONFIG_FETCH_TIMEOUT_MS", () => {
    it("has correct timeout value", () => {
      expect(CONFIG_FETCH_TIMEOUT_MS).toBe(10_000);
    });
  });

  describe("createHealthConfigFetcher", () => {
    it("creates fetcher instance", () => {
      const fetcher = createHealthConfigFetcher({
        apiUrl: "https://api.example.com",
        appId: "my-app",
        getAccessToken: () => null,
      });

      expect(fetcher).toBeInstanceOf(HealthConfigFetcher);
    });
  });
});
