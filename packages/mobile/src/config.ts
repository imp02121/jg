/**
 * Environment configuration for the History Gauntlet mobile app.
 *
 * IMPORTANT: Expo inlines process.env.EXPO_PUBLIC_* at build time
 * via babel transform. The references must be direct literals —
 * no wrapping in typeof checks or variables.
 */

/** Supported environment names. */
type Environment = "development" | "staging" | "production";

/** Shape of the resolved application configuration. */
interface AppConfig {
  readonly apiBaseUrl: string;
  readonly environment: Environment;
  readonly bundleNudgeAppId: string;
  readonly bundleNudgeApiUrl: string;
  readonly bundleNudgeDebug: boolean;
}

/** Default API URLs for each environment. */
const API_URLS: Readonly<Record<Environment, string>> = {
  development: "http://localhost:8787",
  staging: "https://history-gauntlet-api.isak-parild.workers.dev",
  production: "https://history-gauntlet-api.isak-parild.workers.dev",
};

function resolveEnvironment(): Environment {
  // Must be a direct literal for Expo's babel transform to inline it
  const raw = process.env.EXPO_PUBLIC_APP_ENV;
  if (raw === "staging" || raw === "production") {
    return raw;
  }
  return "development";
}

function resolveApiBaseUrl(environment: Environment): string {
  const override = process.env.EXPO_PUBLIC_API_URL;
  if (typeof override === "string" && override.length > 0) {
    return override.replace(/\/+$/, "");
  }
  return API_URLS[environment];
}

function resolveBundleNudgeAppId(): string {
  const raw = process.env.EXPO_PUBLIC_BUNDLENUDGE_APP_ID;
  return typeof raw === "string" && raw.length > 0 ? raw : "";
}

function resolveBundleNudgeApiUrl(): string {
  const override = process.env.EXPO_PUBLIC_BUNDLENUDGE_API_URL;
  if (typeof override === "string" && override.length > 0) {
    return override.replace(/\/+$/, "");
  }
  return "https://api.bundlenudge.com";
}

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

export const config: AppConfig = buildConfig();
