/**
 * Crash Reporter Integrations
 *
 * Auto-tag Sentry, Bugsnag, and Firebase Crashlytics with release metadata.
 * All functions are fire-and-forget - they never throw exceptions.
 */

export interface ReleaseMetadata {
  releaseId: string;
  bundleVersion: string;
  bundleHash?: string;
  channel?: string;
}

export interface TaggingResult {
  tagged: boolean;
  reporter: "sentry" | "bugsnag" | "crashlytics" | null;
  error?: string;
}

interface SentryLike {
  setTag(key: string, value: string): void;
  setContext(name: string, context: Record<string, unknown>): void;
}

interface BugsnagLike {
  addMetadata(section: string, values: Record<string, unknown>): void;
  clearMetadata(section: string): void;
}

interface CrashlyticsLike {
  setAttributes(attributes: Record<string, string>): Promise<void>;
  setAttribute(key: string, value: string): Promise<void>;
}

/**
 * Get Sentry instance from global or require.
 * Uses static require string so Metro can resolve it as an optional dependency.
 */
function getSentry(): SentryLike | null {
  const globalSentry = (globalThis as Record<string, unknown>).Sentry;
  if (globalSentry && typeof globalSentry === "object") {
    return globalSentry as SentryLike;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const required = require("@sentry/react-native") as unknown;
    if (required && typeof required === "object") {
      return required as SentryLike;
    }
  } catch {
    // Not installed
  }
  return null;
}

/**
 * Get Bugsnag instance from global or require.
 * Uses static require string so Metro can resolve it as an optional dependency.
 */
function getBugsnag(): BugsnagLike | null {
  const globalBugsnag = (globalThis as Record<string, unknown>).Bugsnag;
  if (globalBugsnag && typeof globalBugsnag === "object") {
    return globalBugsnag as BugsnagLike;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const required = require("@bugsnag/react-native") as unknown;
    if (required && typeof required === "object") {
      return required as BugsnagLike;
    }
  } catch {
    // Not installed
  }
  return null;
}

/**
 * Get Crashlytics instance from require.
 * Uses static require string so Metro can resolve it as an optional dependency.
 */
function getCrashlytics(): CrashlyticsLike | null {
  try {
    const crashlyticsModule =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("@react-native-firebase/crashlytics") as unknown;
    if (typeof crashlyticsModule === "function") {
      return (crashlyticsModule as () => CrashlyticsLike)();
    }
  } catch {
    // Not installed
  }
  return null;
}

/**
 * Tag Sentry with release metadata.
 * Uses setTag() and setContext() for rich crash context.
 */
export function tagSentry(metadata: ReleaseMetadata): TaggingResult {
  try {
    const sentry = getSentry();
    if (!sentry || typeof sentry.setTag !== "function") {
      return { tagged: false, reporter: null };
    }

    sentry.setTag("bundlenudge_release_id", metadata.releaseId);
    sentry.setTag("bundlenudge_bundle_version", metadata.bundleVersion);

    if (metadata.bundleHash) {
      sentry.setTag("bundlenudge_bundle_hash", metadata.bundleHash);
    }
    if (metadata.channel) {
      sentry.setTag("bundlenudge_channel", metadata.channel);
    }

    if (typeof sentry.setContext === "function") {
      sentry.setContext("bundlenudge", { ...metadata });
    }

    return { tagged: true, reporter: "sentry" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { tagged: false, reporter: "sentry", error: message };
  }
}

/**
 * Tag Bugsnag with release metadata.
 * Uses addMetadata() for crash context.
 */
export function tagBugsnag(metadata: ReleaseMetadata): TaggingResult {
  try {
    const bugsnag = getBugsnag();
    if (!bugsnag || typeof bugsnag.addMetadata !== "function") {
      return { tagged: false, reporter: null };
    }

    bugsnag.addMetadata("bundlenudge", { ...metadata });
    return { tagged: true, reporter: "bugsnag" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { tagged: false, reporter: "bugsnag", error: message };
  }
}

/**
 * Tag Firebase Crashlytics with release metadata.
 * Uses setAttributes() for batch attribute setting.
 */
export function tagCrashlytics(metadata: ReleaseMetadata): TaggingResult {
  try {
    const crashlytics = getCrashlytics();
    if (!crashlytics || typeof crashlytics.setAttributes !== "function") {
      return { tagged: false, reporter: null };
    }

    const attributes: Record<string, string> = {
      bundlenudge_release_id: metadata.releaseId,
      bundlenudge_bundle_version: metadata.bundleVersion,
    };

    if (metadata.bundleHash) {
      attributes.bundlenudge_bundle_hash = metadata.bundleHash;
    }
    if (metadata.channel) {
      attributes.bundlenudge_channel = metadata.channel;
    }

    // Fire and forget - don't await
    void crashlytics.setAttributes(attributes);
    return { tagged: true, reporter: "crashlytics" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { tagged: false, reporter: "crashlytics", error: message };
  }
}

/**
 * Auto-detect and tag all available crash reporters.
 * Safe to call even if reporters aren't installed.
 */
export function tagCrashReporters(metadata: ReleaseMetadata): TaggingResult[] {
  return [tagSentry(metadata), tagBugsnag(metadata), tagCrashlytics(metadata)];
}

/**
 * Clear all crash reporter tags (call on rollback).
 */
export function clearCrashReporterTags(): void {
  try {
    const sentry = getSentry();
    if (sentry && typeof sentry.setTag === "function") {
      sentry.setTag("bundlenudge_release_id", "");
      sentry.setTag("bundlenudge_bundle_version", "");
      sentry.setTag("bundlenudge_bundle_hash", "");
      sentry.setTag("bundlenudge_channel", "");
    }
  } catch {
    // Ignore errors
  }

  try {
    const bugsnag = getBugsnag();
    if (bugsnag && typeof bugsnag.clearMetadata === "function") {
      bugsnag.clearMetadata("bundlenudge");
    }
  } catch {
    // Ignore errors
  }

  try {
    const crashlytics = getCrashlytics();
    if (crashlytics && typeof crashlytics.setAttribute === "function") {
      void crashlytics.setAttribute("bundlenudge_release_id", "");
      void crashlytics.setAttribute("bundlenudge_bundle_version", "");
      void crashlytics.setAttribute("bundlenudge_bundle_hash", "");
      void crashlytics.setAttribute("bundlenudge_channel", "");
    }
  } catch {
    // Ignore errors
  }
}
