/**
 * @history-gauntlet/mobile
 *
 * React Native app entry point for The History Gauntlet.
 */

export { config } from "./config";
export { RootNavigator } from "./navigation/RootNavigator";
export type { RootStackParamList } from "./navigation/types";
export { createApiClient } from "./services/api-client";
export type { ApiClient, ApiClientConfig } from "./services/api-client";
export { getDatabase, closeDatabase } from "./services/local-db";
