/**
 * Environment configuration for the History Gauntlet mobile app.
 *
 * Provides typed access to environment-specific values such as the API
 * base URL. Values are resolved at build time via Expo's Constants or
 * can be overridden through environment variables.
 */

/** Supported environment names. */
type Environment = "development" | "staging" | "production";

/** Shape of the resolved application configuration. */
interface AppConfig {
  /** The base URL of the History Gauntlet API (no trailing slash). */
  readonly apiBaseUrl: string;
  /** Current environment name. */
  readonly environment: Environment;
  /** BundleNudge app ID from the dashboard. */
  readonly bundleNudgeAppId: string;
  /** BundleNudge API URL (defaults to production). */
  readonly bundleNudgeApiUrl: string;
  /** Whether to enable BundleNudge debug logging. */
  readonly bundleNudgeDebug: boolean;
}

/** Default API URLs for each environment. */
const API_URLS: Readonly<Record<Environment, string>> = {
  development: "http://localhost:8787",
  staging: "https://history-gauntlet-api.isak-parild.workers.dev",
  production: "https://history-gauntlet-api.isak-parild.workers.dev",
};

/**
 * Determine the current environment from the EXPO_PUBLIC_APP_ENV variable.
 * Falls back to "development" if not set or unrecognised.
 */
function resolveEnvironment(): Environment {
  const raw =
    typeof process !== "undefined" && process.env ? process.env.EXPO_PUBLIC_APP_ENV : undefined;

  if (raw === "staging" || raw === "production") {
    return raw;
  }
  return "development";
}

/**
 * Resolve the API base URL.
 *
 * Checks for an explicit EXPO_PUBLIC_API_URL override first, then falls
 * back to the per-environment default.
 */
function resolveApiBaseUrl(environment: Environment): string {
  const override =
    typeof process !== "undefined" && process.env ? process.env.EXPO_PUBLIC_API_URL : undefined;

  if (typeof override === "string" && override.length > 0) {
    return override.replace(/\/+$/, "");
  }

  return API_URLS[environment];
}

/**
 * Resolve the BundleNudge app ID from the EXPO_PUBLIC_BUNDLENUDGE_APP_ID
 * environment variable. Returns an empty string if not set.
 */
function resolveBundleNudgeAppId(): string {
  const raw =
    typeof process !== "undefined" && process.env
      ? process.env.EXPO_PUBLIC_BUNDLENUDGE_APP_ID
      : undefined;

  return typeof raw === "string" && raw.length > 0 ? raw : "";
}

/**
 * Resolve the BundleNudge API URL from the EXPO_PUBLIC_BUNDLENUDGE_API_URL
 * environment variable. Falls back to the production default.
 */
function resolveBundleNudgeApiUrl(): string {
  const override =
    typeof process !== "undefined" && process.env
      ? process.env.EXPO_PUBLIC_BUNDLENUDGE_API_URL
      : undefined;

  if (typeof override === "string" && override.length > 0) {
    return override.replace(/\/+$/, "");
  }

  return "https://api.bundlenudge.com";
}

/** Build the configuration once and freeze it. */
function buildConfig(): AppConfig {
  const environment = resolveEnvironment();
  return Object.freeze({
    apiBaseUrl: resolveApiBaseUrl(environment),
    environment,
    bundleNudgeAppId: resolveBundleNudgeAppId(),
    bundleNudgeApiUrl: resolveBundleNudgeApiUrl(),
    bundleNudgeDebug: environment !== "production",
  });
}

/** Typed, frozen application configuration. */
export const config: AppConfig = buildConfig();
