/**
 * Timeout utilities for wrapping async operations with a deadline.
 */

/** Error thrown when an operation exceeds its timeout. */
export class NativeTimeoutError extends Error {
  readonly timeoutMs: number;

  constructor(timeoutMs: number, message?: string) {
    super(message ?? `Operation timed out after ${String(timeoutMs)}ms`);
    this.name = "NativeTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Wrap a promise with a timeout. Rejects with NativeTimeoutError if
 * the promise does not resolve within the given deadline.
 *
 * @param promise - The promise to wrap
 * @param timeoutMs - Maximum time to wait in milliseconds
 * @param message - Optional custom error message
 * @returns The resolved value of the promise
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message?: string,
): Promise<T> {
  const clamped = Math.max(0, Math.min(timeoutMs, 300_000));

  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new NativeTimeoutError(clamped, message));
    }, clamped);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}
