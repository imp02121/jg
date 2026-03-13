/**
 * Timeout Utils Tests
 */

import { describe, expect, it, vi } from "vitest";
import { NativeTimeoutError, withTimeout } from "./timeout-utils";

vi.useFakeTimers();

describe("withTimeout", () => {
  it("resolves if promise completes before timeout", async () => {
    const promise = Promise.resolve(42);
    const result = await withTimeout(promise, 5000);
    expect(result).toBe(42);
  });

  it("rejects with NativeTimeoutError when promise exceeds deadline", async () => {
    const neverResolve = new Promise<string>(() => {
      /* never resolves */
    });
    const wrapped = withTimeout(neverResolve, 100, "test timeout");

    vi.advanceTimersByTime(101);

    await expect(wrapped).rejects.toThrow(NativeTimeoutError);
    await expect(wrapped).rejects.toThrow("test timeout");
  });

  it("preserves original rejection if promise rejects before timeout", async () => {
    const promise = Promise.reject(new Error("original error"));
    await expect(withTimeout(promise, 5000)).rejects.toThrow("original error");
  });

  it("uses default message when none provided", async () => {
    const neverResolve = new Promise<void>(() => {
      /* never resolves */
    });
    const wrapped = withTimeout(neverResolve, 200);

    vi.advanceTimersByTime(201);

    await expect(wrapped).rejects.toThrow("Operation timed out after 200ms");
  });

  it("clamps negative timeout to 0", async () => {
    const neverResolve = new Promise<void>(() => {
      /* never resolves */
    });
    const wrapped = withTimeout(neverResolve, -100);

    vi.advanceTimersByTime(1);

    await expect(wrapped).rejects.toThrow(NativeTimeoutError);
  });

  it("exposes timeoutMs on error", async () => {
    const neverResolve = new Promise<void>(() => {
      /* never resolves */
    });
    const wrapped = withTimeout(neverResolve, 500);

    vi.advanceTimersByTime(501);

    try {
      await wrapped;
    } catch (err) {
      expect(err).toBeInstanceOf(NativeTimeoutError);
      expect((err as NativeTimeoutError).timeoutMs).toBe(500);
    }
  });
});
