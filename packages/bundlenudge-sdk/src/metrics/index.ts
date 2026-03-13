/**
 * Metrics Module
 *
 * Queue-based metrics tracking with session support.
 */

export { MetricsTracker } from "./tracker";
export { startSessionTracking } from "./session";
export type { SessionInfo } from "./session";

export type {
  MetricEventType,
  MetricEvent,
  VariantInfo,
  MetricsConfig,
} from "./types";

export {
  DEFAULT_FLUSH_INTERVAL_MS,
  DEFAULT_MAX_QUEUE_SIZE,
} from "./types";
