/**
 * BundleNudge SDK
 *
 * React Native SDK for OTA updates.
 */

export { BundleNudge, isValidApiUrl } from "./bundlenudge";
export { Storage } from "./storage";
export { Updater } from "./updater";
export { RollbackManager } from "./rollback-manager";
export { CrashDetector } from "./crash-detector";
export { VersionGuard } from "./version-guard";
export { BundleValidator } from "./bundle-validator";
export { CircuitBreaker } from "./circuit-breaker";
export type { BlacklistedRelease } from "./circuit-breaker";

// React hooks
export { useBundleNudge, useCodePush, useBundleVersion } from "./hooks";
export type { UseBundleNudgeResult, BundleNudgeStatus } from "./hooks";
export { useInAppMessage } from "./hooks";
export type { UseInAppMessageResult } from "./hooks";

// Setup utilities
export {
  setupBundleNudge,
  setupCodePush,
  getBundleNudgeStatus,
  recordCrash,
} from "./setup";
export { withBundleNudge, withCodePush } from "./setup/hoc";
export type { SetupOptions, BundleNudgeDebugStatus } from "./setup";

// Health monitoring exports
export {
  startHealthMonitoring,
  reportHealthEvent,
  stopHealthMonitoring,
  isHealthMonitoringActive,
  getHealthMonitoringState,
  DEFAULT_HEALTH_WINDOW_MS,
  DEFAULT_HEALTH_FAILURE_THRESHOLD,
} from "./health";

// Endpoint health check exports
export {
  HealthCheckService,
  createHealthCheckService,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_RETRY_COUNT,
  DEFAULT_RETRY_DELAY_MS,
} from "./health-check";

// HealthMonitor - integrates with CrashDetector dual-flag verification
export { HealthMonitor } from "./health-monitor";
export type {
  CriticalEvent,
  CriticalEndpoint,
  HealthMonitorConfig,
} from "./health-monitor";

// Health config fetcher - fetches config from API
export {
  HealthConfigFetcher,
  createHealthConfigFetcher,
  DEFAULT_HEALTH_CONFIG,
  CONFIG_FETCH_TIMEOUT_MS,
} from "./health-config";
export type {
  HealthConfig,
  HealthConfigFetcherConfig,
  CriticalEvent as HealthConfigEvent,
  CriticalEndpoint as HealthConfigEndpoint,
} from "./health-config";

export type { BundleNudgeCallbacks, BundleReleaseInfo } from "./bundlenudge";
export type {
  BundleNudgeConfig,
  UpdateStatus,
  UpdateInfo,
  DownloadProgress,
  UpdateCheckResult,
} from "./types";
export type {
  HealthCheckConfig,
  HealthFailureReport,
  HealthMonitoringState,
} from "./health";

// Endpoint health check types
export type {
  EndpointHealthCheckConfig,
  EndpointConfig,
  EndpointResult,
  EndpointHealthCheckResult,
  HealthCheckServiceConfig,
} from "./health-check";

// Crash reporter integrations
export {
  tagCrashReporters,
  tagSentry,
  tagBugsnag,
  tagCrashlytics,
  clearCrashReporterTags,
} from "./integrations";
export type { ReleaseMetadata, TaggingResult } from "./integrations";

// Metrics tracking
export { MetricsTracker } from "./metrics";
export { startSessionTracking } from "./metrics";
export type {
  MetricEventType,
  MetricEvent,
  VariantInfo,
  MetricsConfig,
} from "./metrics";

// Background/preload downloads
export { PreloadManager, preloadUpdate } from "./background";
export { getDeviceConditions, shouldDownload } from "./background";
export type {
  DeviceConditions,
  PreloadConfig,
  PreloadResult,
} from "./background";

// Upload client (CLI/CI)
export { UploadClient, uploadBundle } from "./upload";
export type {
  UploadConfig,
  UploadOptions,
  UploadResult,
  UploadJobStatus,
} from "./upload";

// Debug utilities
export {
  setDebugEnabled,
  isDebugEnabled,
  logDebug,
  logInfo,
  logWarn,
  logError,
  getRecentLogs,
  clearLogs,
} from "./debug";
export type { LogLevel, LogEntry } from "./debug";

// Native helpers
export {
  restartApp,
  clearAllUpdates,
  notifyAppReady,
  getCurrentBundlePath,
  hasPendingUpdate,
  getNativeInfo,
} from "./native";
export type { RestartOptions, NativeInfo } from "./native";

// Version guard types
export type { AppVersionInfo, VersionGuardConfig } from "./version-guard";

// Bundle validation types
export type {
  BundleValidatorConfig,
  ValidationResult,
} from "./bundle-validator";

// Targeting & variants
export {
  collectDeviceInfo,
  collectOsVersion,
  collectLocale,
  collectTimezone,
  collectDeviceModel,
  createVariantManager,
  getVariant,
  setVariant,
  clearVariant,
  isControlGroup,
  loadVariant,
} from "./targeting";
export type { VariantManager } from "./targeting";

// Constraints & version utilities
export {
  compareVersions,
  isVersionGte,
  isVersionLte,
  isVersionInRange,
  parseVersion,
  evaluateConstraints,
  checkMandatoryUpdate,
  getMandatoryMessage,
  checkAppStoreUpdate,
  shouldBlockApp,
  shouldRedirectToStore,
} from "./constraints";
export type {
  ParsedVersion,
  UpdateConstraints,
  DeviceContext,
  EvaluationResult,
  MandatoryUpdateConfig,
  MandatoryUpdateState,
  MandatoryUpdateData,
  AppStoreUpdateResponse,
  AppStoreUpdateState,
} from "./constraints";
