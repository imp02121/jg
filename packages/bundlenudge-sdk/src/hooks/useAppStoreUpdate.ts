/**
 * useAppStoreUpdate React Hook
 *
 * Derives app store update state from the last BundleNudge update check.
 * Use this to show a prompt when the server requires a native App Store
 * or Play Store update instead of an OTA bundle.
 */

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { Linking } from "react-native";
import { BundleNudge } from "../bundlenudge";
import type { UpdateCheckResult } from "../types";

export interface UseAppStoreUpdateResult {
  /** Whether a native App Store/Play Store update is required */
  requiresAppStoreUpdate: boolean;
  /** Whether this is an unverified native build (different UI than store prompt) */
  isUnverifiedNativeBuild: boolean;
  /** Message to display to the user */
  message: string | null;
  /** URL to the app store listing */
  storeUrl: string | null;
  /** The reason for the update requirement */
  reason: string | null;
  /** Opens the app store URL via Linking */
  openStore: () => void;
}

function getSnapshot(): UpdateCheckResult | null {
  try {
    return BundleNudge.getInstance().getLastUpdateCheckResult();
  } catch {
    return null;
  }
}

function subscribe(callback: () => void): () => void {
  try {
    return BundleNudge.getInstance().onCheckResultChange(callback);
  } catch {
    // SDK not initialized — return noop unsubscribe
    return () => {
      /* noop */
    };
  }
}

/**
 * React hook for detecting when a native App Store or Play Store update is required.
 *
 * Derives state from the last update check result. When the server detects a native
 * fingerprint mismatch, it signals that an OTA update cannot be applied and a store
 * update is needed instead.
 *
 * @returns Object with store update state and an `openStore()` method
 *
 * @example
 * ```tsx
 * function StoreUpdateBanner() {
 *   const { requiresAppStoreUpdate, message, openStore } = useAppStoreUpdate();
 *   if (!requiresAppStoreUpdate) return null;
 *   return (
 *     <View>
 *       <Text>{message}</Text>
 *       <Button title="Update" onPress={openStore} />
 *     </View>
 *   );
 * }
 * ```
 */
export function useAppStoreUpdate(): UseAppStoreUpdateResult {
  const checkResult = useSyncExternalStore(subscribe, getSnapshot);

  const storeUrl = checkResult?.appStoreUrl ?? null;

  const openStore = useCallback((): void => {
    if (!storeUrl) return;
    try {
      void Linking.openURL(storeUrl);
    } catch {
      // Linking may not be available in all environments
    }
  }, [storeUrl]);

  return useMemo(() => {
    const requiresUpdate = checkResult?.requiresAppStoreUpdate ?? false;
    const reason = checkResult?.reason ?? null;
    const message = checkResult?.appStoreMessage ?? null;
    const isUnverified = reason === "unverified_native_version";

    return {
      requiresAppStoreUpdate: requiresUpdate,
      isUnverifiedNativeBuild: isUnverified,
      message,
      storeUrl,
      reason,
      openStore,
    };
  }, [checkResult, storeUrl, openStore]);
}
