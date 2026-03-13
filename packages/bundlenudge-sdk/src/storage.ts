/**
 * Storage - Backward Compatibility Export
 *
 * This file re-exports from the storage/ module for backward compatibility.
 * New code should import from './storage/index' directly.
 */

export {
  Storage,
  type StoredMetadata,
  type VerificationState,
  type AppVersionInfo,
  storedMetadataSchema,
  verificationStateSchema,
  appVersionInfoSchema,
  getVerificationState,
  isFullyVerified,
  setAppReady,
  setHealthPassed,
  resetVerificationState,
} from "./storage/index";
