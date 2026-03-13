/**
 * Mutex - Simple async mutex for preventing concurrent operations.
 *
 * Provides a lock mechanism where the second caller waits for the
 * first to finish before proceeding. Used to prevent race conditions
 * in operations like checkForUpdate and downloadAndInstall.
 */

/** Default timeout for acquiring the mutex lock (30 seconds). */
const DEFAULT_ACQUIRE_TIMEOUT_MS = 30_000;

/**
 * A simple async mutex that serializes access to a critical section.
 *
 * @example
 * ```typescript
 * const mutex = new Mutex();
 * const release = await mutex.acquire();
 * try {
 *   await criticalSection();
 * } finally {
 *   release();
 * }
 * ```
 */
export class Mutex {
  private queue: (() => void)[] = [];
  private locked = false;
  private timeoutMs: number;

  constructor(timeoutMs = DEFAULT_ACQUIRE_TIMEOUT_MS) {
    this.timeoutMs = timeoutMs;
  }

  /**
   * Acquire the lock. If already locked, waits until released
   * or the timeout expires.
   * @param timeoutMs - Override the default timeout for this call.
   * @returns A release function that MUST be called when done.
   * @throws Error with code LOCK_TIMEOUT if lock is not acquired in time.
   */
  async acquire(timeoutMs?: number): Promise<() => void> {
    if (!this.locked) {
      this.locked = true;
      return this.createRelease();
    }

    const deadline = timeoutMs ?? this.timeoutMs;

    return new Promise<() => void>((resolve, reject) => {
      let settled = false;

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        const idx = this.queue.indexOf(waiter);
        if (idx !== -1) this.queue.splice(idx, 1);
        reject(
          new Error(`LOCK_TIMEOUT: Could not acquire operation lock within ${String(deadline)}ms`),
        );
      }, deadline);

      const waiter = (): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(this.createRelease());
      };

      this.queue.push(waiter);
    });
  }

  /** Check if the mutex is currently locked. */
  isLocked(): boolean {
    return this.locked;
  }

  private createRelease(): () => void {
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const next = this.queue.shift();
      if (next) {
        next();
      } else {
        this.locked = false;
      }
    };
  }
}
