/**
 * BundleNudge Helpers
 *
 * Helper functions and types for the BundleNudge SDK.
 */

import { z } from "zod";
import type { DownloadProgress, UpdateInfo, UpdateStatus } from "./types";

/** Maximum allowed length for appId */
const APP_ID_MAX_LENGTH = 100;

/** Pattern for valid appId: alphanumeric and hyphens only */
const APP_ID_PATTERN = /^[a-zA-Z0-9-]+$/;

/** Maximum allowed length for apiKey */
const API_KEY_MAX_LENGTH = 256;

/**
 * Validates that an API URL is secure.
 * HTTPS is required for production to prevent MITM attacks.
 * HTTP is only allowed for localhost/127.0.0.1 during development.
 *
 * @param url - The API URL to validate
 * @returns true if the URL is valid (HTTPS or localhost HTTP)
 */
export function isValidApiUrl(url: string): boolean {
  const lowercaseUrl = url.toLowerCase();
  if (lowercaseUrl.startsWith("https://")) return true;
  if (lowercaseUrl.startsWith("http://localhost")) return true;
  if (lowercaseUrl.startsWith("http://127.0.0.1")) return true;
  return false;
}

/**
 * Validates the appId format.
 * Must be non-empty, alphanumeric + hyphens only, max 100 chars.
 *
 * @param appId - The app ID to validate
 * @returns An error message if invalid, or null if valid
 */
export function validateAppId(appId: string): string | null {
  if (!appId || appId.trim() === "") {
    return "appId is required for initialization";
  }
  if (appId.length > APP_ID_MAX_LENGTH) {
    return `appId must be at most ${String(APP_ID_MAX_LENGTH)} characters (got ${String(appId.length)})`;
  }
  if (!APP_ID_PATTERN.test(appId)) {
    return "appId must contain only alphanumeric characters and hyphens";
  }
  return null;
}

/**
 * Validates the apiKey format when provided.
 * Must be non-empty and max 256 chars.
 *
 * @param apiKey - The API key to validate
 * @returns An error message if invalid, or null if valid
 */
export function validateApiKey(apiKey: string): string | null {
  if (!apiKey || apiKey.trim() === "") {
    return "apiKey must be a non-empty string when provided";
  }
  if (apiKey.length > API_KEY_MAX_LENGTH) {
    return `apiKey must be at most ${String(API_KEY_MAX_LENGTH)} characters (got ${String(apiKey.length)})`;
  }
  return null;
}

/**
 * Callbacks for BundleNudge SDK events.
 */
export interface BundleNudgeCallbacks {
  /** Called when update status changes */
  onStatusChange?: (status: UpdateStatus) => void;
  /** Called during download with progress information */
  onDownloadProgress?: (progress: DownloadProgress) => void;
  /** Called when an update is available */
  onUpdateAvailable?: (update: UpdateInfo) => void;
  /** Called when an error occurs */
  onError?: (error: Error) => void;
}

/**
 * Zod schema for device registration API response.
 */
export const deviceRegisterResponseSchema = z.object({
  accessToken: z.string().min(1),
  expiresAt: z.number(),
});

/**
 * Device registration response from the API.
 */
export type DeviceRegisterResponse = z.infer<typeof deviceRegisterResponseSchema>;
