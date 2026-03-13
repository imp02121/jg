/**
 * Debug logging for BundleNudge SDK.
 * Logs are only emitted when debug mode is enabled. Safe to leave in production code.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
}

const MAX_LOG_HISTORY = 100;
const LOG_PREFIX = "[BundleNudge]";
let debugEnabled = false;
const logHistory: LogEntry[] = [];

export function setDebugEnabled(enabled: boolean): void {
  debugEnabled = enabled;
}
export function isDebugEnabled(): boolean {
  return debugEnabled;
}

function addToHistory(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
): LogEntry {
  const entry: LogEntry = { level, message, context, timestamp: new Date().toISOString() };
  logHistory.push(entry);
  if (logHistory.length > MAX_LOG_HISTORY) logHistory.shift();
  return entry;
}

/* eslint-disable no-console */
function emitLog(entry: LogEntry): void {
  const ctx = entry.context ?? "";
  const methods = {
    debug: console.debug,
    info: console.info,
    warn: console.warn,
    error: console.error,
  };
  methods[entry.level](LOG_PREFIX, entry.message, ctx);
}

function emitWarnOnly(message: string): void {
  console.warn(LOG_PREFIX, message, "");
}
/* eslint-enable no-console */

/** Log a debug message (only when debug enabled) */
export function logDebug(message: string, context?: Record<string, unknown>): void {
  const entry = addToHistory("debug", message, context);
  if (debugEnabled) emitLog(entry);
}

/** Log an info message (only when debug enabled) */
export function logInfo(message: string, context?: Record<string, unknown>): void {
  const entry = addToHistory("info", message, context);
  if (debugEnabled) emitLog(entry);
}

/** Log a warning (always, but with context only when debug enabled) */
export function logWarn(message: string, context?: Record<string, unknown>): void {
  const entry = addToHistory("warn", message, context);
  if (debugEnabled) {
    emitLog(entry);
  } else {
    emitWarnOnly(message);
  }
}

/** Log an error (always, with full context) */
export function logError(message: string, context?: Record<string, unknown>): void {
  emitLog(addToHistory("error", message, context));
}

/** Get recent log entries (for debugging) */
export function getRecentLogs(count?: number): LogEntry[] {
  return logHistory.slice(-(count ?? MAX_LOG_HISTORY));
}

/** Clear log history */
export function clearLogs(): void {
  logHistory.length = 0;
}
