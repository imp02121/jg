/**
 * Storage Module
 *
 * Re-exports all storage-related functionality for backward compatibility.
 */

export { Storage } from "./storage";
export type { StorageConfig } from "./storage";
export type { StoredMetadata, VerificationState, AppVersionInfo } from "./types";
export { storedMetadataSchema, verificationStateSchema, appVersionInfoSchema } from "./types";

// Functional API for verification operations
export {
  getVerificationState,
  isFullyVerified,
  setAppReady,
  setHealthPassed,
  resetVerificationState,
} from "./verification";

// Functional API for bundle operations
export {
  getBundleHash,
  setBundleHash,
  removeBundleVersion,
  clearAllBundles,
} from "./storage-bundle";

// Functional API for metadata operations
export {
  getAppVersionInfo,
  setAppVersionInfo,
  hasAppVersionChanged,
} from "./storage-metadata";

// Functional API for crash/rollback operations
export {
  recordCrash,
  clearCrashCount,
  rollback,
  clearPreviousVersion,
} from "./storage-crash";
