/**
 * SDK Configuration Types
 *
 * Configuration options for initializing the BundleNudge SDK.
 */

/**
 * Configuration options for the BundleNudge SDK.
 *
 * @example
 * ```typescript
 * const config: BundleNudgeConfig = {
 *   appId: 'your-app-id',
 *   checkOnLaunch: true,
 *   installMode: 'nextLaunch',
 *   verificationWindowMs: 60000,
 * };
 * ```
 */
export interface BundleNudgeConfig {
  /**
   * App ID from BundleNudge dashboard.
   * This is required and identifies your application.
   *
   * **Validation:** Must be non-empty, alphanumeric + hyphens only, max 100 chars.
   */
  appId: string;

  /**
   * API key for authenticating with the BundleNudge API.
   * Optional - when provided, must be a non-empty string, max 256 chars.
   */
  apiKey?: string;

  /**
   * API base URL.
   * Only change this for self-hosted or staging environments.
   *
   * **Security:** Must use HTTPS in production. HTTP is only allowed for
   * localhost/127.0.0.1 during development. Non-HTTPS URLs will cause
   * initialization to fail to prevent MITM attacks.
   *
   * @default 'https://api.bundlenudge.com'
   */
  apiUrl?: string;

  /**
   * Enable debug logging to console.
   * Useful during development, should be disabled in production.
   * @default false
   */
  debug?: boolean;

  /**
   * Check for updates when the app launches.
   * @default true
   */
  checkOnLaunch?: boolean;

  /**
   * Check for updates when app comes to foreground.
   * @default true
   */
  checkOnForeground?: boolean;

  /**
   * When to apply downloaded updates:
   * - 'immediate': Restart app immediately after download
   * - 'nextLaunch': Apply update on next app launch (recommended)
   * @default 'nextLaunch'
   */
  installMode?: "immediate" | "nextLaunch";

  /**
   * Minimum seconds between update checks.
   * Prevents excessive API calls.
   * @default 60
   */
  minimumCheckInterval?: number;

  /**
   * Time window in ms for the app to prove stability after an update.
   * If the app crashes repeatedly within this window, it will rollback.
   * @default 60000 (60 seconds)
   */
  verificationWindowMs?: number;

  /**
   * Number of crashes within crashWindowMs before triggering rollback.
   * @default 3
   */
  crashThreshold?: number;

  /**
   * Time window in ms for counting crashes.
   * Crashes outside this window reset the crash count.
   * @default 10000 (10 seconds)
   */
  crashWindowMs?: number;

  /**
   * Stability window in ms after notifyAppReady() is called.
   * If the app crashes within this window after a rollback, it counts
   * as an unstable update. After this window passes without crashes,
   * the previous bundle can be cleaned up.
   * @default 30000 (30 seconds)
   */
  stabilityWindowMs?: number;

  /**
   * Suppress security warnings about AsyncStorage token storage.
   *
   * By default, the SDK logs a warning when storing access tokens in
   * AsyncStorage, as this is NOT secure on rooted/jailbroken devices.
   *
   * Set to true if:
   * - You're using a secure storage solution externally
   * - You understand the security implications and accept them
   *
   * For production apps handling sensitive data, consider using
   * react-native-keychain for secure Keychain/Keystore storage.
   *
   * @default false
   */
  suppressStorageSecurityWarnings?: boolean;

  /**
   * Allow loading bundles that cannot be verified.
   *
   * SECURITY WARNING: When true, bundles without stored hashes or when
   * hash verification is unavailable (e.g., native module missing) will
   * be allowed to load WITHOUT integrity verification.
   *
   * This creates a security risk as tampered bundles could be loaded.
   *
   * Only set to true for:
   * - Development/testing environments
   * - Migration from older SDK versions that didn't track hashes
   * - When native hashing module is known to be unavailable
   *
   * @default false (bundles MUST be verifiable for security)
   */
  allowLegacyBundles?: boolean;

  /**
   * Allow installing bundle versions older than the currently installed version.
   *
   * When true (the default), the SDK permits updates to any version, including
   * versions older than the currently installed bundle. This is necessary for
   * server-side rollback scenarios where the API intentionally serves an older
   * release.
   *
   * Set to false to reject version downgrades. This protects against downgrade
   * attacks but will also block legitimate server-side rollbacks.
   *
   * @default true (downgrades are allowed)
   */
  allowDowngrades?: boolean;

  /**
   * Interval in seconds between background update checks.
   * The SDK periodically checks for updates in the background using setInterval.
   * @default 300 (5 minutes)
   */
  backgroundCheckInterval?: number;

  /**
   * Optional build-time native module fingerprint override.
   *
   * When provided, this value is sent in update check requests instead
   * of the runtime-generated fingerprint. Use this when you want to
   * embed a known fingerprint at build time (e.g. from CI).
   */
  nativeFingerprint?: string;
}
