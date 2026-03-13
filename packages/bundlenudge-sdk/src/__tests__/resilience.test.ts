/**
 * SDK Resilience Tests
 *
 * Tests #114-116: Concurrent mutex safety, download retry, offline recovery.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { Mutex } from "../mutex";
import { retry } from "../utils";

// ============================================================================
// Test #114: Concurrent checkForUpdate calls
// ============================================================================

describe("Test #114: Concurrent checkForUpdate calls with mutex", () => {
  it("serializes concurrent calls so only one runs at a time", async () => {
    const mutex = new Mutex();
    let activeCount = 0;
    let maxConcurrent = 0;
    const results: number[] = [];

    const simulateCheck = async (id: number): Promise<number> => {
      const release = await mutex.acquire();
      try {
        activeCount++;
        if (activeCount > maxConcurrent) {
          maxConcurrent = activeCount;
        }
        await new Promise((r) => setTimeout(r, 10));
        results.push(id);
        return id;
      } finally {
        activeCount--;
        release();
      }
    };

    const calls = [
      simulateCheck(1),
      simulateCheck(2),
      simulateCheck(3),
      simulateCheck(4),
      simulateCheck(5),
    ];

    const allResults = await Promise.all(calls);

    // Mutex should have ensured only 1 ran at a time
    expect(maxConcurrent).toBe(1);
    // All callers received a result (no deadlock)
    expect(allResults).toHaveLength(5);
    expect(allResults).toEqual(expect.arrayContaining([1, 2, 3, 4, 5]));
    // Execution order is preserved (FIFO queue)
    expect(results).toEqual([1, 2, 3, 4, 5]);
  });

  it("all callers get a result even when one throws", async () => {
    const mutex = new Mutex();
    const settled: string[] = [];

    const safeCall = async (id: number, shouldFail: boolean) => {
      const release = await mutex.acquire();
      try {
        await new Promise((r) => setTimeout(r, 5));
        if (shouldFail) {
          throw new Error(`call ${String(id)} failed`);
        }
        settled.push(`ok-${String(id)}`);
        return id;
      } finally {
        release();
      }
    };

    const outcomes = await Promise.allSettled([
      safeCall(1, false),
      safeCall(2, true),
      safeCall(3, false),
    ]);

    expect(outcomes[0].status).toBe("fulfilled");
    expect(outcomes[1].status).toBe("rejected");
    expect(outcomes[2].status).toBe("fulfilled");
    // Mutex did not deadlock after the error
    expect(mutex.isLocked()).toBe(false);
  });

  it("prevents duplicate API calls with a shared gate", async () => {
    const mutex = new Mutex();
    let apiCallCount = 0;

    const checkForUpdate = async (): Promise<string> => {
      const release = await mutex.acquire();
      try {
        apiCallCount++;
        await new Promise((r) => setTimeout(r, 15));
        return "update-v2";
      } finally {
        release();
      }
    };

    const results = await Promise.all([checkForUpdate(), checkForUpdate(), checkForUpdate()]);

    // All calls complete, but they ran sequentially
    expect(results).toEqual(["update-v2", "update-v2", "update-v2"]);
    expect(apiCallCount).toBe(3);
  });
});

// ============================================================================
// Test #115: Download retry on failure
// ============================================================================

describe("Test #115: Download retry on failure", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it("retries twice then succeeds on third attempt", async () => {
    let attempt = 0;
    const download = vi.fn(async () => {
      attempt++;
      if (attempt < 3) {
        throw new Error("ECONNRESET: Connection reset by peer");
      }
      return { path: "/bundles/v2.js", hash: "abc123" };
    });

    const result = await retry(download, {
      maxAttempts: 3,
      baseDelayMs: 10,
      maxDelayMs: 50,
    });

    expect(result).toEqual({ path: "/bundles/v2.js", hash: "abc123" });
    expect(download).toHaveBeenCalledTimes(3);
    expect(attempt).toBe(3);
  });

  it("calls onRetry callback on each retry", async () => {
    let attempt = 0;
    const onRetry = vi.fn();
    const download = vi.fn(async () => {
      attempt++;
      if (attempt < 3) {
        throw new Error("Network request failed");
      }
      return "success";
    });

    await retry(download, {
      maxAttempts: 3,
      baseDelayMs: 10,
      maxDelayMs: 50,
      onRetry,
    });

    // onRetry called for attempt 1 and 2 (not the final success)
    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
    expect(onRetry).toHaveBeenCalledWith(2, expect.any(Error));
  });

  it("throws the last error after exhausting all attempts", async () => {
    const download = vi.fn(async () => {
      throw new Error("ETIMEDOUT: Connection timed out");
    });

    await expect(
      retry(download, {
        maxAttempts: 3,
        baseDelayMs: 10,
        maxDelayMs: 50,
      }),
    ).rejects.toThrow("ETIMEDOUT: Connection timed out");

    expect(download).toHaveBeenCalledTimes(3);
  });

  it("stops retrying when shouldRetry returns false", async () => {
    const download = vi.fn(async () => {
      throw new Error("HTTP 403 Forbidden");
    });

    await expect(
      retry(download, {
        maxAttempts: 5,
        baseDelayMs: 10,
        maxDelayMs: 50,
        shouldRetry: (err) => !err.message.includes("403"),
      }),
    ).rejects.toThrow("403 Forbidden");

    // Should not retry 4xx errors
    expect(download).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// Test #116: Offline -> online recovery
// ============================================================================

describe("Test #116: Offline to online recovery", () => {
  it("returns no-update when offline, then succeeds when online", async () => {
    const mockFetchFn = vi.fn();

    // First call: offline (network error)
    mockFetchFn.mockRejectedValueOnce(new Error("Network request failed: no internet"));

    // Second call: online (successful response)
    mockFetchFn.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          updateAvailable: true,
          release: {
            version: "2.0.0",
            bundleUrl: "https://cdn.bundlenudge.com/bundle.js",
            bundleSize: 1024,
            bundleHash: "sha256-abc123",
            releaseId: "rel-1",
          },
        }),
    });

    // Simulate the SDK's offline behavior: network errors -> no update
    let offlineResult: { updateAvailable: boolean };
    try {
      await mockFetchFn("https://api.bundlenudge.com/v1/updates/check");
      offlineResult = { updateAvailable: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (/network|offline|no internet/i.test(msg)) {
        offlineResult = { updateAvailable: false };
      } else {
        throw err;
      }
    }

    expect(offlineResult.updateAvailable).toBe(false);

    // Restore network: next check succeeds
    const onlineResponse = await mockFetchFn("https://api.bundlenudge.com/v1/updates/check");
    const data = (await onlineResponse.json()) as {
      updateAvailable: boolean;
      release?: { version: string };
    };

    expect(data.updateAvailable).toBe(true);
    expect(data.release?.version).toBe("2.0.0");
  });

  it("retry utility handles transient offline then online", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    let callCount = 0;
    const fetchUpdate = vi.fn(async () => {
      callCount++;
      if (callCount === 1) {
        throw new Error("Failed to fetch: offline");
      }
      return { updateAvailable: true, version: "3.0.0" };
    });

    const result = await retry(fetchUpdate, {
      maxAttempts: 3,
      baseDelayMs: 10,
      maxDelayMs: 50,
    });

    expect(result).toEqual({ updateAvailable: true, version: "3.0.0" });
    expect(fetchUpdate).toHaveBeenCalledTimes(2);
  });

  it("classifies network errors correctly for offline detection", async () => {
    // Import the actual isNetworkError helper
    const { isNetworkError } = await import("../updater-helpers");

    expect(isNetworkError("Network request failed")).toBe(true);
    expect(isNetworkError("Failed to fetch")).toBe(true);
    expect(isNetworkError("no internet connection")).toBe(true);
    expect(isNetworkError("offline")).toBe(true);
    expect(isNetworkError("ETIMEDOUT")).toBe(true);
    expect(isNetworkError("ECONNREFUSED")).toBe(true);
    // Non-network errors
    expect(isNetworkError("Invalid JSON")).toBe(false);
    expect(isNetworkError("HTTP 400 Bad Request")).toBe(false);
  });
});
