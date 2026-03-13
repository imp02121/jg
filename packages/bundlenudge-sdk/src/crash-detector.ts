/**
 * CrashDetector - Detects crashes after OTA updates and triggers automatic rollback.
 * Features: crash counting within time window, auto-rollback after threshold, dual-flag verification.
 */

import {
  type CrashDetectorConfig,
  DEFAULT_CRASH_THRESHOLD,
  DEFAULT_CRASH_WINDOW_MS,
  DEFAULT_STABILITY_WINDOW_MS,
  DEFAULT_VERIFICATION_WINDOW_MS,
  clampVerificationWindow,
} from "./crash-detector-types";
import type { Storage } from "./storage";

// Re-export types and constants for backward compatibility
export {
  type CrashDetectorConfig,
  DEFAULT_CRASH_THRESHOLD,
  DEFAULT_CRASH_WINDOW_MS,
  DEFAULT_VERIFICATION_WINDOW_MS,
  DEFAULT_STABILITY_WINDOW_MS,
} from "./crash-detector-types";

/** Detects crashes after OTA updates and manages automatic rollback. */
export class CrashDetector {
  private storage: Storage;
  private config: CrashDetectorConfig;
  private verificationTimer: ReturnType<typeof setTimeout> | null = null;
  private stabilityTimer: ReturnType<typeof setTimeout> | null = null;
  private isVerifying = false;
  private verificationComplete = false;
  private verifyLock = false;

  constructor(storage: Storage, config: CrashDetectorConfig) {
    this.storage = storage;
    this.config = config;
  }

  /**
   * Check for crash on app start.
   *
   * If we crashed after an update within the crash time window
   * and exceed the threshold, trigger automatic rollback.
   *
   * @returns true if rollback was triggered, false otherwise
   */
  async checkForCrash(): Promise<boolean> {
    const metadata = this.storage.getMetadata();
    const threshold = this.config.crashThreshold ?? DEFAULT_CRASH_THRESHOLD;
    const windowMs = this.config.crashWindowMs ?? DEFAULT_CRASH_WINDOW_MS;

    // Check if we have a previous version to rollback to
    if (!metadata.previousVersion) {
      return false;
    }

    // If we have a pending update flag but no pending version,
    // it means we crashed before applying the update properly
    if (metadata.pendingUpdateFlag && !metadata.pendingVersion) {
      return false; // No crash, just incomplete state
    }

    // Check if last crash was within the window
    const now = Date.now();
    const lastCrashTime = metadata.lastCrashTime;

    if (lastCrashTime && now - lastCrashTime < windowMs) {
      // Crash within window - increment and check threshold
      const crashCount = await this.storage.recordCrash();

      if (this.config.onCrashReported) {
        this.config.onCrashReported(crashCount);
      }

      if (crashCount >= threshold) {
        await this.config.onRollback();
        return true;
      }
    } else if (lastCrashTime) {
      // Crash outside window - reset count
      await this.storage.clearCrashCount();
    }

    return false;
  }

  /**
   * Start the verification window timer.
   *
   * Call this after loading a new OTA bundle. The verification window
   * gives the app time to prove it's working before the rollback
   * capability is removed.
   *
   * Note: This only starts if there's a previous version to rollback to.
   */
  startVerificationWindow(): void {
    if (this.isVerifying) return;

    const metadata = this.storage.getMetadata();

    // Only verify if we have a previous version to rollback to
    if (!metadata.previousVersion) {
      return;
    }

    this.isVerifying = true;
    const windowMs = this.config.verificationWindowMs ?? DEFAULT_VERIFICATION_WINDOW_MS;
    const clampedWindowMs = clampVerificationWindow(windowMs);

    this.verificationTimer = setTimeout(() => {
      this.handleVerificationTimeout();
    }, clampedWindowMs);
  }

  /**
   * Mark the app as ready (main UI has rendered successfully).
   *
   * This is one of two conditions required for update verification.
   * Both notifyAppReady() and notifyHealthPassed() must be called
   * before the update is considered verified.
   */
  async notifyAppReady(): Promise<void> {
    if (!this.isVerifying || this.verificationComplete) return;

    await this.storage.setAppReady();
    this.startStabilityTimer();
    await this.checkVerificationComplete();
  }

  async notifyHealthPassed(): Promise<void> {
    if (!this.isVerifying || this.verificationComplete) return;

    await this.storage.setHealthPassed();
    await this.checkVerificationComplete();
  }

  /**
   * Check if verification is currently in progress.
   */
  isVerificationInProgress(): boolean {
    return this.isVerifying;
  }

  /**
   * Check if verification has completed successfully.
   */
  isVerificationCompleted(): boolean {
    return this.verificationComplete;
  }

  /**
   * Check if both verification conditions are met.
   * Only clears previousVersion when BOTH appReady AND healthPassed are true.
   */
  private async checkVerificationComplete(): Promise<void> {
    if (this.verificationComplete || this.verifyLock) return;
    this.verifyLock = true;
    try {
      const state = this.storage.getVerificationState();
      if (!state || !state.appReady || !state.healthPassed) return;
      this.verificationComplete = true;
      if (this.verificationTimer) {
        clearTimeout(this.verificationTimer);
        this.verificationTimer = null;
      }
      this.isVerifying = false;
      await this.storage.clearCrashCount();
      await this.storage.resetVerificationState();
      await this.config.onVerified();
    } finally {
      this.verifyLock = false;
    }
  }

  /**
   * Start the stability timer after notifyAppReady() is called.
   * When the timer fires, the update is considered stable and
   * onStabilityConfirmed is called (e.g., to clean up old bundles).
   */
  private startStabilityTimer(): void {
    if (this.stabilityTimer) return;

    const windowMs = this.config.stabilityWindowMs ?? DEFAULT_STABILITY_WINDOW_MS;

    this.stabilityTimer = setTimeout(() => {
      this.stabilityTimer = null;
      this.config.onStabilityConfirmed?.();
    }, windowMs);
  }

  /**
   * Stop verification and clean up timers.
   *
   * Call this when the app is unmounting or when you need to
   * cancel the verification window (e.g., before a manual rollback).
   */
  stop(): void {
    if (this.verificationTimer) {
      clearTimeout(this.verificationTimer);
      this.verificationTimer = null;
    }
    if (this.stabilityTimer) {
      clearTimeout(this.stabilityTimer);
      this.stabilityTimer = null;
    }
    this.isVerifying = false;
  }

  /**
   * Reset the crash detector state.
   *
   * Use this when starting a new update cycle or for testing.
   */
  reset(): void {
    this.stop();
    this.verificationComplete = false;
    this.verifyLock = false;
  }

  /**
   * Handle verification timeout.
   * IMPORTANT: Does NOT call onVerified or clear previousVersion.
   * The timeout only stops waiting - verification must come from both
   * appReady AND healthPassed flags being true.
   * This prevents the dangerous behavior of prematurely clearing
   * previousVersion when health checks haven't actually passed.
   */
  private handleVerificationTimeout(): void {
    this.isVerifying = false;
    this.verificationTimer = null;
    // Note: previousVersion is intentionally NOT cleared here.
    // It will only be cleared when checkVerificationComplete() succeeds.
    // This ensures we can still rollback if the app crashes later.
  }
}
