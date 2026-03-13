/**
 * Mutex Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Mutex } from "./mutex";

describe("Mutex", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows single acquire without waiting", async () => {
    const mutex = new Mutex();
    const release = await mutex.acquire();
    expect(mutex.isLocked()).toBe(true);
    release();
    expect(mutex.isLocked()).toBe(false);
  });

  it("serializes concurrent operations", async () => {
    const mutex = new Mutex();
    const order: number[] = [];

    const task = async (id: number, delayMs: number) => {
      const release = await mutex.acquire();
      order.push(id);
      await vi.advanceTimersByTimeAsync(delayMs);
      release();
    };

    await Promise.all([task(1, 20), task(2, 10), task(3, 5)]);
    expect(order).toEqual([1, 2, 3]);
  });

  it("release is idempotent (double-release is safe)", async () => {
    const mutex = new Mutex();
    const release = await mutex.acquire();
    release();
    release(); // should not throw or corrupt state
    expect(mutex.isLocked()).toBe(false);
  });

  it("queued waiter gets lock after release", async () => {
    const mutex = new Mutex();
    const release1 = await mutex.acquire();

    let secondAcquired = false;
    const secondPromise = mutex.acquire().then((release2) => {
      secondAcquired = true;
      release2();
    });

    expect(secondAcquired).toBe(false);
    release1();
    await secondPromise;
    expect(secondAcquired).toBe(true);
    expect(mutex.isLocked()).toBe(false);
  });

  it("handles errors in critical section without deadlock", async () => {
    const mutex = new Mutex();
    const release = await mutex.acquire();

    try {
      throw new Error("simulated error");
    } catch {
      release();
    }

    // Should still be acquirable
    const release2 = await mutex.acquire();
    expect(mutex.isLocked()).toBe(true);
    release2();
  });

  it("times out when lock is held too long", async () => {
    const mutex = new Mutex(100);
    const release = await mutex.acquire();

    let caughtMessage = "";
    const acquirePromise = mutex.acquire().catch((err: unknown) => {
      caughtMessage = err instanceof Error ? err.message : String(err);
    });

    await vi.advanceTimersByTimeAsync(100);
    await acquirePromise;

    expect(caughtMessage).toBe("LOCK_TIMEOUT: Could not acquire operation lock within 100ms");

    // Mutex is still locked by the first holder
    expect(mutex.isLocked()).toBe(true);
    release();
    expect(mutex.isLocked()).toBe(false);
  });

  it("acquires lock normally when released before timeout", async () => {
    const mutex = new Mutex(500);
    const release1 = await mutex.acquire();

    const acquirePromise = mutex.acquire();

    // Release well before timeout
    await vi.advanceTimersByTimeAsync(50);
    release1();

    const release2 = await acquirePromise;
    expect(mutex.isLocked()).toBe(true);
    release2();
    expect(mutex.isLocked()).toBe(false);
  });

  it("per-call timeout overrides constructor timeout", async () => {
    const mutex = new Mutex(10_000);
    const release = await mutex.acquire();

    let caughtMessage = "";
    const acquirePromise = mutex.acquire(50).catch((err: unknown) => {
      caughtMessage = err instanceof Error ? err.message : String(err);
    });

    await vi.advanceTimersByTimeAsync(50);
    await acquirePromise;

    expect(caughtMessage).toBe("LOCK_TIMEOUT: Could not acquire operation lock within 50ms");

    release();
  });

  it("timed-out waiter is removed from queue", async () => {
    const mutex = new Mutex(50);
    const release1 = await mutex.acquire();

    // This will time out
    const timedOutPromise = mutex.acquire().catch(() => "timed-out");

    await vi.advanceTimersByTimeAsync(50);
    await timedOutPromise;

    // Release first holder, queue should be empty
    release1();
    expect(mutex.isLocked()).toBe(false);

    // New acquire should succeed immediately
    const release3 = await mutex.acquire();
    expect(mutex.isLocked()).toBe(true);
    release3();
  });
});
