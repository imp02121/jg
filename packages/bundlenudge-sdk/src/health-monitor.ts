/**
 * HealthMonitor
 *
 * Tracks critical events and endpoints, notifies CrashDetector when all pass.
 * Integrates with the dual-flag verification system (appReady + healthPassed).
 */

import type { CrashDetector } from "./crash-detector";

export interface CriticalEvent {
  name: string;
  required: boolean;
  timeoutMs?: number;
}

export interface CriticalEndpoint {
  method: "GET" | "POST" | "PUT" | "DELETE";
  url: string;
  expectedStatus: number[];
  required: boolean;
}

export interface HealthMonitorConfig {
  events: CriticalEvent[];
  endpoints: CriticalEndpoint[];
  crashDetector: CrashDetector;
  onAllPassed?: () => void;
  onEventFailed?: (name: string) => void;
  onEndpointFailed?: (endpoint: CriticalEndpoint, status: number) => void;
}

/**
 * Generate a unique key for an endpoint (method + url).
 */
function getEndpointKey(method: string, url: string): string {
  return `${method}:${url}`;
}

export class HealthMonitor {
  private passedEvents = new Set<string>();
  private passedEndpoints = new Set<string>();
  private config: HealthMonitorConfig;
  private isComplete = false;

  constructor(config: HealthMonitorConfig) {
    this.config = config;
  }

  /**
   * Report that an event fired successfully.
   * If all required events/endpoints pass, triggers verification.
   */
  reportEvent(name: string): void {
    if (this.isComplete) return;

    // Find the event in config
    const event = this.config.events.find((e) => e.name === name);
    if (!event) return; // Unknown event, ignore

    this.passedEvents.add(name);
    this.checkCompletion();
  }

  /**
   * Report an endpoint check result.
   * If status matches expected, marks endpoint as passed.
   */
  reportEndpoint(method: string, url: string, status: number): void {
    if (this.isComplete) return;

    // Find the endpoint in config
    const endpoint = this.config.endpoints.find((e) => e.method === method && e.url === url);
    if (!endpoint) return; // Unknown endpoint, ignore

    // Check if status matches expected
    if (endpoint.expectedStatus.includes(status)) {
      const key = getEndpointKey(method, url);
      this.passedEndpoints.add(key);
      this.checkCompletion();
    } else if (endpoint.required && this.config.onEndpointFailed) {
      this.config.onEndpointFailed(endpoint, status);
    }
  }

  /**
   * Check if all required events/endpoints have passed.
   */
  isFullyVerified(): boolean {
    return this.isComplete;
  }

  /**
   * Get list of missing required events.
   */
  getMissingEvents(): string[] {
    return this.config.events
      .filter((e) => e.required && !this.passedEvents.has(e.name))
      .map((e) => e.name);
  }

  /**
   * Get list of missing required endpoints.
   */
  getMissingEndpoints(): CriticalEndpoint[] {
    return this.config.endpoints.filter((e) => {
      if (!e.required) return false;
      const key = getEndpointKey(e.method, e.url);
      return !this.passedEndpoints.has(key);
    });
  }

  /**
   * Reset state (for testing or new update).
   */
  reset(): void {
    this.passedEvents.clear();
    this.passedEndpoints.clear();
    this.isComplete = false;
  }

  /**
   * Check if all required events and endpoints have passed.
   * If so, notify CrashDetector and trigger callbacks.
   */
  private checkCompletion(): void {
    if (this.isComplete) return;

    const missingEvents = this.getMissingEvents();
    const missingEndpoints = this.getMissingEndpoints();

    if (missingEvents.length === 0 && missingEndpoints.length === 0) {
      this.isComplete = true;

      // Notify CrashDetector that health checks passed
      void this.config.crashDetector.notifyHealthPassed();

      // Trigger callback if provided
      if (this.config.onAllPassed) {
        this.config.onAllPassed();
      }
    }
  }
}
