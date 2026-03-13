/**
 * CrashDetector Types and Constants
 *
 * Extracted from crash-detector.ts to keep file sizes manageable.
 */

/** Default number of crashes before triggering rollback */
export const DEFAULT_CRASH_THRESHOLD = 3;

/** Default time window for crash counting (10 seconds) */
export const DEFAULT_CRASH_WINDOW_MS = 10_000;

/** Default verification window (60 seconds) */
export const DEFAULT_VERIFICATION_WINDOW_MS = 60_000;

/** Default stability window after notifyAppReady (30 seconds) */
export const DEFAULT_STABILITY_WINDOW_MS = 30_000;

/** Minimum verification window (1 second) */
export const MIN_VERIFICATION_WINDOW_MS = 1_000;

/** Maximum verification window (5 minutes) */
export const MAX_VERIFICATION_WINDOW_MS = 300_000;

/**
 * Configuration for the CrashDetector.
 */
export interface CrashDetectorConfig {
  /**
   * Verification window in milliseconds.
   * The time allowed for the app to prove it's working.
   * Default: 60000 (60 seconds)
   */
  verificationWindowMs?: number;

  /**
   * Number of crashes within the crash window before triggering rollback.
   * Default: 3
   */
  crashThreshold?: number;

  /**
   * Time window for crash counting in milliseconds.
   * Crashes outside this window reset the count.
   * Default: 10000 (10 seconds)
   */
  crashWindowMs?: number;

  /**
   * Stability window in milliseconds after notifyAppReady() is called.
   * If the app survives this window, the update is considered stable.
   * Default: 30000 (30 seconds)
   */
  stabilityWindowMs?: number;

  /**
   * Callback when rollback is triggered.
   * Must return a Promise that resolves after rollback completes.
   */
  onRollback: () => Promise<void>;

  /**
   * Callback when update is verified as stable.
   * Called after both appReady and healthPassed are true.
   */
  onVerified: () => Promise<void>;

  /**
   * Callback when the stability window passes after notifyAppReady().
   * Called once after the app has been stable for stabilityWindowMs.
   */
  onStabilityConfirmed?: () => Promise<void>;

  /**
   * Optional callback for crash telemetry.
   * Called each time a crash is recorded.
   */
  onCrashReported?: (crashCount: number) => void;
}

/**
 * Clamp verification window to safe bounds.
 * Ensures window is at least 1 second and at most 5 minutes.
 */
export function clampVerificationWindow(windowMs: number): number {
  return Math.max(MIN_VERIFICATION_WINDOW_MS, Math.min(windowMs, MAX_VERIFICATION_WINDOW_MS));
}
