/**
 * BundleValidator
 *
 * Validates bundle integrity by comparing stored hashes with actual file hashes.
 * Detects corruption and removes invalid bundles to prevent loading bad code.
 *
 * Security: This is a critical component that prevents execution of corrupted
 * or tampered bundles. Always validate before loading OTA updates.
 */

import { normalizeHash } from "./crypto-utils";
import { logWarn } from "./debug/logger";
import type { Storage } from "./storage";

/**
 * Configuration for the BundleValidator.
 */
export interface BundleValidatorConfig {
  /**
   * Function to calculate the SHA-256 hash of a file.
   * Should return a hex-encoded hash string.
   */
  hashFile: (path: string) => Promise<string>;

  /**
   * Function to check if a file exists on disk.
   * When provided, used to distinguish "unavailable" from "hash_mismatch".
   */
  fileExists?: (path: string) => Promise<boolean>;

  /**
   * Optional callback when validation fails.
   * Use this for logging or telemetry.
   *
   * @param version - The bundle version that failed validation
   * @param expected - The expected hash from storage
   * @param actual - The actual hash computed from the file
   */
  onValidationFailed?: (version: string, expected: string, actual: string) => void;

  /**
   * Allow bundles that cannot be verified to load.
   *
   * SECURITY WARNING: When true, bundles without stored hashes or when
   * hash verification is unavailable (e.g., native module missing) will
   * be allowed to load WITHOUT verification.
   *
   * This should only be set to true for:
   * - Development/testing environments
   * - Migration from older SDK versions that didn't store hashes
   * - When native hashing module is known to be unavailable
   *
   * @default false (bundles MUST be verifiable)
   */
  allowLegacyBundles?: boolean;
}

/**
 * Detailed result of a bundle validation check.
 */
export interface ValidationResult {
  /** Whether the bundle is valid and safe to load */
  valid: boolean;
  /**
   * Reason for the validation result:
   * - hash_match: Bundle hash matches expected value
   * - legacy_bundle: No stored hash (pre-validation bundle), allowed only if allowLegacyBundles is true
   * - hash_mismatch: Hash does not match, bundle is corrupted
   * - verification_unavailable: Hash verification not possible (native module unavailable)
   * - no_stored_hash: No hash stored for this bundle version
   */
  reason?:
    | "hash_match"
    | "legacy_bundle"
    | "hash_mismatch"
    | "unavailable"
    | "verification_unavailable"
    | "no_stored_hash";
}

/**
 * Validates bundle hashes before execution to detect corruption.
 *
 * @example
 * ```typescript
 * const validator = new BundleValidator(storage, {
 *   hashFile: (path) => nativeModule.hashFile(path),
 *   onValidationFailed: (version, expected, actual) => {
 *     console.error(`Bundle ${version} corrupted!`);
 *   },
 * });
 *
 * const isValid = await validator.validateBundle('1.2.0', '/path/to/bundle.js');
 * if (!isValid) {
 *   // Bundle was corrupted and has been removed
 * }
 * ```
 */
export class BundleValidator {
  constructor(
    private storage: Storage,
    private config: BundleValidatorConfig,
  ) {}

  /**
   * Validate a bundle's hash before loading.
   *
   * If validation fails, the corrupted bundle is automatically
   * removed from storage to prevent future load attempts.
   *
   * @param version - Bundle version identifier
   * @param bundlePath - Absolute path to bundle file on disk
   * @returns true if valid and safe to load, false if corrupted
   *
   * @example
   * ```typescript
   * if (await validator.validateBundle(version, path)) {
   *   // Safe to load bundle
   *   loadBundle(path);
   * }
   * ```
   */
  async validateBundle(version: string, bundlePath: string): Promise<boolean> {
    const result = await this.validateBundleDetailed(version, bundlePath);
    return result.valid;
  }

  /**
   * Validate a bundle with detailed result information.
   *
   * Provides more context than validateBundle() for debugging
   * and logging purposes.
   *
   * @param version - Bundle version identifier
   * @param bundlePath - Absolute path to bundle file on disk
   * @returns Detailed validation result with reason
   */
  async validateBundleDetailed(version: string, bundlePath: string): Promise<ValidationResult> {
    // Validate inputs
    if (!version || version.trim() === "") {
      logWarn("BundleValidator: version is required");
      return { valid: false, reason: "hash_mismatch" };
    }

    if (!bundlePath || bundlePath.trim() === "") {
      logWarn("BundleValidator: bundlePath is required");
      return { valid: false, reason: "hash_mismatch" };
    }

    const expectedHash = this.storage.getBundleHash(version);
    const allowLegacy = this.config.allowLegacyBundles === true;

    // Bundle without stored hash
    if (!expectedHash) {
      if (allowLegacy) {
        logWarn(
          `BundleValidator: No stored hash for version ${version}. Allowing because allowLegacyBundles is enabled.`,
        );
        return { valid: true, reason: "legacy_bundle" };
      }
      logWarn(
        `BundleValidator: REJECTING bundle ${version} - no stored hash. Set allowLegacyBundles: true to allow unverified bundles (NOT recommended).`,
      );
      return { valid: false, reason: "no_stored_hash" };
    }

    // Check if file exists before hashing (when fileExists is available)
    if (this.config.fileExists) {
      try {
        const exists = await this.config.fileExists(bundlePath);
        if (!exists) {
          logWarn(`BundleValidator: Bundle file missing for version ${version}`);
          return { valid: false, reason: "unavailable" };
        }
      } catch {
        logWarn(`BundleValidator: Failed to check file existence for version ${version}`);
        return { valid: false, reason: "unavailable" };
      }
    }

    let actualHash: string;
    try {
      actualHash = await this.config.hashFile(bundlePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      logWarn(`BundleValidator: Failed to hash file: ${message}`);
      // If no fileExists check, a hash failure on missing file still reports "unavailable"
      if (/ENOENT|not found|no such file/i.test(message)) {
        return { valid: false, reason: "unavailable" };
      }
      return { valid: false, reason: "hash_mismatch" };
    }

    // Empty hash from hashFile indicates native module unavailable
    if (!actualHash) {
      if (allowLegacy) {
        logWarn(
          "BundleValidator: hashFile returned empty (native module unavailable). " +
            "Allowing because allowLegacyBundles is enabled.",
        );
        return { valid: true, reason: "legacy_bundle" };
      }
      logWarn(
        "BundleValidator: REJECTING bundle - hashFile returned empty (native module unavailable). " +
          "Hash verification is required. Set allowLegacyBundles: true to skip verification (NOT recommended).",
      );
      return { valid: false, reason: "verification_unavailable" };
    }

    if (normalizeHash(actualHash) === normalizeHash(expectedHash)) {
      return { valid: true, reason: "hash_match" };
    }

    // Hash mismatch - bundle is corrupted or tampered
    logWarn(
      `BundleValidator: Hash mismatch for version ${version}. ` +
        `Expected: ${expectedHash.slice(0, 16)}..., ` +
        `Actual: ${actualHash.slice(0, 16)}...`,
    );

    // Remove corrupted bundle from storage
    await this.storage.removeBundleVersion(version);

    // Notify callback if provided
    this.config.onValidationFailed?.(version, expectedHash, actualHash);

    return { valid: false, reason: "hash_mismatch" };
  }
}
