/**
 * useAppStoreUpdate Hook Tests
 *
 * Tests for the React hook that exposes app store update state.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UpdateCheckResult } from "../types";

// Mock BundleNudge
const mockGetLastUpdateCheckResult = vi.fn();
const mockOnCheckResultChange = vi.fn();
let mockThrowOnGetInstance = false;

vi.mock("../bundlenudge", () => ({
  BundleNudge: {
    getInstance: () => {
      if (mockThrowOnGetInstance) {
        throw new Error("BundleNudge not initialized");
      }
      return {
        getLastUpdateCheckResult: mockGetLastUpdateCheckResult,
        onCheckResultChange: mockOnCheckResultChange,
      };
    },
  },
}));

// Mock Linking
const mockOpenURL = vi.fn();

vi.mock("react-native", () => ({
  Linking: {
    openURL: (...args: unknown[]) => mockOpenURL(...args),
  },
}));

// Track the latest result from useSyncExternalStore
let latestSubscribe: ((cb: () => void) => () => void) | null = null;
let latestGetSnapshot: (() => UpdateCheckResult | null) | null = null;

vi.mock("react", () => ({
  useSyncExternalStore: (
    subscribe: (cb: () => void) => () => void,
    getSnapshot: () => UpdateCheckResult | null,
  ): UpdateCheckResult | null => {
    latestSubscribe = subscribe;
    latestGetSnapshot = getSnapshot;
    return getSnapshot();
  },
  useCallback: <T>(fn: T): T => fn,
  useMemo: <T>(fn: () => T): T => fn(),
}));

// Import hook after mocks are set up
import { useAppStoreUpdate } from "./useAppStoreUpdate";

describe("useAppStoreUpdate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockThrowOnGetInstance = false;
    latestSubscribe = null;
    latestGetSnapshot = null;
    mockOnCheckResultChange.mockReturnValue(() => {
      /* noop */
    });
  });

  it("returns defaults when no check result exists", () => {
    mockGetLastUpdateCheckResult.mockReturnValue(null);

    const result = useAppStoreUpdate();

    expect(result.requiresAppStoreUpdate).toBe(false);
    expect(result.isUnverifiedNativeBuild).toBe(false);
    expect(result.message).toBeNull();
    expect(result.storeUrl).toBeNull();
    expect(result.reason).toBeNull();
  });

  it("returns defaults when SDK is not initialized", () => {
    mockThrowOnGetInstance = true;

    const result = useAppStoreUpdate();

    expect(result.requiresAppStoreUpdate).toBe(false);
    expect(result.isUnverifiedNativeBuild).toBe(false);
    expect(result.message).toBeNull();
    expect(result.storeUrl).toBeNull();
    expect(result.reason).toBeNull();
  });

  it("populates all fields when app store update is required", () => {
    mockGetLastUpdateCheckResult.mockReturnValue({
      updateAvailable: false,
      requiresAppStoreUpdate: true,
      appStoreMessage: "Please update to the latest version",
      appStoreUrl: "https://apps.apple.com/app/id123",
      reason: "known_mismatch",
    });

    const result = useAppStoreUpdate();

    expect(result.requiresAppStoreUpdate).toBe(true);
    expect(result.isUnverifiedNativeBuild).toBe(false);
    expect(result.message).toBe("Please update to the latest version");
    expect(result.storeUrl).toBe("https://apps.apple.com/app/id123");
    expect(result.reason).toBe("known_mismatch");
  });

  it("returns false values when no app store update required", () => {
    mockGetLastUpdateCheckResult.mockReturnValue({
      updateAvailable: true,
      requiresAppStoreUpdate: false,
    });

    const result = useAppStoreUpdate();

    expect(result.requiresAppStoreUpdate).toBe(false);
    expect(result.isUnverifiedNativeBuild).toBe(false);
    expect(result.message).toBeNull();
    expect(result.storeUrl).toBeNull();
    expect(result.reason).toBeNull();
  });

  it("detects unverified native build reason", () => {
    mockGetLastUpdateCheckResult.mockReturnValue({
      updateAvailable: false,
      requiresAppStoreUpdate: true,
      appStoreMessage: "Unverified build detected",
      reason: "unverified_native_version",
    });

    const result = useAppStoreUpdate();

    expect(result.isUnverifiedNativeBuild).toBe(true);
    expect(result.requiresAppStoreUpdate).toBe(true);
    expect(result.reason).toBe("unverified_native_version");
  });

  it("sets isUnverifiedNativeBuild to false for other reasons", () => {
    mockGetLastUpdateCheckResult.mockReturnValue({
      updateAvailable: false,
      requiresAppStoreUpdate: true,
      reason: "known_mismatch",
    });

    const result = useAppStoreUpdate();

    expect(result.isUnverifiedNativeBuild).toBe(false);
    expect(result.reason).toBe("known_mismatch");
  });

  it("openStore calls Linking.openURL with the store URL", () => {
    mockGetLastUpdateCheckResult.mockReturnValue({
      updateAvailable: false,
      requiresAppStoreUpdate: true,
      appStoreUrl: "https://play.google.com/store/apps/details?id=com.test",
    });

    const result = useAppStoreUpdate();
    result.openStore();

    expect(mockOpenURL).toHaveBeenCalledWith(
      "https://play.google.com/store/apps/details?id=com.test",
    );
  });

  it("openStore is a no-op when storeUrl is null", () => {
    mockGetLastUpdateCheckResult.mockReturnValue({
      updateAvailable: false,
      requiresAppStoreUpdate: true,
    });

    const result = useAppStoreUpdate();
    result.openStore();

    expect(mockOpenURL).not.toHaveBeenCalled();
  });

  it("calls getLastUpdateCheckResult from BundleNudge instance", () => {
    mockGetLastUpdateCheckResult.mockReturnValue(null);

    useAppStoreUpdate();

    expect(mockGetLastUpdateCheckResult).toHaveBeenCalledOnce();
  });

  it("subscribes to check result changes via useSyncExternalStore", () => {
    mockGetLastUpdateCheckResult.mockReturnValue(null);

    useAppStoreUpdate();

    // Verify subscribe was called (useSyncExternalStore receives it)
    expect(latestSubscribe).toBeTypeOf("function");
    expect(latestGetSnapshot).toBeTypeOf("function");
  });

  it("subscribe calls onCheckResultChange when SDK is initialized", () => {
    const mockUnsubscribe = vi.fn();
    mockOnCheckResultChange.mockReturnValue(mockUnsubscribe);
    mockGetLastUpdateCheckResult.mockReturnValue(null);

    useAppStoreUpdate();

    // Call the subscribe function that was passed to useSyncExternalStore
    const callback = vi.fn();
    const unsub = latestSubscribe?.(callback);

    expect(mockOnCheckResultChange).toHaveBeenCalledWith(callback);

    unsub();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it("subscribe returns noop when SDK is not initialized", () => {
    mockThrowOnGetInstance = true;

    useAppStoreUpdate();

    // subscribe should not throw even when getInstance throws
    const callback = vi.fn();
    const unsub = latestSubscribe?.(callback);
    expect(unsub).toBeTypeOf("function");
    // Should not throw
    unsub();
  });

  it("updates when check result changes after mount", () => {
    // Initially no result
    mockGetLastUpdateCheckResult.mockReturnValue(null);

    const result1 = useAppStoreUpdate();
    expect(result1.requiresAppStoreUpdate).toBe(false);

    // Simulate check result changing
    mockGetLastUpdateCheckResult.mockReturnValue({
      updateAvailable: false,
      requiresAppStoreUpdate: true,
      appStoreMessage: "Update now",
      appStoreUrl: "https://apps.apple.com/app/id456",
      reason: "known_mismatch",
    });

    // Re-call getSnapshot (simulating useSyncExternalStore re-render)
    const snapshot = latestGetSnapshot?.();
    expect(snapshot?.requiresAppStoreUpdate).toBe(true);
    expect(snapshot?.appStoreUrl).toBe("https://apps.apple.com/app/id456");
  });
});
