/**
 * SDK Types
 *
 * Re-exports all type definitions for the BundleNudge SDK.
 * These types define the public API surface.
 */

// Configuration types
export type { BundleNudgeConfig } from "./config";

// Update types
export type {
  UpdateStatus,
  UpdateInfo,
  DownloadProgress,
  UpdateCheckResult,
} from "./update";

// Native module types
export type { NativeModuleInterface } from "./native";

// StoredMetadata is defined in storage.ts using Zod schema
// Re-export for backward compatibility
export type { StoredMetadata } from "../storage";
