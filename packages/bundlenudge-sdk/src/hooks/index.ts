/**
 * BundleNudge React Hooks
 *
 * React hooks for managing OTA updates.
 */

export { useBundleNudge } from "./useBundleNudge";
export type { UseBundleNudgeResult, BundleNudgeStatus } from "./useBundleNudge";
export { useBundleVersion } from "./useBundleVersion";
export { useAppStoreUpdate } from "./useAppStoreUpdate";
export type { UseAppStoreUpdateResult } from "./useAppStoreUpdate";
export { useInAppMessage } from "./useInAppMessage";
export type { UseInAppMessageResult } from "./useInAppMessage";

// Deprecated alias for migration from CodePush
export { useBundleNudge as useCodePush } from "./useBundleNudge";
