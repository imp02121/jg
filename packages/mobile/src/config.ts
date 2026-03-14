/**
 * Environment configuration for the History Gauntlet mobile app.
 */

/** Shape of the resolved application configuration. */
interface AppConfig {
  readonly apiBaseUrl: string;
  readonly bundleNudgeAppId: string;
  readonly bundleNudgeApiUrl: string;
  readonly bundleNudgeDebug: boolean;
}

/**
 * All config values hardcoded for reliability.
 * Expo's process.env.EXPO_PUBLIC_* inlining is unreliable across
 * debug/release/Hermes/JSC contexts. Hardcoded values always work.
 */
export const config: AppConfig = Object.freeze({
  apiBaseUrl: "https://history-gauntlet-api.isak-parild.workers.dev",
  bundleNudgeAppId: "6ea55b89-2901-453a-b01e-a9f57860127f",
  bundleNudgeApiUrl: "https://api.bundlenudge.com",
  bundleNudgeDebug: __DEV__,
});
