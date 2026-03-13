/** Native Helper Tests */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({ Platform: { OS: "ios" } }));

const mockModule = {
  getConfiguration: vi.fn(),
  getCurrentBundleInfo: vi.fn(),
  getBundlePath: vi.fn(),
  notifyAppReady: vi.fn(),
  restartApp: vi.fn(),
  clearUpdates: vi.fn(),
  saveBundleToStorage: vi.fn(),
};
let mockIsNative = false;

vi.mock("../native-module", () => ({
  getModuleWithFallback: () => ({ module: mockModule, isNative: mockIsNative }),
}));
vi.mock("../utils", () => ({ sleep: vi.fn().mockResolvedValue(undefined) }));

describe("native/helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsNative = false;
  });

  describe("restartApp", () => {
    it("returns false when native unavailable", async () => {
      const { restartApp } = await import("./helpers");
      expect(await restartApp()).toBe(false);
      expect(mockModule.restartApp).not.toHaveBeenCalled();
    });
    it("calls native module when available", async () => {
      mockIsNative = true;
      mockModule.restartApp.mockResolvedValue(true);
      const { restartApp } = await import("./helpers");
      expect(await restartApp()).toBe(true);
      expect(mockModule.restartApp).toHaveBeenCalledWith(true);
    });
    it("respects delay option", async () => {
      mockIsNative = true;
      mockModule.restartApp.mockResolvedValue(true);
      const { sleep } = await import("../utils");
      const { restartApp } = await import("./helpers");
      await restartApp({ delay: 1000 });
      expect(sleep).toHaveBeenCalledWith(1000);
    });
    it("returns false on native error", async () => {
      mockIsNative = true;
      mockModule.restartApp.mockRejectedValue(new Error("err"));
      const { restartApp } = await import("./helpers");
      expect(await restartApp()).toBe(false);
    });
  });

  describe("clearAllUpdates", () => {
    it("returns false when native unavailable", async () => {
      const { clearAllUpdates } = await import("./helpers");
      expect(await clearAllUpdates()).toBe(false);
    });
    it("calls native module when available", async () => {
      mockIsNative = true;
      mockModule.clearUpdates.mockResolvedValue(true);
      const { clearAllUpdates } = await import("./helpers");
      expect(await clearAllUpdates()).toBe(true);
    });
  });

  describe("notifyAppReady", () => {
    it("returns false when native unavailable", async () => {
      const { notifyAppReady } = await import("./helpers");
      expect(await notifyAppReady()).toBe(false);
    });
    it("calls native module when available", async () => {
      mockIsNative = true;
      mockModule.notifyAppReady.mockResolvedValue(true);
      const { notifyAppReady } = await import("./helpers");
      expect(await notifyAppReady()).toBe(true);
    });
  });

  describe("getCurrentBundlePath", () => {
    it("returns null when native unavailable", async () => {
      const { getCurrentBundlePath } = await import("./helpers");
      expect(await getCurrentBundlePath()).toBeNull();
    });
    it("returns bundle path when available", async () => {
      mockIsNative = true;
      mockModule.getBundlePath.mockResolvedValue("/path/to/bundle.js");
      const { getCurrentBundlePath } = await import("./helpers");
      expect(await getCurrentBundlePath()).toBe("/path/to/bundle.js");
    });
  });

  describe("hasPendingUpdate", () => {
    it("returns false when native unavailable", async () => {
      const { hasPendingUpdate } = await import("./helpers");
      expect(await hasPendingUpdate()).toBe(false);
    });
    it("returns true when pending version exists", async () => {
      mockIsNative = true;
      mockModule.getCurrentBundleInfo.mockResolvedValue({ pendingVersion: "1.1.0" });
      const { hasPendingUpdate } = await import("./helpers");
      expect(await hasPendingUpdate()).toBe(true);
    });
    it("returns false when no pending version", async () => {
      mockIsNative = true;
      mockModule.getCurrentBundleInfo.mockResolvedValue({ pendingVersion: null });
      const { hasPendingUpdate } = await import("./helpers");
      expect(await hasPendingUpdate()).toBe(false);
    });
  });

  describe("getNativeInfo", () => {
    it("returns correct info when native unavailable", async () => {
      const { getNativeInfo } = await import("./helpers");
      expect(getNativeInfo()).toEqual({ isAvailable: false, platform: "ios", sdkVersion: null });
    });
    it("returns correct info when native available", async () => {
      mockIsNative = true;
      const { getNativeInfo } = await import("./helpers");
      expect(getNativeInfo()).toEqual({ isAvailable: true, platform: "ios", sdkVersion: "0.0.1" });
    });
  });
});
