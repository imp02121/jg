/**
 * useInAppMessage React Hook
 *
 * Provides the current in-app message and dismiss functionality.
 * Uses useSyncExternalStore (same pattern as useAppStoreUpdate).
 */

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { BundleNudge } from "../bundlenudge";

export interface UseInAppMessageResult {
  /** Current message or null if none/dismissed */
  message: { id: string; title: string; body: string } | null;
  /** Convenience boolean */
  hasMessage: boolean;
  /** Dismiss the current message (persists across sessions) */
  dismiss: () => void;
}

function getSnapshot(): { id: string; title: string; body: string } | null {
  try {
    return BundleNudge.getInstance().getCurrentMessage();
  } catch {
    return null;
  }
}

function subscribe(callback: () => void): () => void {
  try {
    return BundleNudge.getInstance().onMessageChange(callback);
  } catch {
    return () => {
      /* noop */
    };
  }
}

export function useInAppMessage(): UseInAppMessageResult {
  const message = useSyncExternalStore(subscribe, getSnapshot);

  const dismiss = useCallback((): void => {
    if (!message) return;
    try {
      void BundleNudge.getInstance().dismissMessage(message.id);
    } catch {
      // SDK not initialized
    }
  }, [message]);

  return useMemo(
    () => ({
      message,
      hasMessage: message !== null,
      dismiss,
    }),
    [message, dismiss],
  );
}
