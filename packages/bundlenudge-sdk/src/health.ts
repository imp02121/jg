/**
 * Event-Based Health Monitoring
 *
 * Privacy-first: sends ZERO network calls when healthy.
 * Only reports failures when critical events don't fire within the time window.
 */

import { API_REQUEST_TIMEOUT_MS } from "./constants";
import { fetchWithTimeout } from "./fetch-utils";

export interface HealthCheckConfig {
  /** Critical events that must fire within the window */
  events: string[];
  /** Time window in milliseconds (default: 30000 = 30 seconds) */
  windowMs?: number;
  /** Failure threshold for server-side auto-rollback (default: 0.05 = 5%) */
  failureThreshold?: number;
}

export interface HealthFailureReport {
  releaseId: string;
  deviceId: string;
  missingEvents: string[];
  firedEvents: string[];
  timestamp: string;
  appVersion?: string;
  osVersion?: string;
}

export interface HealthMonitoringState {
  isActive: boolean;
  events: string[];
  firedEvents: string[];
  remainingMs: number;
}

export const DEFAULT_HEALTH_WINDOW_MS = 30_000; // 30 seconds
export const DEFAULT_HEALTH_FAILURE_THRESHOLD = 0.05; // 5%

interface HealthMonitorInternal {
  events: Set<string>;
  firedEvents: Set<string>;
  timer: ReturnType<typeof setTimeout> | null;
  startTime: number;
  windowMs: number;
  releaseId: string;
  deviceId: string;
  apiUrl: string;
  accessToken: string | null;
  appVersion?: string;
  osVersion?: string;
}

let currentMonitor: HealthMonitorInternal | null = null;

/**
 * Start health monitoring for a release.
 * PRIVACY: If all events fire, NO network call is made. Only failures reported.
 */
export function startHealthMonitoring(
  config: HealthCheckConfig,
  releaseId: string,
  deviceId: string,
  apiUrl: string,
  accessToken: string | null,
  appVersion?: string,
  osVersion?: string,
): void {
  // Stop any existing monitoring
  stopHealthMonitoring();

  if (config.events.length === 0) {
    return; // No events to monitor
  }

  const windowMs = config.windowMs ?? DEFAULT_HEALTH_WINDOW_MS;

  currentMonitor = {
    events: new Set(config.events),
    firedEvents: new Set(),
    timer: null,
    startTime: Date.now(),
    windowMs,
    releaseId,
    deviceId,
    apiUrl,
    accessToken,
    appVersion,
    osVersion,
  };

  // Start the timeout
  currentMonitor.timer = setTimeout(() => {
    void handleHealthTimeout();
  }, windowMs);
}

/** Report that an event has fired. If all events fire, monitoring stops with NO network call. */
export function reportHealthEvent(eventName: string): void {
  if (!currentMonitor) return;

  // Ignore unknown events
  if (!currentMonitor.events.has(eventName)) {
    return;
  }

  currentMonitor.firedEvents.add(eventName);

  // Check if all events have fired
  if (currentMonitor.firedEvents.size >= currentMonitor.events.size) {
    // SUCCESS: All events fired, cancel timer, NO network call
    stopHealthMonitoring();
  }
}

/** Stop health monitoring. Cancels any pending timeout. Safe to call multiple times. */
export function stopHealthMonitoring(): void {
  if (!currentMonitor) return;

  if (currentMonitor.timer) {
    clearTimeout(currentMonitor.timer);
  }

  currentMonitor = null;
}

/** Check if health monitoring is currently active. */
export function isHealthMonitoringActive(): boolean {
  return currentMonitor !== null;
}

/** Get the current state of health monitoring (for debugging). */
export function getHealthMonitoringState(): HealthMonitoringState | null {
  if (!currentMonitor) return null;

  const elapsed = Date.now() - currentMonitor.startTime;
  const remaining = Math.max(0, currentMonitor.windowMs - elapsed);

  return {
    isActive: true,
    events: Array.from(currentMonitor.events),
    firedEvents: Array.from(currentMonitor.firedEvents),
    remainingMs: remaining,
  };
}

/** Handle timeout - the ONLY path that makes a network call. */
async function handleHealthTimeout(): Promise<void> {
  const monitor = currentMonitor;
  if (!monitor) return;

  const missingEvents = Array.from(monitor.events).filter(
    (event) => !monitor.firedEvents.has(event),
  );

  if (missingEvents.length === 0) {
    // All events fired (race condition safety)
    stopHealthMonitoring();
    return;
  }

  // FAILURE: Report missing events (single network call)
  await reportHealthFailure(monitor, missingEvents);

  stopHealthMonitoring();
}

/** Send failure report to server (fire-and-forget). */
async function reportHealthFailure(
  monitor: HealthMonitorInternal,
  missingEvents: string[],
): Promise<void> {
  const report: HealthFailureReport = {
    releaseId: monitor.releaseId,
    deviceId: monitor.deviceId,
    missingEvents,
    firedEvents: Array.from(monitor.firedEvents),
    timestamp: new Date().toISOString(),
    appVersion: monitor.appVersion,
    osVersion: monitor.osVersion,
  };

  try {
    await fetchWithTimeout(`${monitor.apiUrl}/v1/health/failure`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(monitor.accessToken && {
          Authorization: `Bearer ${monitor.accessToken}`,
        }),
      },
      body: JSON.stringify(report),
      timeout: API_REQUEST_TIMEOUT_MS,
    });
  } catch {
    // Fire-and-forget: ignore network errors
    // The failure was already recorded locally
  }
}
