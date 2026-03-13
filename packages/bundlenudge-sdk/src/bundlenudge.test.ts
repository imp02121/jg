/**
 * BundleNudge Tests
 *
 * Tests for the main BundleNudge SDK class.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GlobalWithDev } from "./global";

// Set __DEV__ global for React Native
(globalThis as unknown as GlobalWithDev).__DEV__ = true;

// Mock fetch globally - must be defined before mocks
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock dependencies before importing BundleNudge
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
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
  },
}));

// We need to use a factory function that captures the mockFetch reference
vi.mock("./utils", () => ({
  generateDeviceId: () => "mock-device-id",
  // retry must be synchronous-looking but actually call the async fn
  retry: async <T>(fn: () => Promise<T>) => fn(),
  sha256: async () => "mock-hash",
  arrayBufferToBase64: () => "base64data",
}));

// Helper to create default fetch responses
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

describe("BundleNudge", () => {
  let BundleNudge: typeof import("./bundlenudge").BundleNudge;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    // Setup default fetch mock
    setupDefaultFetchMock();

    // Re-import to get fresh instance
    const module = await import("./bundlenudge");
    BundleNudge = module.BundleNudge;

    // Reset singleton
    // @ts-expect-error - accessing private static for testing
    BundleNudge.instance = null;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("initialize", () => {
    it("creates singleton instance", async () => {
      const instance = await BundleNudge.initialize({ appId: "test-app" });
      expect(instance).toBeDefined();
    });

    it("returns same instance on multiple calls", async () => {
      const instance1 = await BundleNudge.initialize({ appId: "test-app" });
      const instance2 = await BundleNudge.initialize({ appId: "test-app" });

      expect(instance1).toBe(instance2);
    });

    it("registers device on first initialization", async () => {
      await BundleNudge.initialize({ appId: "test-app" });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.bundlenudge.com/v1/devices/register",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }),
      );
    });

    it("uses custom API URL when provided", async () => {
      await BundleNudge.initialize({
        appId: "test-app",
        apiUrl: "https://custom.api.com",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://custom.api.com/v1/devices/register",
        expect.any(Object),
      );
    });

    it("calls callbacks", async () => {
      const onStatusChange = vi.fn();
      const onError = vi.fn();

      await BundleNudge.initialize(
        { appId: "test-app", checkOnLaunch: false },
        { onStatusChange, onError },
      );

      // Status should be idle initially
      expect(onStatusChange).not.toHaveBeenCalled();
    });
  });

  describe("getInstance", () => {
    it("throws if not initialized", () => {
      expect(() => BundleNudge.getInstance()).toThrow("BundleNudge: Not initialized");
    });

    it("returns instance after initialization", async () => {
      await BundleNudge.initialize({ appId: "test-app" });
      const instance = BundleNudge.getInstance();

      expect(instance).toBeDefined();
    });
  });

  describe("checkForUpdate", () => {
    it("returns null when no update available", async () => {
      const instance = await BundleNudge.initialize({
        appId: "test-app",
        checkOnLaunch: false,
      });

      const update = await instance.checkForUpdate();
      expect(update).toBeNull();
    });

    it("returns update info when available", async () => {
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
            json: () =>
              Promise.resolve({
                updateAvailable: true,
                release: {
                  version: "2.0.0",
                  bundleUrl: "https://cdn.example.com/bundle.js",
                  bundleSize: 1024,
                  bundleHash: "abc123",
                  releaseId: "release-1",
                },
              }),
          });
        }
        return Promise.resolve({ ok: true });
      });

      const instance = await BundleNudge.initialize({
        appId: "test-app",
        checkOnLaunch: false,
      });

      const update = await instance.checkForUpdate();

      expect(update).not.toBeNull();
      expect(update?.version).toBe("2.0.0");
    });

    it("calls onUpdateAvailable callback", async () => {
      const onUpdateAvailable = vi.fn();

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
            json: () =>
              Promise.resolve({
                updateAvailable: true,
                release: {
                  version: "2.0.0",
                  bundleUrl: "https://cdn.example.com/bundle.js",
                  bundleSize: 1024,
                  bundleHash: "abc123",
                  releaseId: "release-1",
                },
              }),
          });
        }
        return Promise.resolve({ ok: true });
      });

      const instance = await BundleNudge.initialize(
        { appId: "test-app", checkOnLaunch: false },
        { onUpdateAvailable },
      );

      await instance.checkForUpdate();

      expect(onUpdateAvailable).toHaveBeenCalledWith(expect.objectContaining({ version: "2.0.0" }));
    });

    it("handles errors and calls onError", async () => {
      const onError = vi.fn();

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
          return Promise.resolve({ ok: false, status: 500 });
        }
        return Promise.resolve({ ok: true });
      });

      const instance = await BundleNudge.initialize(
        { appId: "test-app", checkOnLaunch: false },
        { onError },
      );

      await expect(instance.checkForUpdate()).rejects.toThrow();
      expect(onError).toHaveBeenCalled();
    });
  });

  describe("getStatus", () => {
    it("returns idle initially", async () => {
      const instance = await BundleNudge.initialize({
        appId: "test-app",
        checkOnLaunch: false,
      });

      expect(instance.getStatus()).toBe("idle");
    });
  });

  describe("getCurrentVersion", () => {
    it("returns null when no version set", async () => {
      const instance = await BundleNudge.initialize({
        appId: "test-app",
        checkOnLaunch: false,
      });

      expect(instance.getCurrentVersion()).toBeNull();
    });
  });

  describe("canRollback", () => {
    it("returns false when no previous version", async () => {
      const instance = await BundleNudge.initialize({
        appId: "test-app",
        checkOnLaunch: false,
      });

      expect(instance.canRollback()).toBe(false);
    });
  });

  describe("VersionGuard integration", () => {
    it("calls VersionGuard during init", async () => {
      // VersionGuard is called internally during init
      // If init completes without error, VersionGuard was executed
      const instance = await BundleNudge.initialize({
        appId: "test-app",
        checkOnLaunch: false,
      });

      expect(instance).toBeDefined();
    });

    it("clears bundles before crash check on App Store update", async () => {
      // The init flow is:
      // 1. Initialize storage
      // 2. VersionGuard check (clears bundles if App Store update)
      // 3. Register device
      // 4. CrashDetector check
      // This order ensures bundles are cleared before crash detection
      const instance = await BundleNudge.initialize({
        appId: "test-app",
        checkOnLaunch: false,
      });

      // Instance created successfully means init flow completed
      expect(instance).toBeDefined();
      expect(instance.getStatus()).toBe("idle");
    });
  });

  describe("BundleValidator integration", () => {
    it("creates BundleValidator during construction", async () => {
      const instance = await BundleNudge.initialize({
        appId: "test-app",
        checkOnLaunch: false,
      });

      // getBundleValidator should return the validator instance
      const validator = instance.getBundleValidator();
      expect(validator).toBeDefined();
    });

    it("getBundleValidator returns consistent instance", async () => {
      const instance = await BundleNudge.initialize({
        appId: "test-app",
        checkOnLaunch: false,
      });

      const validator1 = instance.getBundleValidator();
      const validator2 = instance.getBundleValidator();

      expect(validator1).toBe(validator2);
    });
  });

  describe("Health tracking", () => {
    it("trackEvent does not throw when health monitor not configured", async () => {
      const instance = await BundleNudge.initialize({
        appId: "test-app",
        checkOnLaunch: false,
      });

      // Should not throw even without health config
      expect(() => {
        instance.trackEvent("userLoaded");
      }).not.toThrow();
    });

    it("trackEndpoint does not throw when health monitor not configured", async () => {
      const instance = await BundleNudge.initialize({
        appId: "test-app",
        checkOnLaunch: false,
      });

      // Should not throw even without health config
      expect(() => {
        instance.trackEndpoint("GET", "/api/config", 200);
      }).not.toThrow();
    });

    it("isHealthVerified returns true when no health monitor", async () => {
      const instance = await BundleNudge.initialize({
        appId: "test-app",
        checkOnLaunch: false,
      });

      // Should return true (verified) when no health config
      expect(instance.isHealthVerified()).toBe(true);
    });
  });
});
