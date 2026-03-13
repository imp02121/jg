import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReleaseMetadata } from "./crash-reporters";
import {
  clearCrashReporterTags,
  tagBugsnag,
  tagCrashReporters,
  tagCrashlytics,
  tagSentry,
} from "./crash-reporters";

describe("crash-reporters", () => {
  const metadata: ReleaseMetadata = {
    releaseId: "release-123",
    bundleVersion: "1.0.0",
    bundleHash: "abc123hash",
    channel: "production",
  };

  beforeEach(() => {
    vi.resetModules()(
      // Clear any global mocks
      globalThis as Record<string, unknown>,
    ).Sentry = undefined(globalThis as Record<string, unknown>).Bugsnag = undefined;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("tagSentry", () => {
    it("tags when Sentry is available globally", () => {
      const mockSentry = {
        setTag: vi.fn(),
        setContext: vi.fn(),
      };
      (globalThis as Record<string, unknown>).Sentry = mockSentry;

      const result = tagSentry(metadata);

      expect(result).toEqual({ tagged: true, reporter: "sentry" });
      expect(mockSentry.setTag).toHaveBeenCalledWith("bundlenudge_release_id", "release-123");
      expect(mockSentry.setTag).toHaveBeenCalledWith("bundlenudge_bundle_version", "1.0.0");
      expect(mockSentry.setTag).toHaveBeenCalledWith("bundlenudge_bundle_hash", "abc123hash");
      expect(mockSentry.setTag).toHaveBeenCalledWith("bundlenudge_channel", "production");
      expect(mockSentry.setContext).toHaveBeenCalledWith("bundlenudge", metadata);
    });

    it("returns not tagged when Sentry is unavailable", () => {
      const result = tagSentry(metadata);
      expect(result).toEqual({ tagged: false, reporter: null });
    });

    it("handles partial metadata without optional fields", () => {
      const mockSentry = {
        setTag: vi.fn(),
        setContext: vi.fn(),
      };
      (globalThis as Record<string, unknown>).Sentry = mockSentry;

      const partialMetadata: ReleaseMetadata = {
        releaseId: "release-456",
        bundleVersion: "2.0.0",
      };

      const result = tagSentry(partialMetadata);

      expect(result).toEqual({ tagged: true, reporter: "sentry" });
      expect(mockSentry.setTag).toHaveBeenCalledTimes(2);
      expect(mockSentry.setTag).not.toHaveBeenCalledWith(
        "bundlenudge_bundle_hash",
        expect.anything(),
      );
    });

    it("handles errors gracefully", () => {
      const mockSentry = {
        setTag: vi.fn().mockImplementation(() => {
          throw new Error("Sentry error");
        }),
        setContext: vi.fn(),
      };
      (globalThis as Record<string, unknown>).Sentry = mockSentry;

      const result = tagSentry(metadata);

      expect(result).toEqual({
        tagged: false,
        reporter: "sentry",
        error: "Sentry error",
      });
    });
  });

  describe("tagBugsnag", () => {
    it("tags when Bugsnag is available globally", () => {
      const mockBugsnag = {
        addMetadata: vi.fn(),
        clearMetadata: vi.fn(),
      };
      (globalThis as Record<string, unknown>).Bugsnag = mockBugsnag;

      const result = tagBugsnag(metadata);

      expect(result).toEqual({ tagged: true, reporter: "bugsnag" });
      expect(mockBugsnag.addMetadata).toHaveBeenCalledWith("bundlenudge", metadata);
    });

    it("returns not tagged when Bugsnag is unavailable", () => {
      const result = tagBugsnag(metadata);
      expect(result).toEqual({ tagged: false, reporter: null });
    });

    it("handles errors gracefully", () => {
      const mockBugsnag = {
        addMetadata: vi.fn().mockImplementation(() => {
          throw new Error("Bugsnag error");
        }),
        clearMetadata: vi.fn(),
      };
      (globalThis as Record<string, unknown>).Bugsnag = mockBugsnag;

      const result = tagBugsnag(metadata);

      expect(result).toEqual({
        tagged: false,
        reporter: "bugsnag",
        error: "Bugsnag error",
      });
    });
  });

  describe("tagCrashlytics", () => {
    it("returns not tagged when Crashlytics is unavailable", () => {
      const result = tagCrashlytics(metadata);
      expect(result).toEqual({ tagged: false, reporter: null });
    });

    it("handles errors gracefully", () => {
      // Mock require to throw
      vi.doMock("@react-native-firebase/crashlytics", () => {
        throw new Error("Module not found");
      });

      const result = tagCrashlytics(metadata);
      expect(result.tagged).toBe(false);
    });
  });

  describe("tagCrashReporters", () => {
    it("returns array of results for all reporters", () => {
      const results = tagCrashReporters(metadata);

      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(3);
      expect(results.every((r) => "tagged" in r && "reporter" in r)).toBe(true);
    });

    it("tags all available reporters", () => {
      const mockSentry = {
        setTag: vi.fn(),
        setContext: vi.fn(),
      };
      const mockBugsnag = {
        addMetadata: vi.fn(),
        clearMetadata: vi.fn(),
      };
      (globalThis as Record<string, unknown>).Sentry = mockSentry;
      (globalThis as Record<string, unknown>).Bugsnag = mockBugsnag;

      const results = tagCrashReporters(metadata);

      const sentryResult = results.find((r) => r.reporter === "sentry");
      const bugsnagResult = results.find((r) => r.reporter === "bugsnag");

      expect(sentryResult?.tagged).toBe(true);
      expect(bugsnagResult?.tagged).toBe(true);
    });
  });

  describe("clearCrashReporterTags", () => {
    it("does not throw when no reporters available", () => {
      expect(() => {
        clearCrashReporterTags();
      }).not.toThrow();
    });

    it("clears Sentry tags when available", () => {
      const mockSentry = {
        setTag: vi.fn(),
        setContext: vi.fn(),
      };
      (globalThis as Record<string, unknown>).Sentry = mockSentry;

      clearCrashReporterTags();

      expect(mockSentry.setTag).toHaveBeenCalledWith("bundlenudge_release_id", "");
      expect(mockSentry.setTag).toHaveBeenCalledWith("bundlenudge_bundle_version", "");
    });

    it("clears Bugsnag metadata when available", () => {
      const mockBugsnag = {
        addMetadata: vi.fn(),
        clearMetadata: vi.fn(),
      };
      (globalThis as Record<string, unknown>).Bugsnag = mockBugsnag;

      clearCrashReporterTags();

      expect(mockBugsnag.clearMetadata).toHaveBeenCalledWith("bundlenudge");
    });

    it("handles errors during clear gracefully", () => {
      const mockSentry = {
        setTag: vi.fn().mockImplementation(() => {
          throw new Error("Clear error");
        }),
        setContext: vi.fn(),
      };
      (globalThis as Record<string, unknown>).Sentry = mockSentry;

      expect(() => {
        clearCrashReporterTags();
      }).not.toThrow();
    });
  });
});
