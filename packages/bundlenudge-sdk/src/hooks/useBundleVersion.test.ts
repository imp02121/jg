/**
 * useBundleVersion Hook Tests
 *
 * Tests for the React hook that exposes OTA bundle version and release notes.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BundleReleaseInfo } from "../bundlenudge";

// Mock BundleNudge
const mockGetReleaseInfo = vi.fn();
let mockThrowOnGetInstance = false;

vi.mock("../bundlenudge", () => ({
  BundleNudge: {
    getInstance: () => {
      if (mockThrowOnGetInstance) {
        throw new Error("BundleNudge not initialized");
      }
      return { getReleaseInfo: mockGetReleaseInfo };
    },
  },
}));

// Track state updates from useState (like useBundleNudge.test.ts pattern)
let capturedInfo: BundleReleaseInfo = {
  version: null,
  releaseNotes: null,
  releasedAt: null,
  isOtaUpdate: false,
};

vi.mock("react", () => ({
  useState: <T>(initial: T): [T, (val: T) => void] => {
    const setState = (val: T): void => {
      capturedInfo = val as BundleReleaseInfo;
    };
    return [initial, setState];
  },
  useEffect: (callback: () => void): void => {
    callback();
  },
}));

// Import hook after mocks are set up
import { useBundleVersion } from "./useBundleVersion";

describe("useBundleVersion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockThrowOnGetInstance = false;
    capturedInfo = {
      version: null,
      releaseNotes: null,
      releasedAt: null,
      isOtaUpdate: false,
    };
  });

  it("returns default values when no OTA update is active", () => {
    mockGetReleaseInfo.mockReturnValue({
      version: null,
      releaseNotes: null,
      releasedAt: null,
      isOtaUpdate: false,
    });

    const result = useBundleVersion();

    // Initial return is the default from useState
    expect(result.version).toBeNull();
    expect(result.isOtaUpdate).toBe(false);

    // useEffect sets state with getReleaseInfo result
    expect(capturedInfo.version).toBeNull();
    expect(capturedInfo.releaseNotes).toBeNull();
    expect(capturedInfo.releasedAt).toBeNull();
    expect(capturedInfo.isOtaUpdate).toBe(false);
  });

  it("sets state with correct info when OTA update applied", () => {
    mockGetReleaseInfo.mockReturnValue({
      version: "2.5.0",
      releaseNotes: "Fixed login bug and improved performance.",
      releasedAt: "2026-02-01T12:00:00Z",
      isOtaUpdate: true,
    });

    useBundleVersion();

    expect(capturedInfo.version).toBe("2.5.0");
    expect(capturedInfo.releaseNotes).toBe("Fixed login bug and improved performance.");
    expect(capturedInfo.releasedAt).toBe("2026-02-01T12:00:00Z");
    expect(capturedInfo.isOtaUpdate).toBe(true);
  });

  it("handles null release notes gracefully", () => {
    mockGetReleaseInfo.mockReturnValue({
      version: "1.2.0",
      releaseNotes: null,
      releasedAt: null,
      isOtaUpdate: true,
    });

    useBundleVersion();

    expect(capturedInfo.version).toBe("1.2.0");
    expect(capturedInfo.releaseNotes).toBeNull();
    expect(capturedInfo.releasedAt).toBeNull();
    expect(capturedInfo.isOtaUpdate).toBe(true);
  });

  it("keeps defaults when SDK is not initialized", () => {
    mockThrowOnGetInstance = true;

    useBundleVersion();

    // setInfo is never called since getInstance throws
    expect(capturedInfo.version).toBeNull();
    expect(capturedInfo.releaseNotes).toBeNull();
    expect(capturedInfo.releasedAt).toBeNull();
    expect(capturedInfo.isOtaUpdate).toBe(false);
  });

  it("calls getReleaseInfo from BundleNudge instance", () => {
    mockGetReleaseInfo.mockReturnValue({
      version: null,
      releaseNotes: null,
      releasedAt: null,
      isOtaUpdate: false,
    });

    useBundleVersion();

    expect(mockGetReleaseInfo).toHaveBeenCalledOnce();
  });
});
