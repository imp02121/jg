/**
 * Constraint Evaluator
 *
 * Evaluates if a device can receive an update based on constraints.
 * Used by SDK to filter updates client-side for better UX.
 */

import { isVersionGte, isVersionInRange } from "./version";

/**
 * Constraints that determine which devices can receive an update.
 */
export interface UpdateConstraints {
  /** Minimum app version required (inclusive) */
  minAppVersion?: string;
  /** Maximum app version allowed (inclusive) */
  maxAppVersion?: string;
  /** Minimum OS version required (inclusive) */
  minOsVersion?: string;
  /** Allowed platforms (defaults to all if not specified) */
  platforms?: ("ios" | "android")[];
}

/**
 * Device context for constraint evaluation.
 */
export interface DeviceContext {
  /** Current app version installed on device */
  appVersion: string;
  /** Current OS version on device */
  osVersion: string;
  /** Device platform */
  platform: "ios" | "android";
}

/**
 * Result of constraint evaluation.
 */
export interface EvaluationResult {
  /** Whether the device is eligible for the update */
  eligible: boolean;
  /** Human-readable explanation if not eligible */
  reason?: string;
}

/**
 * Evaluate if a device meets all update constraints.
 *
 * Checks constraints in order of likelihood to fail:
 * 1. Platform match
 * 2. App version range
 * 3. OS version minimum
 *
 * @param constraints - Update constraints to evaluate
 * @param device - Device context to evaluate against
 * @returns Evaluation result with eligibility and reason
 */
export function evaluateConstraints(
  constraints: UpdateConstraints,
  device: DeviceContext,
): EvaluationResult {
  // Check platform constraint
  if (constraints.platforms && constraints.platforms.length > 0) {
    if (!constraints.platforms.includes(device.platform)) {
      return {
        eligible: false,
        reason: `This update is not available for ${device.platform}`,
      };
    }
  }

  // Check app version range
  const { minAppVersion, maxAppVersion } = constraints;
  if (!isVersionInRange(device.appVersion, minAppVersion, maxAppVersion)) {
    if (minAppVersion && maxAppVersion) {
      return {
        eligible: false,
        reason: `App version ${device.appVersion} is outside range ${minAppVersion} - ${maxAppVersion}`,
      };
    }
    if (minAppVersion) {
      return {
        eligible: false,
        reason: `App version ${device.appVersion} is below minimum ${minAppVersion}`,
      };
    }
    if (maxAppVersion) {
      return {
        eligible: false,
        reason: `App version ${device.appVersion} is above maximum ${maxAppVersion}`,
      };
    }
  }

  // Check OS version minimum
  if (constraints.minOsVersion) {
    if (!isVersionGte(device.osVersion, constraints.minOsVersion)) {
      return {
        eligible: false,
        reason: `OS version ${device.osVersion} is below minimum ${constraints.minOsVersion}`,
      };
    }
  }

  return { eligible: true };
}
