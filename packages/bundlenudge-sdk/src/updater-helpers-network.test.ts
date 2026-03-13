/**
 * Network Error Classification Tests (Fix #64)
 */

import { describe, expect, it } from "vitest";
import { type NetworkErrorType, classifyNetworkError, isNetworkError } from "./updater-helpers";

describe("classifyNetworkError", () => {
  const cases: [string, NetworkErrorType][] = [
    ["Request timed out", "timeout"],
    ["ETIMEDOUT", "timeout"],
    ["ENOTFOUND api.bundlenudge.com", "dns"],
    ["getaddrinfo ENOTFOUND", "dns"],
    ["ECONNREFUSED 127.0.0.1:443", "connection_refused"],
    ["Connection refused by server", "connection_refused"],
    ["No internet connection", "offline"],
    ["Device is offline", "offline"],
    ["Network request failed", "network_generic"],
    ["Failed to fetch", "network_generic"],
    ["Network error", "network_generic"],
    ["Some random server error", null],
    ["Invalid JSON response", null],
    ["401 Unauthorized", null],
  ];

  it.each(cases)("classifies '%s' as %s", (message, expected) => {
    expect(classifyNetworkError(message)).toBe(expected);
  });
});

describe("isNetworkError", () => {
  it("returns true for network-related errors", () => {
    expect(isNetworkError("Network request failed")).toBe(true);
    expect(isNetworkError("ETIMEDOUT")).toBe(true);
    expect(isNetworkError("ENOTFOUND")).toBe(true);
    expect(isNetworkError("ECONNREFUSED")).toBe(true);
  });

  it("returns false for non-network errors", () => {
    expect(isNetworkError("JSON parse error")).toBe(false);
    expect(isNetworkError("Invalid response")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isNetworkError("NETWORK REQUEST FAILED")).toBe(true);
    expect(isNetworkError("Timeout")).toBe(true);
  });
});
