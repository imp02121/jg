/**
 * Higher-Order Component
 *
 * HOC wrapper for class components or Expo.
 */

import type React from "react";
import { type ComponentType, useEffect, useState } from "react";
import { setupBundleNudge } from "./index";
import type { SetupOptions } from "./index";

interface WrapperState {
  isInitialized: boolean;
  error: Error | null;
}

/**
 * Higher-Order Component for class components or Expo.
 * Wraps component and initializes BundleNudge.
 */
export function withBundleNudge<P extends object>(
  Component: ComponentType<P>,
  options: SetupOptions,
): ComponentType<P> {
  function BundleNudgeWrapper(props: P): React.ReactElement | null {
    const [_state, setState] = useState<WrapperState>({
      isInitialized: false,
      error: null,
    });

    useEffect(() => {
      let mounted = true;

      const init = async (): Promise<void> => {
        try {
          await setupBundleNudge({
            ...options,
            onError: (error: Error) => {
              if (mounted) {
                setState((prev) => ({ ...prev, error }));
              }
              options.onError?.(error);
            },
          });

          if (mounted) {
            setState({ isInitialized: true, error: null });
          }
        } catch (error) {
          if (mounted) {
            const err = error instanceof Error ? error : new Error(String(error));
            setState({ isInitialized: false, error: err });
          }
        }
      };

      void init();

      return () => {
        mounted = false;
      };
    }, []);

    // Always render the component - BundleNudge init is non-blocking
    // The state.error can be used for debugging but shouldn't block render
    return <Component {...props} />;
  }

  // Copy display name for React DevTools
  BundleNudgeWrapper.displayName = `withBundleNudge(${Component.name})`;

  return BundleNudgeWrapper;
}

// Deprecated alias for CodePush migration
export { withBundleNudge as withCodePush };
