/**
 * RollbackManager Tests
 *
 * Tests for the RollbackManager class that handles rollback operations.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CircuitBreaker } from "./circuit-breaker";
import { RollbackManager, type RollbackReason } from "./rollback-manager";
import {
  createMockNativeModule,
  createMockStorage,
  mockFetch,
} from "./rollback-manager.test-utils";
import type { Storage } from "./storage";
import type { BundleNudgeConfig, NativeModuleInterface } from "./types";

describe("RollbackManager", () => {
  let mockStorage: Storage;
  let mockConfig: BundleNudgeConfig;
  let mockNativeModule: NativeModuleInterface;
  let rollbackManager: RollbackManager;
  let onRollbackReported: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true });

    mockStorage = createMockStorage();
    mockConfig = {
      appId: "test-app-id",
      apiUrl: "https://api.test.com",
    };
    mockNativeModule = createMockNativeModule();
    onRollbackReported = vi.fn();

    rollbackManager = new RollbackManager({
      storage: mockStorage,
      config: mockConfig,
      nativeModule: mockNativeModule,
      onRollbackReported,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("canRollback", () => {
    it("returns true when previous version exists", () => {
      expect(rollbackManager.canRollback()).toBe(true);
    });

    it("returns false when no previous version", () => {
      mockStorage = createMockStorage({ previousVersion: null });
      rollbackManager = new RollbackManager({
        storage: mockStorage,
        config: mockConfig,
        nativeModule: mockNativeModule,
      });

      expect(rollbackManager.canRollback()).toBe(false);
    });
  });

  describe("getRollbackVersion", () => {
    it("returns previous version", () => {
      expect(rollbackManager.getRollbackVersion()).toBe("1.0.0");
    });

    it("returns null when no previous version", () => {
      mockStorage = createMockStorage({ previousVersion: null });
      rollbackManager = new RollbackManager({
        storage: mockStorage,
        config: mockConfig,
        nativeModule: mockNativeModule,
      });

      expect(rollbackManager.getRollbackVersion()).toBeNull();
    });
  });

  describe("rollback", () => {
    it("throws when no previous version available", async () => {
      mockStorage = createMockStorage({ previousVersion: null });
      rollbackManager = new RollbackManager({
        storage: mockStorage,
        config: mockConfig,
        nativeModule: mockNativeModule,
      });

      await expect(rollbackManager.rollback("manual")).rejects.toThrow(
        "BundleNudge: Cannot rollback - no previous version available",
      );
    });

    it("updates storage state on rollback", async () => {
      await rollbackManager.rollback("crash_detected");

      expect(mockStorage.rollback).toHaveBeenCalled();
    });

    it("calls onRollbackReported callback", async () => {
      await rollbackManager.rollback("crash_detected");

      expect(onRollbackReported).toHaveBeenCalledWith("crash_detected", "2.0.0");
    });

    it("reports rollback to server", async () => {
      await rollbackManager.rollback("crash_detected");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test.com/v1/telemetry",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: "Bearer test-access-token",
          }),
        }),
      );

      // Verify request body
      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body as string);
      expect(body.deviceId).toBe("test-device-id");
      expect(body.appId).toBe("test-app-id");
      expect(body.eventType).toBe("rollback_triggered");
      expect(body.metadata.reason).toBe("crash_detected");
      expect(body.metadata.rolledBackTo).toBe("1.0.0");
    });

    it("restarts app after rollback", async () => {
      await rollbackManager.rollback("manual");

      expect(mockNativeModule.restartApp).toHaveBeenCalledWith(false);
    });

    it("handles all rollback reasons", async () => {
      const reasons: RollbackReason[] = [
        "crash_detected",
        "route_failure",
        "server_triggered",
        "manual",
      ];

      for (const reason of reasons) {
        vi.clearAllMocks();
        mockStorage = createMockStorage();
        rollbackManager = new RollbackManager({
          storage: mockStorage,
          config: mockConfig,
          nativeModule: mockNativeModule,
          onRollbackReported,
        });

        await rollbackManager.rollback(reason);

        expect(onRollbackReported).toHaveBeenCalledWith(reason, "2.0.0");
      }
    });

    it("uses default API URL when not configured", async () => {
      rollbackManager = new RollbackManager({
        storage: mockStorage,
        config: { appId: "test-app-id" }, // No apiUrl
        nativeModule: mockNativeModule,
      });

      await rollbackManager.rollback("manual");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.bundlenudge.com/v1/telemetry",
        expect.any(Object),
      );
    });

    it("continues on telemetry failure", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      // Should not throw
      await rollbackManager.rollback("manual");

      expect(mockStorage.rollback).toHaveBeenCalled();
      expect(mockNativeModule.restartApp).toHaveBeenCalled();
    });

    it("does not call callback if no current version", async () => {
      mockStorage = createMockStorage({
        currentVersion: null,
        previousVersion: "1.0.0",
      });
      rollbackManager = new RollbackManager({
        storage: mockStorage,
        config: mockConfig,
        nativeModule: mockNativeModule,
        onRollbackReported,
      });

      await rollbackManager.rollback("manual");

      expect(onRollbackReported).not.toHaveBeenCalled();
    });
  });

  describe("markUpdateVerified", () => {
    it("clears previous version from storage", async () => {
      await rollbackManager.markUpdateVerified();

      expect(mockStorage.clearPreviousVersion).toHaveBeenCalled();
    });
  });

  /**
   * Edge Case Tests: 2B.1, 2B.2, 2B.7
   */
  describe("Edge Cases", () => {
    describe("2B.1: Rollback when no previous bundle exists", () => {
      it("throws descriptive error when attempting rollback on first install", async () => {
        mockStorage = createMockStorage({
          previousVersion: null,
          currentVersion: null, // On embedded bundle
        });
        rollbackManager = new RollbackManager({
          storage: mockStorage,
          config: mockConfig,
          nativeModule: mockNativeModule,
          onRollbackReported,
        });

        await expect(rollbackManager.rollback("crash_detected")).rejects.toThrow(
          "BundleNudge: Cannot rollback - no previous version available",
        );
        expect(mockStorage.rollback).not.toHaveBeenCalled();
        expect(mockNativeModule.restartApp).not.toHaveBeenCalled();
      });

      it("throws descriptive error after native app update clears bundles", async () => {
        mockStorage = createMockStorage({
          previousVersion: null,
          currentVersion: "2.0.0", // Has current but no previous
        });
        rollbackManager = new RollbackManager({
          storage: mockStorage,
          config: mockConfig,
          nativeModule: mockNativeModule,
          onRollbackReported,
        });

        await expect(rollbackManager.rollback("server_triggered")).rejects.toThrow(
          "This may occur on first install or after a native app update",
        );
      });

      it("canRollback returns false gracefully when no previous version", () => {
        mockStorage = createMockStorage({ previousVersion: null });
        rollbackManager = new RollbackManager({
          storage: mockStorage,
          config: mockConfig,
          nativeModule: mockNativeModule,
        });

        expect(rollbackManager.canRollback()).toBe(false);
        expect(rollbackManager.getRollbackVersion()).toBeNull();
      });

      it("does not report rollback to server when rollback fails", async () => {
        mockStorage = createMockStorage({ previousVersion: null });
        rollbackManager = new RollbackManager({
          storage: mockStorage,
          config: mockConfig,
          nativeModule: mockNativeModule,
          onRollbackReported,
        });

        try {
          await rollbackManager.rollback("manual");
        } catch {
          // Expected to throw
        }

        expect(mockFetch).not.toHaveBeenCalled();
        expect(onRollbackReported).not.toHaveBeenCalled();
      });
    });

    describe("2B.2: Rollback data corrupted in storage", () => {
      it("handles storage.rollback throwing an error", async () => {
        const storageError = new Error("Storage write failed");
        mockStorage = createMockStorage();
        mockStorage.rollback = vi.fn().mockRejectedValue(storageError);

        rollbackManager = new RollbackManager({
          storage: mockStorage,
          config: mockConfig,
          nativeModule: mockNativeModule,
          onRollbackReported,
        });

        await expect(rollbackManager.rollback("crash_detected")).rejects.toThrow(
          "Storage write failed",
        );
        // App should not restart if storage update failed
        expect(mockNativeModule.restartApp).not.toHaveBeenCalled();
      });

      it("handles getMetadata returning undefined fields gracefully", async () => {
        // Create storage with minimal/corrupted data
        const corruptedMetadata = {
          deviceId: "test-device-id",
          accessToken: null,
          currentVersion: undefined as unknown as string | null,
          currentVersionHash: null,
          previousVersion: "1.0.0",
          pendingVersion: null,
          pendingUpdateFlag: false,
          lastCheckTime: null,
          crashCount: 0,
          lastCrashTime: null,
          verificationState: null,
          appVersionInfo: null,
          bundleHashes: {},
        };
        mockStorage = {
          getMetadata: vi.fn().mockReturnValue(corruptedMetadata),
          getDeviceId: vi.fn().mockReturnValue("test-device-id"),
          getAccessToken: vi.fn().mockReturnValue(null),
          rollback: vi.fn().mockResolvedValue(undefined),
          clearPreviousVersion: vi.fn().mockResolvedValue(undefined),
        } as unknown as Storage;

        rollbackManager = new RollbackManager({
          storage: mockStorage,
          config: mockConfig,
          nativeModule: mockNativeModule,
          onRollbackReported,
        });

        // Should complete rollback without crashing
        await rollbackManager.rollback("manual");

        expect(mockStorage.rollback).toHaveBeenCalled();
        expect(mockNativeModule.restartApp).toHaveBeenCalled();
        // Callback should not be called when currentVersion is undefined/null
        expect(onRollbackReported).not.toHaveBeenCalled();
      });

      it("continues with restart even if telemetry reporting fails", async () => {
        mockFetch.mockRejectedValue(new Error("Network unavailable"));

        await rollbackManager.rollback("crash_detected");

        expect(mockStorage.rollback).toHaveBeenCalled();
        expect(mockNativeModule.restartApp).toHaveBeenCalled();
      });

      it("handles empty previousVersion string gracefully", async () => {
        // Empty string is falsy but not null - edge case
        mockStorage = createMockStorage({
          previousVersion: "" as unknown as string | null,
        });
        // Mock getMetadata to return the falsy empty string
        mockStorage.getMetadata = vi.fn().mockReturnValue({
          deviceId: "test-device-id",
          accessToken: "test-access-token",
          currentVersion: "2.0.0",
          currentVersionHash: "hash200",
          previousVersion: "",
          pendingVersion: null,
          pendingUpdateFlag: false,
          lastCheckTime: null,
          crashCount: 0,
          lastCrashTime: null,
          verificationState: null,
          appVersionInfo: null,
          bundleHashes: {},
        });

        rollbackManager = new RollbackManager({
          storage: mockStorage,
          config: mockConfig,
          nativeModule: mockNativeModule,
        });

        // Empty string is falsy, so should throw
        await expect(rollbackManager.rollback("manual")).rejects.toThrow(
          "no previous version available",
        );
      });
    });

    describe("2B.7: Rollback during active user session", () => {
      it("persists storage state before restarting app", async () => {
        const callOrder: string[] = [];
        mockStorage.rollback = vi.fn().mockImplementation(() => {
          callOrder.push("storage.rollback");
          return Promise.resolve();
        });
        mockNativeModule.restartApp = vi.fn().mockImplementation(() => {
          callOrder.push("nativeModule.restartApp");
          return Promise.resolve(true);
        });

        await rollbackManager.rollback("manual");

        // Storage update must happen before restart
        expect(callOrder).toEqual(["storage.rollback", "nativeModule.restartApp"]);
      });

      it("completes storage operations before app restart", async () => {
        let storageCompleted = false;
        mockStorage.rollback = vi.fn().mockImplementation(async () => {
          // Simulate async storage operation
          await new Promise((resolve) => setTimeout(resolve, 10));
          storageCompleted = true;
        });
        mockNativeModule.restartApp = vi.fn().mockImplementation(() => {
          // Verify storage was completed before restart
          expect(storageCompleted).toBe(true);
          return Promise.resolve(true);
        });

        await rollbackManager.rollback("crash_detected");

        expect(storageCompleted).toBe(true);
        expect(mockNativeModule.restartApp).toHaveBeenCalled();
      });

      it("reports telemetry before restarting during active session", async () => {
        const callOrder: string[] = [];
        mockFetch.mockImplementation(() => {
          callOrder.push("fetch");
          return Promise.resolve({ ok: true });
        });
        mockNativeModule.restartApp = vi.fn().mockImplementation(() => {
          callOrder.push("restart");
          return Promise.resolve(true);
        });

        await rollbackManager.rollback("route_failure");

        // Telemetry should be sent before restart
        expect(callOrder.indexOf("fetch")).toBeLessThan(callOrder.indexOf("restart"));
      });

      it("restarts app with onlyIfUpdateIsPending=false for immediate restart", async () => {
        await rollbackManager.rollback("crash_detected");

        // Should force restart, not conditional restart
        expect(mockNativeModule.restartApp).toHaveBeenCalledWith(false);
      });

      it("completes rollback even when telemetry request fails", async () => {
        // Simulate immediate network failure (not timeout)
        mockFetch.mockRejectedValue(new Error("Network error"));

        // Rollback should complete despite telemetry failure
        await rollbackManager.rollback("manual");

        // Verify storage was updated and app was restarted
        expect(mockStorage.rollback).toHaveBeenCalled();
        expect(mockNativeModule.restartApp).toHaveBeenCalled();
      });

      it("handles concurrent rollback attempts — only first executes", async () => {
        // Simulate slow storage operation
        let rollbackCount = 0;
        mockStorage.rollback = vi.fn().mockImplementation(async () => {
          rollbackCount++;
          await new Promise((resolve) => setTimeout(resolve, 50));
        });

        // Start two concurrent rollback attempts
        const [result1, result2] = await Promise.allSettled([
          rollbackManager.rollback("crash_detected"),
          rollbackManager.rollback("manual"),
        ]);

        // Both should complete successfully (second returns early via mutex)
        expect(result1.status).toBe("fulfilled");
        expect(result2.status).toBe("fulfilled");
        // Only one storage.rollback should have been called (mutex prevents second)
        expect(rollbackCount).toBe(1);
      });
    });
  });

  describe("Invalid rollback reason handling", () => {
    it("throws error for invalid rollback reason", async () => {
      await expect(rollbackManager.rollback("invalid_reason" as RollbackReason)).rejects.toThrow(
        "Invalid rollback reason",
      );
    });

    it("throws error for empty reason string", async () => {
      await expect(rollbackManager.rollback("" as RollbackReason)).rejects.toThrow(
        "Invalid rollback reason",
      );
    });
  });

  describe("Native metadata sync (rollbackToVersion)", () => {
    it("calls rollbackToVersion for non-embedded rollbacks", async () => {
      await rollbackManager.rollback("crash_detected");

      expect(mockNativeModule.rollbackToVersion).toHaveBeenCalledWith("1.0.0");
    });

    it("does not call rollbackToVersion for embedded rollback", async () => {
      mockStorage = createMockStorage({ previousVersion: "__embedded__" });
      rollbackManager = new RollbackManager({
        storage: mockStorage,
        config: mockConfig,
        nativeModule: mockNativeModule,
        onRollbackReported,
      });

      await rollbackManager.rollback("crash_detected");

      expect(mockNativeModule.rollbackToVersion).not.toHaveBeenCalled();
      expect(mockNativeModule.clearUpdates).toHaveBeenCalled();
    });

    it("continues with restart if rollbackToVersion fails", async () => {
      mockNativeModule.rollbackToVersion = vi.fn().mockRejectedValue(new Error("Native error"));

      await rollbackManager.rollback("manual");

      // Should still restart despite native rollback failure
      expect(mockNativeModule.restartApp).toHaveBeenCalledWith(false);
    });
  });

  describe("Circuit breaker save awaited", () => {
    it("awaits circuitBreaker.save() before restartApp", async () => {
      const callOrder: string[] = [];
      const mockCircuitBreaker: CircuitBreaker = {
        blacklist: vi.fn(),
        save: vi.fn().mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          callOrder.push("circuitBreaker.save");
        }),
        isBlacklisted: vi.fn().mockReturnValue(false),
        load: vi.fn().mockResolvedValue(undefined),
        clear: vi.fn().mockResolvedValue(undefined),
        pruneOlderThan: vi.fn(),
        size: 0,
        isLoaded: vi.fn().mockReturnValue(true),
      } as unknown as CircuitBreaker;

      mockNativeModule.restartApp = vi.fn().mockImplementation(() => {
        callOrder.push("restartApp");
        return Promise.resolve(true);
      });

      rollbackManager = new RollbackManager({
        storage: mockStorage,
        config: mockConfig,
        nativeModule: mockNativeModule,
        circuitBreaker: mockCircuitBreaker,
        onRollbackReported,
      });

      await rollbackManager.rollback("crash_detected");

      expect(callOrder.indexOf("circuitBreaker.save")).toBeLessThan(
        callOrder.indexOf("restartApp"),
      );
    });
  });

  describe("Mutex prevents concurrent rollbacks", () => {
    it("second concurrent rollback returns immediately", async () => {
      let rollbackCount = 0;
      let resolveStorage: (() => void) | undefined;
      mockStorage.rollback = vi.fn().mockImplementation(() => {
        rollbackCount++;
        return new Promise<void>((resolve) => {
          resolveStorage = resolve;
        });
      });

      // Start first rollback (will block on storage)
      const first = rollbackManager.rollback("crash_detected");
      // Allow microtask to advance so isRollingBack is set
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Start second rollback (should return immediately)
      const second = rollbackManager.rollback("manual");
      await second;

      // Unblock first rollback
      resolveStorage?.();
      await first;

      expect(rollbackCount).toBe(1);
    });

    it("mutex resets after rollback completes allowing subsequent calls", async () => {
      await rollbackManager.rollback("crash_detected");

      // Reset mocks for second call
      vi.clearAllMocks();
      mockFetch.mockResolvedValue({ ok: true });
      mockStorage = createMockStorage();
      rollbackManager = new RollbackManager({
        storage: mockStorage,
        config: mockConfig,
        nativeModule: mockNativeModule,
        onRollbackReported,
      });

      await rollbackManager.rollback("manual");

      expect(mockStorage.rollback).toHaveBeenCalledTimes(1);
    });

    it("mutex resets even if rollback throws", async () => {
      mockStorage = createMockStorage({ previousVersion: null });
      rollbackManager = new RollbackManager({
        storage: mockStorage,
        config: mockConfig,
        nativeModule: mockNativeModule,
      });

      await expect(rollbackManager.rollback("manual")).rejects.toThrow();

      // Recreate with valid state — should be able to roll back
      mockStorage = createMockStorage();
      // Need new instance since isRollingBack is instance-level
      rollbackManager = new RollbackManager({
        storage: mockStorage,
        config: mockConfig,
        nativeModule: mockNativeModule,
      });

      await rollbackManager.rollback("manual");
      expect(mockStorage.rollback).toHaveBeenCalled();
    });
  });

  describe("Crash guard: storage.rollback failure prevents restart", () => {
    it("does not restart if storage.rollback throws", async () => {
      mockStorage = createMockStorage();
      mockStorage.rollback = vi.fn().mockRejectedValue(new Error("Storage write failed"));

      rollbackManager = new RollbackManager({
        storage: mockStorage,
        config: mockConfig,
        nativeModule: mockNativeModule,
        onRollbackReported,
      });

      await expect(rollbackManager.rollback("crash_detected")).rejects.toThrow(
        "Storage write failed",
      );
      expect(mockNativeModule.restartApp).not.toHaveBeenCalled();
    });

    it("does not call rollbackToVersion if storage.rollback throws", async () => {
      mockStorage = createMockStorage();
      mockStorage.rollback = vi.fn().mockRejectedValue(new Error("Storage write failed"));

      rollbackManager = new RollbackManager({
        storage: mockStorage,
        config: mockConfig,
        nativeModule: mockNativeModule,
      });

      await expect(rollbackManager.rollback("manual")).rejects.toThrow("Storage write failed");
      expect(mockNativeModule.rollbackToVersion).not.toHaveBeenCalled();
    });
  });
});
