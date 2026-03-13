/**
 * useBundleVersion React Hook
 *
 * Returns current OTA bundle version and release notes.
 */

import { useEffect, useState } from "react";
import { BundleNudge } from "../bundlenudge";
import type { BundleReleaseInfo } from "../bundlenudge";

/**
 * React hook that returns the current OTA bundle version and release info.
 *
 * Returns `{ isOtaUpdate: false }` until an OTA bundle is applied.
 * The SDK must be initialized before this hook is used.
 *
 * @returns Release info with version, release notes, date, and OTA status
 *
 * @example
 * ```tsx
 * function VersionDisplay() {
 *   const { version, isOtaUpdate, releaseNotes } = useBundleVersion();
 *   if (!isOtaUpdate) return <Text>Running embedded bundle</Text>;
 *   return <Text>OTA v{version}: {releaseNotes}</Text>;
 * }
 * ```
 */
export function useBundleVersion(): BundleReleaseInfo {
  const [info, setInfo] = useState<BundleReleaseInfo>({
    version: null,
    releaseNotes: null,
    releasedAt: null,
    isOtaUpdate: false,
  });

  useEffect(() => {
    try {
      const instance = BundleNudge.getInstance();
      setInfo(instance.getReleaseInfo());
    } catch {
      // SDK not initialized yet
    }
  }, []);

  return info;
}
