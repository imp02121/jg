/** Telemetry - In-memory retry queue for failed telemetry events. */

import { API_REQUEST_TIMEOUT_MS } from "./constants";
import { logWarn } from "./debug/logger";
import { fetchWithTimeout } from "./fetch-utils";

/** Maximum number of events in the retry queue. */
const MAX_QUEUE_SIZE = 50;

/** Maximum retry attempts per event. */
const MAX_RETRIES = 3;

/** Base delay for exponential backoff (ms). */
const RETRY_BASE_DELAY_MS = 1_000;

function delaySleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

export interface TelemetryEvent {
  deviceId: string;
  appId: string;
  eventType: string;
  bundleVersion?: string | null;
  releaseId?: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

interface QueuedEvent {
  event: TelemetryEvent;
  attempts: number;
}

let queue: QueuedEvent[] = [];
let processing = false;

function getApiHeaders(accessToken: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return headers;
}

async function sendEvent(
  apiUrl: string,
  event: TelemetryEvent,
  accessToken: string | null,
): Promise<void> {
  await fetchWithTimeout(`${apiUrl}/v1/telemetry`, {
    method: "POST",
    headers: getApiHeaders(accessToken),
    body: JSON.stringify(event),
    timeout: API_REQUEST_TIMEOUT_MS,
  });
}

async function processQueue(apiUrl: string, accessToken: string | null): Promise<void> {
  if (processing || queue.length === 0) return;
  processing = true;

  try {
    while (queue.length > 0) {
      const item = queue[0];
      try {
        await sendEvent(apiUrl, item.event, accessToken);
        queue.shift();
      } catch {
        item.attempts += 1;
        if (item.attempts >= MAX_RETRIES) {
          logWarn("Telemetry event dropped after max retries", {
            eventType: item.event.eventType,
            attempts: String(item.attempts),
          });
          queue.shift();
        } else {
          const delay = RETRY_BASE_DELAY_MS * 2 ** (item.attempts - 1);
          await delaySleep(delay);
        }
      }
    }
  } finally {
    processing = false;
  }
}

/**
 * Send a telemetry event with automatic retry on failure.
 *
 * Failed events are queued in-memory and retried up to 3 times
 * with exponential backoff (1s, 2s, 4s). The queue is not persisted
 * across app restarts.
 */
export function sendTelemetry(
  apiUrl: string,
  event: TelemetryEvent,
  accessToken: string | null,
): void {
  if (queue.length >= MAX_QUEUE_SIZE) {
    logWarn("Telemetry queue full, dropping oldest event");
    queue.shift();
  }

  queue.push({ event, attempts: 0 });
  void processQueue(apiUrl, accessToken);
}

/** Clear all pending events (for testing). */
export function clearTelemetryQueue(): void {
  queue = [];
  processing = false;
}

/** Get the current queue length (for testing). */
export function getTelemetryQueueLength(): number {
  return queue.length;
}
