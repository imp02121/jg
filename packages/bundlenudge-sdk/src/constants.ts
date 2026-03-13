/**
 * SDK Constants
 *
 * Centralized timeout and configuration constants used across the SDK.
 * All timeout values are in milliseconds.
 */

/** Default timeout for API requests (update check, telemetry, etc.) */
export const API_REQUEST_TIMEOUT_MS = 30_000;

/** Timeout for bundle downloads (larger payload) */
export const BUNDLE_DOWNLOAD_TIMEOUT_MS = 120_000;

/** Timeout for health config fetch */
export const HEALTH_CONFIG_FETCH_TIMEOUT_MS = 10_000;

/** Default timeout for individual endpoint health checks */
export const ENDPOINT_CHECK_TIMEOUT_MS = 10_000;

/** Default retry delay for endpoint health checks */
export const ENDPOINT_RETRY_DELAY_MS = 5_000;

/** Maximum number of retry attempts for update check/download */
export const DEFAULT_RETRY_MAX_ATTEMPTS = 3;

/** Base delay for exponential backoff retries */
export const DEFAULT_RETRY_BASE_DELAY_MS = 1_000;

/** Maximum delay cap for exponential backoff */
export const DEFAULT_RETRY_MAX_DELAY_MS = 30_000;

/** Maximum bounded upload queue size */
export const MAX_UPLOAD_QUEUE_SIZE = 100;

/** Sleep clamp maximum (5 minutes) */
export const MAX_SLEEP_MS = 300_000;

/** Minimum free disk space buffer beyond bundle size (50 MB) */
export const DISK_SPACE_BUFFER_BYTES = 50 * 1024 * 1024;
