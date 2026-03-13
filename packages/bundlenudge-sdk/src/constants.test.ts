/**
 * Constants Tests
 *
 * Verifies that centralized timeout constants have expected values
 * and are used consistently across the SDK.
 */

import { describe, expect, it } from "vitest";
import {
  API_REQUEST_TIMEOUT_MS,
  BUNDLE_DOWNLOAD_TIMEOUT_MS,
  DEFAULT_RETRY_BASE_DELAY_MS,
  DEFAULT_RETRY_MAX_ATTEMPTS,
  DEFAULT_RETRY_MAX_DELAY_MS,
  ENDPOINT_CHECK_TIMEOUT_MS,
  ENDPOINT_RETRY_DELAY_MS,
  HEALTH_CONFIG_FETCH_TIMEOUT_MS,
  MAX_SLEEP_MS,
  MAX_UPLOAD_QUEUE_SIZE,
} from "./constants";

describe("constants", () => {
  it("API_REQUEST_TIMEOUT_MS is 30 seconds", () => {
    expect(API_REQUEST_TIMEOUT_MS).toBe(30_000);
  });

  it("BUNDLE_DOWNLOAD_TIMEOUT_MS is 120 seconds", () => {
    expect(BUNDLE_DOWNLOAD_TIMEOUT_MS).toBe(120_000);
  });

  it("HEALTH_CONFIG_FETCH_TIMEOUT_MS is 10 seconds", () => {
    expect(HEALTH_CONFIG_FETCH_TIMEOUT_MS).toBe(10_000);
  });

  it("ENDPOINT_CHECK_TIMEOUT_MS is 10 seconds", () => {
    expect(ENDPOINT_CHECK_TIMEOUT_MS).toBe(10_000);
  });

  it("ENDPOINT_RETRY_DELAY_MS is 5 seconds", () => {
    expect(ENDPOINT_RETRY_DELAY_MS).toBe(5_000);
  });

  it("DEFAULT_RETRY_MAX_ATTEMPTS is 3", () => {
    expect(DEFAULT_RETRY_MAX_ATTEMPTS).toBe(3);
  });

  it("DEFAULT_RETRY_BASE_DELAY_MS is 1 second", () => {
    expect(DEFAULT_RETRY_BASE_DELAY_MS).toBe(1_000);
  });

  it("DEFAULT_RETRY_MAX_DELAY_MS is 30 seconds", () => {
    expect(DEFAULT_RETRY_MAX_DELAY_MS).toBe(30_000);
  });

  it("MAX_UPLOAD_QUEUE_SIZE is 100", () => {
    expect(MAX_UPLOAD_QUEUE_SIZE).toBe(100);
  });

  it("MAX_SLEEP_MS is 5 minutes", () => {
    expect(MAX_SLEEP_MS).toBe(300_000);
  });

  it("all constants are positive numbers", () => {
    const constants = [
      API_REQUEST_TIMEOUT_MS,
      BUNDLE_DOWNLOAD_TIMEOUT_MS,
      HEALTH_CONFIG_FETCH_TIMEOUT_MS,
      ENDPOINT_CHECK_TIMEOUT_MS,
      ENDPOINT_RETRY_DELAY_MS,
      DEFAULT_RETRY_MAX_ATTEMPTS,
      DEFAULT_RETRY_BASE_DELAY_MS,
      DEFAULT_RETRY_MAX_DELAY_MS,
      MAX_UPLOAD_QUEUE_SIZE,
      MAX_SLEEP_MS,
    ];
    for (const c of constants) {
      expect(c).toBeGreaterThan(0);
    }
  });
});
