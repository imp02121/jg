/**
 * Metrics Types
 *
 * Type definitions for the metrics tracking system.
 */

export type MetricEventType = "session" | "crash" | "engagement" | "custom" | "performance";

export interface MetricEvent {
  type: MetricEventType;
  name: string;
  value?: number;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface VariantInfo {
  id: string;
  name: string;
  isControl: boolean;
}

export interface MetricsConfig {
  apiUrl: string;
  appId: string;
  deviceId: string;
  getAccessToken: () => string | null;
  /** Flush interval in milliseconds (default: 30000) */
  flushIntervalMs?: number;
  /** Maximum queue size before auto-flush (default: 50) */
  maxQueueSize?: number;
  /** Enable debug logging (default: false) */
  debug?: boolean;
}

/** Default flush interval: 30 seconds */
export const DEFAULT_FLUSH_INTERVAL_MS = 30_000;

/** Default max queue size: 50 events */
export const DEFAULT_MAX_QUEUE_SIZE = 50;
