/**
 * BundleNudge Updates Error Classification Tests (Fix #68)
 */

import { describe, expect, it, vi } from "vitest";
import { ClassifiedError, type SdkErrorType, classifyError } from "./bundlenudge-updates";

describe("classifyError", () => {
  const cases: [string, SdkErrorType][] = [
    ["Request timed out", "timeout"],
    ["ETIMEDOUT", "timeout"],
    ["Network request failed", "network"],
    ["ECONNREFUSED 127.0.0.1:443", "network"],
    ["ENOTFOUND api.bundlenudge.com", "network"],
    ["No internet connection", "network"],
    ["Update check failed (500 Internal Server Error)", "server"],
    ["Update check failed (401 Unauthorized)", "server"],
    ["Update check failed (429 Too Many Requests)", "server"],
    ["Something unexpected happened", "unknown"],
    ["Invalid JSON in response", "unknown"],
  ];

  it.each(cases)("classifies '%s' as '%s'", (message, expectedType) => {
    const error = new Error(message);
    const classified = classifyError(error);
    expect(classified).toBeInstanceOf(ClassifiedError);
    expect(classified.errorType).toBe(expectedType);
  });

  it("preserves original error message", () => {
    const original = new Error("Network request failed");
    const classified = classifyError(original);
    expect(classified.message).toBe("Network request failed");
  });

  it("preserves original stack trace", () => {
    const original = new Error("test");
    const classified = classifyError(original);
    expect(classified.stack).toBe(original.stack);
  });

  it("is an instance of Error", () => {
    const classified = classifyError(new Error("test"));
    expect(classified).toBeInstanceOf(Error);
  });
});

describe("checkForUpdate error classification", () => {
  it("passes ClassifiedError to onError callback", async () => {
    const { checkForUpdate } = await import("./bundlenudge-updates");
    const onError = vi.fn();

    const ctx = {
      config: { appId: "test" },
      callbacks: { onError },
      updater: {
        checkForUpdate: vi.fn().mockRejectedValue(new Error("Network request failed")),
      },
      storage: {
        getMetadata: vi.fn().mockReturnValue({ lastCheckTime: null }),
        updateMetadata: vi.fn().mockResolvedValue(undefined),
      },
      setStatus: vi.fn(),
      restartApp: vi.fn(),
    };

    await expect(
      checkForUpdate(ctx as unknown as Parameters<typeof checkForUpdate>[0]),
    ).rejects.toThrow();

    expect(onError).toHaveBeenCalledTimes(1);
    const passedError = onError.mock.calls[0][0];
    expect(passedError).toBeInstanceOf(ClassifiedError);
    expect(passedError.errorType).toBe("network");
  });
});
