/**
 * Utility Functions
 *
 * Common utilities used throughout the BundleNudge SDK.
 * All functions are designed to be safe and handle edge cases.
 */

import {
  DEFAULT_RETRY_BASE_DELAY_MS,
  DEFAULT_RETRY_MAX_ATTEMPTS,
  DEFAULT_RETRY_MAX_DELAY_MS,
  MAX_SLEEP_MS,
} from "./constants";
import { getSecureJitter } from "./crypto-utils";

// Re-export crypto utilities for backward compatibility
export { generateDeviceId, sha256 } from "./crypto-utils";

/**
 * Sleep for a given duration.
 *
 * @param ms - Duration in milliseconds (clamped to 0-300000)
 * @returns Promise that resolves after the duration
 */
export function sleep(ms: number): Promise<void> {
  // Clamp to valid range (0 to 5 minutes)
  const clampedMs = Math.max(0, Math.min(ms, MAX_SLEEP_MS));
  return new Promise((resolve) => setTimeout(resolve, clampedMs));
}

/**
 * Options for retry behavior.
 */
export interface RetryOptions {
  /** Maximum number of attempts (default: 3, max: 10) */
  maxAttempts?: number;
  /** Base delay in ms for exponential backoff (default: 1000) */
  baseDelayMs?: number;
  /** Maximum delay cap in ms (default: 30000) */
  maxDelayMs?: number;
  /** Optional callback for each retry attempt */
  onRetry?: (attempt: number, error: Error) => void;
  /** Predicate to determine if an error is retryable (default: retries all errors) */
  shouldRetry?: (error: Error) => boolean;
}

/**
 * Retry a function with exponential backoff and jitter.
 *
 * Uses exponential backoff with random jitter to avoid thundering herd.
 * Backoff formula: min(baseDelay * 2^(attempt-1) + jitter, maxDelay)
 *
 * @param fn - Async function to retry
 * @param options - Retry configuration
 * @returns Result of successful function call
 * @throws Last error if all attempts fail
 *
 * @example
 * ```typescript
 * const response = await retry(
 *   () => fetch('https://api.example.com/data'),
 *   { maxAttempts: 3, baseDelayMs: 1000 }
 * );
 * ```
 */
export async function retry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const {
    maxAttempts = DEFAULT_RETRY_MAX_ATTEMPTS,
    baseDelayMs = DEFAULT_RETRY_BASE_DELAY_MS,
    maxDelayMs = DEFAULT_RETRY_MAX_DELAY_MS,
    onRetry,
    shouldRetry,
  } = options;

  // Clamp maxAttempts to valid range (1-10)
  const clampedMaxAttempts = Math.max(1, Math.min(maxAttempts, 10));

  let lastError: Error = new Error("BundleNudge: Retry failed with no attempts");

  for (let attempt = 1; attempt <= clampedMaxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if error is retryable (if predicate provided)
      if (shouldRetry && !shouldRetry(lastError)) {
        break;
      }

      if (attempt === clampedMaxAttempts) {
        break;
      }

      // Notify retry callback if provided
      onRetry?.(attempt, lastError);

      // Exponential backoff with jitter (secure random)
      const jitter = getSecureJitter(1000);
      const delay = Math.min(baseDelayMs * 2 ** (attempt - 1) + jitter, maxDelayMs);

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Default retry predicate for HTTP errors.
 * Retries on 5xx server errors and network errors, but NOT on 4xx client errors.
 */
export function isRetryableError(error: Error): boolean {
  const message = error.message;
  // Network errors are retryable
  if (/network|timeout|ECONNREFUSED|ECONNRESET|EPIPE|fetch failed/i.test(message)) {
    return true;
  }
  // Extract HTTP status code from error message
  const statusMatch = /\b([45]\d{2})\b/.exec(message);
  if (statusMatch) {
    const status = Number.parseInt(statusMatch[1], 10);
    return status >= 500;
  }
  // Default: retry unknown errors
  return true;
}

/**
 * Compare two semantic version strings.
 *
 * Compares major.minor.patch components numerically.
 * Missing components are treated as 0.
 *
 * @param a - First version string (e.g., "1.2.3")
 * @param b - Second version string (e.g., "1.2.4")
 * @returns -1 if a < b, 0 if a == b, 1 if a > b
 *
 * @example
 * ```typescript
 * compareSemver('1.0.0', '1.0.1')  // -1
 * compareSemver('2.0.0', '1.9.9')  // 1
 * compareSemver('1.0', '1.0.0')    // 0
 * ```
 */
export function compareSemver(a: string, b: string): number {
  // Handle empty strings
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;

  const partsA = a.split(".").map((p) => {
    const num = Number.parseInt(p, 10);
    return Number.isNaN(num) ? 0 : num;
  });
  const partsB = b.split(".").map((p) => {
    const num = Number.parseInt(p, 10);
    return Number.isNaN(num) ? 0 : num;
  });

  for (let i = 0; i < 3; i++) {
    const diff = (partsA[i] || 0) - (partsB[i] || 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }

  return 0;
}

/**
 * Convert ArrayBuffer to base64 string.
 *
 * Used for passing binary data to native modules.
 * Processes in chunks to avoid call stack overflow on large buffers.
 *
 * @param buffer - The ArrayBuffer to convert
 * @returns Base64-encoded string
 *
 * @example
 * ```typescript
 * const response = await fetch(url);
 * const buffer = await response.arrayBuffer();
 * const base64 = arrayBufferToBase64(buffer);
 * ```
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  if (buffer.byteLength === 0) {
    return "";
  }

  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 8192; // Process in chunks to avoid call stack issues

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }

  // Use btoa which is available in React Native via JavaScriptCore/Hermes
  return btoa(binary);
}

/**
 * Check if a value is a non-empty string.
 *
 * @param value - The value to check
 * @returns true if value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Safely parse a JSON string.
 *
 * @param json - The JSON string to parse
 * @returns Parsed value or null if parsing fails
 */
export function safeJsonParse(json: string): unknown {
  try {
    return JSON.parse(json) as unknown;
  } catch {
    return null;
  }
}
