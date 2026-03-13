/**
 * Verification State Operations
 *
 * Handles verification state for safe rollback logic.
 */

import type { Storage } from "./storage";
import type { VerificationState } from "./types";

/**
 * Get current verification state.
 */
export function getVerificationState(storage: Storage): VerificationState | null {
  return storage.getMetadata().verificationState;
}

/**
 * Check if update is fully verified (both appReady and healthPassed).
 */
export function isFullyVerified(storage: Storage): boolean {
  const state = getVerificationState(storage);
  if (!state) return false;
  return state.appReady && state.healthPassed;
}

/**
 * Set app ready flag (called when notifyAppReady is invoked).
 * Sets verifiedAt timestamp when both flags become true.
 */
export async function setAppReady(storage: Storage): Promise<void> {
  const current = getVerificationState(storage);
  const healthPassed = current?.healthPassed ?? false;

  await storage.updateMetadata({
    verificationState: {
      appReady: true,
      healthPassed,
      verifiedAt: healthPassed ? Date.now() : (current?.verifiedAt ?? null),
    },
  });
}

/**
 * Set health passed flag (called when health checks pass).
 * Sets verifiedAt timestamp when both flags become true.
 */
export async function setHealthPassed(storage: Storage): Promise<void> {
  const current = getVerificationState(storage);
  const appReady = current?.appReady ?? false;
  const healthPassed = true;
  const bothTrue = appReady && healthPassed;

  await storage.updateMetadata({
    verificationState: {
      appReady,
      healthPassed,
      verifiedAt: bothTrue ? Date.now() : (current?.verifiedAt ?? null),
    },
  });
}

/**
 * Reset verification state (called after verification complete or rollback).
 */
export async function resetVerificationState(storage: Storage): Promise<void> {
  await storage.updateMetadata({ verificationState: null });
}
