/**
 * Updater Helpers
 *
 * Helper functions for the Updater module.
 */

import { z } from "zod";

const APP_STORE_UPDATE_REASONS = [
  "unverified_native_version",
  "version_out_of_range",
  "known_mismatch",
  "strict_unknown",
  "strict_no_data",
  "no_fp_data",
] as const;

export type AppStoreUpdateReason = (typeof APP_STORE_UPDATE_REASONS)[number];

const reasonSchema = z.enum(APP_STORE_UPDATE_REASONS).or(z.string());

/**
 * Response shape from the update check API endpoint.
 */
export interface UpdateCheckResponse {
  updateAvailable: boolean;
  forceUpdate?: boolean;
  shouldClearUpdates?: boolean;
  requiresAppStoreUpdate?: boolean;
  appStoreMessage?: string;
  appStoreUrl?: string;
  reason?: string;
  nativeFingerprintMismatch?: boolean;
  release?: {
    version: string;
    bundleUrl: string;
    bundleSize: number;
    bundleHash: string;
    releaseId: string;
    releaseNotes?: string;
    releasedAt?: string;
    hermesBytecodeVersion?: number;
    runtimeFingerprint?: string;
    nativeFingerprint?: string;
    expectedNativeModules?: { name: string; version: string }[];
  };
  message?: { id: string; title: string; body: string };
}

/**
 * Zod schema for validating update check API responses.
 * Used to ensure the API returns properly structured data.
 */
export const UpdateCheckResponseSchema = z.object({
  updateAvailable: z.boolean(),
  forceUpdate: z.boolean().optional(),
  shouldClearUpdates: z.boolean().optional(),
  requiresAppStoreUpdate: z.boolean().optional(),
  appStoreMessage: z.string().optional(),
  appStoreUrl: z.string().url().optional(),
  reason: reasonSchema.optional(),
  nativeFingerprintMismatch: z.boolean().optional(),
  release: z
    .object({
      version: z.string(),
      bundleUrl: z
        .string()
        .url()
        .refine((url) => url.startsWith("https://"), {
          message: "bundleUrl must use HTTPS",
        }),
      bundleSize: z.number().int().positive(),
      bundleHash: z.string(),
      releaseId: z.string(),
      releaseNotes: z.string().optional(),
      releasedAt: z.string().optional(),
      hermesBytecodeVersion: z.number().int().positive().optional(),
      runtimeFingerprint: z.string().optional(),
      nativeFingerprint: z.string().optional(),
      expectedNativeModules: z
        .array(z.object({ name: z.string(), version: z.string() }))
        .optional(),
    })
    .optional(),
  message: z
    .object({
      id: z.string(),
      title: z.string(),
      body: z.string(),
    })
    .optional(),
});

/**
 * Validate update check response with Zod schema.
 * Returns the validated data or throws ZodError if invalid.
 */
export function validateUpdateCheckResponse(data: unknown): UpdateCheckResponse {
  return UpdateCheckResponseSchema.parse(data);
}

/**
 * Network error patterns to detect offline/connectivity issues.
 */
const NETWORK_ERROR_PATTERNS = [
  "network request failed",
  "network error",
  "failed to fetch",
  "connection refused",
  "no internet",
  "offline",
  "timeout",
  "etimedout",
  "econnrefused",
  "enotfound",
] as const;

/**
 * HTTP status code to human-readable message mapping.
 */
const HTTP_STATUS_TEXTS: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  429: "Too Many Requests",
  500: "Internal Server Error",
  502: "Bad Gateway",
  503: "Service Unavailable",
};

/** Specific categories of network errors for diagnostics. */
export type NetworkErrorType =
  | "timeout"
  | "dns"
  | "connection_refused"
  | "offline"
  | "network_generic"
  | null;

/**
 * Classify a network error into a specific type.
 * Returns null if the error is not network-related.
 */
export function classifyNetworkError(message: string): NetworkErrorType {
  const lower = message.toLowerCase();
  if (lower.includes("timeout") || lower.includes("timed out") || lower.includes("etimedout"))
    return "timeout";
  if (lower.includes("enotfound") || lower.includes("getaddrinfo")) return "dns";
  if (lower.includes("econnrefused") || lower.includes("connection refused"))
    return "connection_refused";
  if (lower.includes("no internet") || lower.includes("offline")) return "offline";
  if (NETWORK_ERROR_PATTERNS.some((p) => lower.includes(p))) return "network_generic";
  return null;
}

/** Check if an error message indicates a network failure. */
export function isNetworkError(message: string): boolean {
  return classifyNetworkError(message) !== null;
}

/**
 * Get human-readable status text for HTTP status codes.
 *
 * @param status - The HTTP status code
 * @returns A human-readable description of the status
 */
export function getStatusText(status: number): string {
  return HTTP_STATUS_TEXTS[status] ?? "Error";
}

/**
 * Validate that update metadata contains all required fields.
 * Rejects updates with missing or invalid version, hash, or size.
 *
 * @param update - The update metadata to validate
 * @throws Error if any required field is missing or invalid
 */
export function validateUpdateMetadata(update: {
  version?: string;
  bundleHash?: string;
  bundleSize?: number;
  bundleUrl?: string;
}): void {
  if (!update.version || update.version.trim() === "") {
    throw new Error("BundleNudge: Invalid update - version is required");
  }
  if (!update.bundleHash || update.bundleHash.trim() === "") {
    throw new Error("BundleNudge: Invalid update - bundleHash is required");
  }
  if (!update.bundleUrl || update.bundleUrl.trim() === "") {
    throw new Error("BundleNudge: Invalid update - bundleUrl is required");
  }
  if (update.bundleSize == null || update.bundleSize <= 0) {
    throw new Error("BundleNudge: Invalid update - bundleSize must be positive");
  }
}

/**
 * Validate that a bundle URL uses HTTPS.
 * HTTP is only allowed for localhost/127.0.0.1 during development.
 *
 * @param url - The bundle URL to validate
 * @throws Error if the URL does not use HTTPS (and is not localhost)
 */
export function validateBundleUrl(url: string): void {
  const lower = url.toLowerCase();
  const isSecure =
    lower.startsWith("https://") ||
    lower.startsWith("http://localhost") ||
    lower.startsWith("http://127.0.0.1");
  if (!isSecure) {
    throw new Error(
      "BundleNudge: Bundle URL must use HTTPS. " +
        "HTTP is only allowed for localhost during development.",
    );
  }
}

/**
 * Validate that a new version is not a downgrade from the current version.
 *
 * @param newVersion - The version being installed
 * @param currentVersion - The currently installed version (null if none)
 * @param allowDowngrades - Whether to skip the check
 * @throws Error if newVersion is older than currentVersion
 */
export function validateNotDowngrade(
  newVersion: string,
  currentVersion: string | null,
  allowDowngrades: boolean,
): void {
  if (allowDowngrades || !currentVersion) return;
  // Strip pre-release tags (e.g., "1.0.0-beta.1" → "1.0.0")
  // Pre-release OTA bundles are not supported; semver comparison
  // uses only major.minor.patch.
  const stripPreRelease = (v: string): string => v.split("-")[0];
  const partsA = stripPreRelease(newVersion)
    .split(".")
    .map((p) => {
      const n = Number.parseInt(p, 10);
      return Number.isNaN(n) ? 0 : n;
    });
  const partsB = stripPreRelease(currentVersion)
    .split(".")
    .map((p) => {
      const n = Number.parseInt(p, 10);
      return Number.isNaN(n) ? 0 : n;
    });
  for (let i = 0; i < 3; i++) {
    const diff = (partsA[i] || 0) - (partsB[i] || 0);
    if (diff !== 0) {
      if (diff < 0) {
        throw new Error(
          `BundleNudge: Downgrade rejected. Version ${newVersion} is older than current version ${currentVersion}. Set allowDowngrades: true to permit this.`,
        );
      }
      return;
    }
  }
}
