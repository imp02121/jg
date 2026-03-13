import { API_REQUEST_TIMEOUT_MS, MAX_UPLOAD_QUEUE_SIZE } from "../constants";
import { logWarn } from "../debug/logger";
import { fetchWithTimeout } from "../fetch-utils";
/**
 * Metrics Tracker - Queue-based metrics tracking with automatic batching.
 */
import type { MetricEvent, MetricEventType, MetricsConfig, VariantInfo } from "./types";
import { DEFAULT_FLUSH_INTERVAL_MS, DEFAULT_MAX_QUEUE_SIZE } from "./types";

export class MetricsTracker {
  private config: MetricsConfig;
  private queue: MetricEvent[] = [];
  private variant: VariantInfo | null = null;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private isDestroyed = false;

  constructor(config: MetricsConfig) {
    this.config = config;
    this.startFlushTimer();
  }

  setVariant(variant: VariantInfo): void {
    this.variant = variant;
  }
  getVariant(): VariantInfo | null {
    return this.variant;
  }
  isControlGroup(): boolean {
    return this.variant?.isControl ?? false;
  }

  trackEvent(name: string, value?: number, metadata?: Record<string, unknown>): void {
    this.addToQueue("custom", name, value, metadata);
  }

  trackPerformance(name: string, durationMs: number): void {
    this.addToQueue("performance", name, durationMs);
  }

  async trackCrash(error: Error, metadata?: Record<string, unknown>): Promise<void> {
    const payload = {
      appId: this.config.appId,
      deviceId: this.config.deviceId,
      error: error.message,
      stack: error.stack ?? "",
      metadata: {
        ...metadata,
        variantId: this.variant?.id,
        variantName: this.variant?.name,
      },
      timestamp: new Date().toISOString(),
    };
    await this.sendRequest("/v1/metrics/crash", payload);
  }

  async flush(): Promise<void> {
    if (this.queue.length === 0) return;
    const events = [...this.queue];
    this.queue = [];

    const payload = {
      appId: this.config.appId,
      deviceId: this.config.deviceId,
      events,
      variantId: this.variant?.id,
    };

    const success = await this.sendRequest("/v1/metrics/report", payload);
    if (!success) {
      this.queue = [...events, ...this.queue];
      const hardCap = MAX_UPLOAD_QUEUE_SIZE;
      if (this.queue.length > hardCap) {
        const dropped = this.queue.length - hardCap;
        this.queue = this.queue.slice(dropped);
        logWarn(
          `MetricsTracker: Queue overflow on re-queue, dropped ${String(dropped)} oldest events`,
        );
      }
    }
  }

  destroy(): void {
    this.isDestroyed = true;
    this.stopFlushTimer();
    this.queue = [];
    this.variant = null;
  }

  private addToQueue(
    type: MetricEventType,
    name: string,
    value?: number,
    metadata?: Record<string, unknown>,
  ): void {
    if (this.isDestroyed) return;

    // Enforce hard cap to prevent unbounded memory growth when offline
    const hardCap = MAX_UPLOAD_QUEUE_SIZE;
    if (this.queue.length >= hardCap) {
      const dropped = this.queue.length - hardCap + 1;
      this.queue = this.queue.slice(dropped);
      logWarn(`MetricsTracker: Queue full, dropped ${String(dropped)} oldest events`);
    }

    this.queue.push({
      type,
      name,
      value,
      metadata,
      timestamp: new Date().toISOString(),
    });
    const maxSize = this.config.maxQueueSize ?? DEFAULT_MAX_QUEUE_SIZE;
    if (this.queue.length >= maxSize) void this.flush();
  }

  private startFlushTimer(): void {
    const interval = this.config.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS;
    this.flushTimer = setInterval(() => void this.flush(), interval);
  }

  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  private async sendRequest(path: string, payload: unknown): Promise<boolean> {
    try {
      const token = this.config.getAccessToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetchWithTimeout(`${this.config.apiUrl}${path}`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        timeout: API_REQUEST_TIMEOUT_MS,
      });
      return response.ok;
    } catch {
      // Silently fail - metrics are non-critical
      return false;
    }
  }
}
