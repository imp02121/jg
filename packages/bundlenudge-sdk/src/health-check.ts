/**
 * Endpoint Health Check Service
 *
 * Verifies HTTP endpoints after bundle updates.
 * Can trigger LOCAL rollback without server dependency.
 */

import {
  API_REQUEST_TIMEOUT_MS,
  ENDPOINT_CHECK_TIMEOUT_MS,
  ENDPOINT_RETRY_DELAY_MS,
} from "./constants";
import { fetchWithTimeout } from "./fetch-utils";

export interface EndpointHealthCheckConfig {
  enabled: boolean;
  endpoints: EndpointConfig[];
  retryCount?: number; // default: 3
  retryDelayMs?: number; // default: 5000
}

export interface EndpointConfig {
  id: string;
  name: string;
  url: string;
  method: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string;
  expectedStatus: number;
  timeoutMs?: number; // default: 10000
}

export interface EndpointResult {
  endpointId: string;
  status: "pass" | "fail" | "timeout" | "error";
  responseStatus?: number;
  responseTimeMs: number;
  errorMessage?: string;
  retryCount: number;
}

export interface EndpointHealthCheckResult {
  passed: boolean;
  results: EndpointResult[];
  durationMs: number;
}

// =============================================================================
// Constants
// =============================================================================

export const DEFAULT_TIMEOUT_MS = ENDPOINT_CHECK_TIMEOUT_MS;
export const DEFAULT_RETRY_COUNT = 3;
export const DEFAULT_RETRY_DELAY_MS = ENDPOINT_RETRY_DELAY_MS;

// =============================================================================
// Service Configuration
// =============================================================================

export interface HealthCheckServiceConfig {
  apiUrl: string;
  appId: string;
  getAccessToken: () => string | null;
}

// =============================================================================
// Factory Function
// =============================================================================

export function createHealthCheckService(config: HealthCheckServiceConfig): HealthCheckService {
  return new HealthCheckService(config);
}

// =============================================================================
// Health Check Service
// =============================================================================

export class HealthCheckService {
  private config: HealthCheckServiceConfig;

  constructor(config: HealthCheckServiceConfig) {
    this.config = config;
  }

  async verifyHealth(checkConfig: EndpointHealthCheckConfig): Promise<EndpointHealthCheckResult> {
    if (!checkConfig.enabled || checkConfig.endpoints.length === 0) {
      return { passed: true, results: [], durationMs: 0 };
    }

    const startTime = Date.now();
    const results: EndpointResult[] = [];
    const retryCount = checkConfig.retryCount ?? DEFAULT_RETRY_COUNT;
    const retryDelayMs = checkConfig.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;

    for (const endpoint of checkConfig.endpoints) {
      const result = await this.checkEndpointWithRetries(endpoint, retryCount, retryDelayMs);
      results.push(result);
    }

    const passed = results.every((r) => r.status === "pass");
    const durationMs = Date.now() - startTime;

    return { passed, results, durationMs };
  }

  private async checkEndpointWithRetries(
    endpoint: EndpointConfig,
    maxRetries: number,
    retryDelayMs: number,
  ): Promise<EndpointResult> {
    // First attempt (always runs)
    let lastResult = await this.checkEndpoint(endpoint);
    lastResult.retryCount = 0;

    if (lastResult.status === "pass") {
      return lastResult;
    }

    // Retry attempts
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      await this.sleep(retryDelayMs);

      const result = await this.checkEndpoint(endpoint);
      result.retryCount = attempt;
      lastResult = result;

      if (result.status === "pass") {
        return result;
      }
    }

    return lastResult;
  }

  private async checkEndpoint(endpoint: EndpointConfig): Promise<EndpointResult> {
    const timeoutMs = endpoint.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, timeoutMs);

      const fetchOptions: RequestInit = {
        method: endpoint.method,
        headers: endpoint.headers,
        signal: controller.signal,
      };

      if (endpoint.method === "POST" && endpoint.body) {
        fetchOptions.body = endpoint.body;
      }

      const response = await fetch(endpoint.url, fetchOptions);
      clearTimeout(timeoutId);
      const responseTimeMs = Date.now() - startTime;

      if (response.status === endpoint.expectedStatus) {
        return {
          endpointId: endpoint.id,
          status: "pass",
          responseStatus: response.status,
          responseTimeMs,
          retryCount: 0,
        };
      }

      return {
        endpointId: endpoint.id,
        status: "fail",
        responseStatus: response.status,
        responseTimeMs,
        errorMessage: `Expected ${String(endpoint.expectedStatus)}, got ${String(response.status)}`,
        retryCount: 0,
      };
    } catch (error) {
      const responseTimeMs = Date.now() - startTime;

      if (error instanceof Error && error.name === "AbortError") {
        return {
          endpointId: endpoint.id,
          status: "timeout",
          responseTimeMs,
          errorMessage: `Timeout after ${String(timeoutMs)}ms`,
          retryCount: 0,
        };
      }

      return {
        endpointId: endpoint.id,
        status: "error",
        responseTimeMs,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        retryCount: 0,
      };
    }
  }

  /** Fire-and-forget server reporting */
  reportToServer(releaseId: string, deviceId: string, result: EndpointHealthCheckResult): void {
    this.sendReport(releaseId, deviceId, result).catch(() => {
      // Fire-and-forget: ignore errors
    });
  }

  private async sendReport(
    releaseId: string,
    deviceId: string,
    result: EndpointHealthCheckResult,
  ): Promise<void> {
    const accessToken = this.config.getAccessToken();

    await fetchWithTimeout(`${this.config.apiUrl}/v1/health/endpoint-check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
      body: JSON.stringify({
        appId: this.config.appId,
        releaseId,
        deviceId,
        passed: result.passed,
        results: result.results,
        durationMs: result.durationMs,
        timestamp: new Date().toISOString(),
      }),
      timeout: API_REQUEST_TIMEOUT_MS,
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
