/**
 * BundleNudge getReleaseInfo Tests
 *
 * Tests for the getReleaseInfo method that returns OTA version and changelog.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GlobalWithDev } from "./global";
(globalThis as unknown as GlobalWithDev).__DEV__ = true;

const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockGetItem = vi.fn();
const mockSetItem = vi.fn();

vi.mock("react-native", () => ({
  NativeModules: { BundleNudge: null },
  Platform: { OS: "ios" },
  AppState: {
    currentState: "active",
    addEventListener: vi.fn(() => ({ remove: vi.fn() })),
  },
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: (...args: unknown[]) => mockGetItem(...args),
    setItem: (...args: unknown[]) => mockSetItem(...args),
  },
}));

vi.mock("./utils", () => ({
  generateDeviceId: () => "mock-device-id",
  retry: async <T>(fn: () => Promise<T>) => fn(),
  sha256: async () => "mock-hash",
  arrayBufferToBase64: () => "base64data",
}));

function setupDefaultFetchMock(): void {
  mockFetch.mockImplementation((url: string) => {
    if (url.includes("/devices/register")) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            accessToken: "test-token",
            expiresAt: Date.now() + 3600000,
          }),
      });
    }
    if (url.includes("/updates/check")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ updateAvailable: false }),
      });
    }
    return Promise.resolve({ ok: true });
  });
}

function createStoredMetadata(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    deviceId: "stored-device",
    accessToken: "existing-token",
    currentVersion: null,
    currentVersionHash: null,
    previousVersion: null,
    pendingVersion: null,
    pendingUpdateFlag: false,
    lastCheckTime: null,
    crashCount: 0,
    lastCrashTime: null,
    verificationState: null,
    appVersionInfo: null,
    bundleHashes: {},
    currentReleaseNotes: null,
    currentReleasedAt: null,
    pendingReleaseNotes: null,
    pendingReleasedAt: null,
    ...overrides,
  });
}

describe("BundleNudge - getReleaseInfo", () => {
  let BundleNudge: typeof import("./bundlenudge").BundleNudge;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    setupDefaultFetchMock();
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue(undefined);
    const module = await import("./bundlenudge");
    BundleNudge = module.BundleNudge;
    // @ts-expect-error - accessing private static for testing
    BundleNudge.instance = null;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("returns isOtaUpdate false when no OTA version active", async () => {
    const instance = await BundleNudge.initialize({
      appId: "test-app",
      checkOnLaunch: false,
    });

    const info = instance.getReleaseInfo();

    expect(info.version).toBeNull();
    expect(info.isOtaUpdate).toBe(false);
  });

  it("returns null fields when no release notes stored", async () => {
    const instance = await BundleNudge.initialize({
      appId: "test-app",
      checkOnLaunch: false,
    });

    const info = instance.getReleaseInfo();

    expect(info.releaseNotes).toBeNull();
    expect(info.releasedAt).toBeNull();
  });

  it("returns version and release notes from storage", async () => {
    mockGetItem.mockResolvedValue(
      createStoredMetadata({
        currentVersion: "3.0.0",
        currentReleaseNotes: "Bug fixes and improvements.",
        currentReleasedAt: "2026-01-15T10:00:00Z",
        appVersionInfo: {
          appVersion: "1.0.0",
          buildNumber: "1",
          recordedAt: Date.now(),
        },
      }),
    );

    const instance = await BundleNudge.initialize({
      appId: "test-app",
      checkOnLaunch: false,
    });

    const info = instance.getReleaseInfo();

    expect(info.version).toBe("3.0.0");
    expect(info.releaseNotes).toBe("Bug fixes and improvements.");
    expect(info.releasedAt).toBe("2026-01-15T10:00:00Z");
    expect(info.isOtaUpdate).toBe(true);
  });

  it("returns BundleReleaseInfo shape", async () => {
    const instance = await BundleNudge.initialize({
      appId: "test-app",
      checkOnLaunch: false,
    });

    const info = instance.getReleaseInfo();

    expect(info).toHaveProperty("version");
    expect(info).toHaveProperty("releaseNotes");
    expect(info).toHaveProperty("releasedAt");
    expect(info).toHaveProperty("isOtaUpdate");
  });
});
