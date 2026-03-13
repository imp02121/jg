/**
 * Storage Types and Schemas
 *
 * Type definitions and Zod validation schemas for SDK metadata persistence.
 */

import { z } from "zod";

/**
 * Verification state for safe rollback.
 * Both flags must be true before clearing previousVersion.
 */
export interface VerificationState {
  appReady: boolean; // Set when notifyAppReady() called
  healthPassed: boolean; // Set when all critical events/endpoints pass
  verifiedAt: number | null; // Timestamp when both conditions met
}

/**
 * App version info for detecting App Store updates.
 * When app version changes, all bundles should be cleared.
 */
export interface AppVersionInfo {
  appVersion: string; // e.g., "2.1.0"
  buildNumber: string; // e.g., "142"
  recordedAt: number; // timestamp
}

/**
 * Zod schema for verification state validation.
 */
export const verificationStateSchema = z.object({
  appReady: z.boolean(),
  healthPassed: z.boolean(),
  verifiedAt: z.number().nullable(),
});

/**
 * Zod schema for app version info validation.
 */
export const appVersionInfoSchema = z.object({
  appVersion: z.string().min(1),
  buildNumber: z.string().min(1),
  recordedAt: z.number(),
});

/**
 * Zod schema for stored metadata validation.
 * Validates data loaded from AsyncStorage to ensure integrity.
 */
export const storedMetadataSchema = z.object({
  deviceId: z.string().min(1),
  accessToken: z.string().nullable(),
  currentVersion: z.string().nullable(),
  currentVersionHash: z.string().nullable(),
  previousVersion: z.string().nullable(),
  pendingVersion: z.string().nullable(),
  pendingUpdateFlag: z.boolean(),
  lastCheckTime: z.number().nullable(),
  crashCount: z.number().int().min(0).max(100), // Cap at 100
  lastCrashTime: z.number().nullable(),
  verificationState: verificationStateSchema.nullable(),
  appVersionInfo: appVersionInfoSchema.nullable(),
  bundleHashes: z.record(z.string(), z.string()).optional().default({}),
  currentReleaseNotes: z.string().nullable().optional().default(null),
  currentReleasedAt: z.string().nullable().optional().default(null),
  pendingReleaseNotes: z.string().nullable().optional().default(null),
  pendingReleasedAt: z.string().nullable().optional().default(null),
  pendingVersionHash: z.string().nullable().default(null),
  pendingReleaseId: z.string().nullable().optional().default(null),
  currentReleaseId: z.string().nullable().optional().default(null),
  rolledBackFromVersion: z.string().nullable().optional().default(null),
  rolledBackFromHash: z.string().nullable().optional().default(null),
  rolledBackFromReleaseId: z.string().nullable().optional().default(null),
  storedRuntimeFingerprint: z.string().nullable().optional().default(null),
  expectedNativeModules: z
    .array(z.object({ name: z.string(), version: z.string() }))
    .nullable()
    .optional()
    .default(null),
});

export type StoredMetadata = z.infer<typeof storedMetadataSchema>;

export const STORAGE_KEY = "@bundlenudge:metadata";
