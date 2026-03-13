/**
 * SDK Error Classes
 *
 * Categorized error types for better error handling and retries.
 *
 * @created 2026-02-03
 */

/**
 * Base error class for SDK errors
 */
export class SDKError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(code: string, message: string, retryable = false) {
    super(message);
    this.name = "SDKError";
    this.code = code;
    this.retryable = retryable;
  }
}

/**
 * Network-related errors (timeout, connection failed, etc.)
 * These are typically retryable.
 */
export class NetworkError extends SDKError {
  readonly context?: Record<string, unknown>;

  constructor(message: string, retryable = true, context?: Record<string, unknown>) {
    super("NETWORK_ERROR", message, retryable);
    this.name = "NetworkError";
    this.context = context;
  }
}

/**
 * Validation errors (invalid response format, missing fields, etc.)
 * These are NOT retryable as they indicate a bug or API mismatch.
 */
export class ValidationError extends SDKError {
  constructor(message: string) {
    super("VALIDATION_ERROR", message, false);
    this.name = "ValidationError";
  }
}

/**
 * Storage errors (failed to read/write bundle, etc.)
 * These may be retryable depending on the underlying cause.
 */
export class StorageError extends SDKError {
  constructor(message: string, retryable = false) {
    super("STORAGE_ERROR", message, retryable);
    this.name = "StorageError";
  }
}

/**
 * Configuration errors (missing API key, invalid config, etc.)
 * These are NOT retryable as they require configuration changes.
 */
export class ConfigurationError extends SDKError {
  constructor(message: string) {
    super("CONFIGURATION_ERROR", message, false);
    this.name = "ConfigurationError";
  }
}

/**
 * Update errors (failed to apply update, checksum mismatch, etc.)
 */
export class UpdateError extends SDKError {
  constructor(message: string, retryable = true) {
    super("UPDATE_ERROR", message, retryable);
    this.name = "UpdateError";
  }
}

/**
 * Server errors (5xx responses from API)
 * These are typically retryable.
 */
export class ServerError extends SDKError {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super("SERVER_ERROR", message, true);
    this.name = "ServerError";
    this.statusCode = statusCode;
  }
}

/**
 * Fingerprint mismatch errors (runtime native fingerprint does not match expected).
 * These are NOT retryable as they indicate a native binary change is needed.
 */
export class FingerprintMismatchError extends SDKError {
  constructor(message: string) {
    super("FINGERPRINT_MISMATCH", message, false);
    this.name = "FingerprintMismatchError";
  }
}

/**
 * Client errors (4xx responses from API)
 * These are NOT retryable as they indicate a client-side issue.
 */
export class ClientError extends SDKError {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super("CLIENT_ERROR", message, false);
    this.name = "ClientError";
    this.statusCode = statusCode;
  }
}
