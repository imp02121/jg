import { createHash } from "node:crypto";
/** Updater Integration Tests — end-to-end update flows with real SHA-256 hashes. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CircuitBreaker } from "./circuit-breaker";
import type { Storage } from "./storage";
import type { NativeModuleInterface, UpdateInfo } from "./types";
import { Updater } from "./updater";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

vi.mock("react-native", () => ({ Platform: { OS: "ios" } }));
vi.mock("./utils", () => ({
  retry: async <T>(fn: () => Promise<T>) => fn(),
}));
vi.mock("./debug/logger", () => ({
  logInfo: vi.fn(),
  logWarn: vi.fn(),
  logError: vi.fn(),
}));
vi.mock("./native-compatibility", () => ({
  generateDeviceFingerprint: () => Promise.resolve(null),
}));
vi.mock("./updater-device-info", () => ({
  safeCollectDeviceInfo: () => ({}),
}));
vi.mock("./timeout-utils", () => ({
  withTimeout: <T>(p: Promise<T>) => p,
}));

function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

const BUNDLE_V1 = "bundle-content-v1.0.1";
const HASH_V1 = sha256(BUNDLE_V1);
const BUNDLE_V2 = "bundle-content-v2.0.0";
const HASH_V2 = sha256(BUNDLE_V2);

function makeUpdate(version: string, hash: string): UpdateInfo {
  return {
    version,
    bundleUrl: `https://cdn.bundlenudge.com/${version}/bundle.hbc`,
    bundleSize: 10240,
    bundleHash: hash,
    releaseId: `release-${version}`,
  };
}

function makeStorage(overrides: Record<string, unknown> = {}): Storage {
  return {
    getDeviceId: vi.fn().mockReturnValue("device-001"),
    getAccessToken: vi.fn().mockReturnValue(null),
    getCurrentVersion: vi.fn().mockReturnValue(null),
    setPendingUpdate: vi.fn().mockResolvedValue(undefined),
    getMetadata: vi.fn().mockReturnValue({
      storedRuntimeFingerprint: null,
      expectedNativeModules: null,
      pendingVersionHash: null,
    }),
    updateMetadata: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as Storage;
}

function makeNativeModule(hashOverride?: string): NativeModuleInterface {
  return {
    getConfiguration: vi.fn().mockResolvedValue({
      appVersion: "2.0.0",
      buildNumber: "100",
      bundleId: "com.test.app",
    }),
    getCurrentBundleInfo: vi.fn().mockResolvedValue(null),
    getBundlePath: vi.fn().mockResolvedValue(null),
    notifyAppReady: vi.fn().mockResolvedValue(true),
    restartApp: vi.fn().mockResolvedValue(true),
    clearUpdates: vi.fn().mockResolvedValue(true),
    saveBundleToStorage: vi.fn().mockResolvedValue("/b/bundle.js"),
    hashFile: vi.fn().mockResolvedValue(hashOverride ?? HASH_V1),
    setUpdateInfo: vi.fn().mockResolvedValue(true),
    downloadBundleToStorage: vi.fn().mockResolvedValue({
      path: "/b/bundle.js",
      hash: hashOverride ?? HASH_V1,
    }),
    deleteBundleVersion: vi.fn().mockResolvedValue(true),
    rollbackToVersion: vi.fn().mockResolvedValue(true),
    getFreeDiskSpace: vi.fn().mockResolvedValue(1024 * 1024 * 1024),
    addListener: vi.fn(),
    removeListeners: vi.fn(),
  };
}

function mockCheckResponse(hash: string, version: string): void {
  mockFetch.mockImplementation((url: string) => {
    if (url.includes("/updates/check")) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            updateAvailable: true,
            release: {
              version,
              bundleUrl: `https://cdn.bundlenudge.com/${version}/b.hbc`,
              bundleSize: 10240,
              bundleHash: hash,
              releaseId: `release-${version}`,
            },
          }),
      });
    }
    return Promise.resolve({ ok: true });
  });
}

describe("Updater Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockImplementation(() => Promise.resolve({ ok: true }));
  });

  it("full cycle: check → download → verify hash → set pending", async () => {
    const storage = makeStorage();
    const nativeMod = makeNativeModule(HASH_V1);
    const updater = new Updater({
      storage,
      config: { appId: "test-app" },
      nativeModule: nativeMod,
    });
    mockCheckResponse(HASH_V1, "1.0.1");

    const result = await updater.checkForUpdate();
    expect(result.updateAvailable).toBe(true);
    expect(result.update?.bundleHash).toBe(HASH_V1);

    await updater.downloadAndInstall(makeUpdate("1.0.1", HASH_V1));
    expect(nativeMod.setUpdateInfo).toHaveBeenCalledWith(expect.any(String));
    const payload = JSON.parse(
      (nativeMod.setUpdateInfo as ReturnType<typeof vi.fn>).mock.calls[0][0] as string,
    ) as { version: string; expectedHash: string; expectedSize: number };
    expect(payload.version).toBe("1.0.1");
    expect(payload.expectedHash).toBe(HASH_V1);
    expect(payload.expectedSize).toBe(10240);
    expect(nativeMod.downloadBundleToStorage).toHaveBeenCalledWith();
    expect(storage.setPendingUpdate).toHaveBeenCalledWith(
      "1.0.1",
      HASH_V1,
      undefined,
      undefined,
      "release-1.0.1",
    );
  });

  it("crash→rollback→blacklist→skip: circuit breaker prevents re-apply", async () => {
    const breaker = new CircuitBreaker();
    // Simulate: v1.0.1 was rolled back, now blacklisted
    breaker.blacklist("1.0.1", HASH_V1);

    const storage = makeStorage();
    const updater = new Updater({
      storage,
      config: { appId: "test-app" },
      nativeModule: makeNativeModule(),
      circuitBreaker: breaker,
    });
    // Server still offers the same bad version+hash
    mockCheckResponse(HASH_V1, "1.0.1");

    const result = await updater.checkForUpdate();
    // Circuit breaker should suppress the update
    expect(result.updateAvailable).toBe(false);
    expect(result.update).toBeUndefined();
  });

  it("hash mismatch on download → rejects and cleans up", async () => {
    const wrongHash = sha256("corrupted-bundle");
    const nativeMod = makeNativeModule(wrongHash);
    const storage = makeStorage();
    const updater = new Updater({
      storage,
      config: { appId: "test-app" },
      nativeModule: nativeMod,
    });
    mockFetch.mockResolvedValue({ ok: true });

    await expect(updater.downloadAndInstall(makeUpdate("1.0.1", HASH_V1))).rejects.toThrow(
      "integrity check failed",
    );
    expect(nativeMod.deleteBundleVersion).toHaveBeenCalledWith("1.0.1");
    expect(storage.setPendingUpdate).not.toHaveBeenCalled();
  });

  it("version-agnostic — installs older version without rejection", async () => {
    const storage = makeStorage({
      getCurrentVersion: vi.fn().mockReturnValue("2.0.0"),
    });
    const updater = new Updater({
      storage,
      config: { appId: "test-app", allowDowngrades: false },
      nativeModule: makeNativeModule(HASH_V1),
    });

    await updater.downloadAndInstall(makeUpdate("1.0.1", HASH_V1));
    expect(storage.setPendingUpdate).toHaveBeenCalledWith(
      "1.0.1",
      HASH_V1,
      undefined,
      undefined,
      "release-1.0.1",
    );
  });

  it("network error during check → returns updateAvailable: false", async () => {
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));
    const updater = new Updater({
      storage: makeStorage(),
      config: { appId: "test-app" },
      nativeModule: makeNativeModule(),
    });

    const result = await updater.checkForUpdate();
    expect(result.updateAvailable).toBe(false);
    expect(result.update).toBeUndefined();
  });

  it("server returns no update → returns updateAvailable: false", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/updates/check")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ updateAvailable: false }),
        });
      }
      return Promise.resolve({ ok: true });
    });

    const updater = new Updater({
      storage: makeStorage(),
      config: { appId: "test-app" },
      nativeModule: makeNativeModule(),
    });
    const result = await updater.checkForUpdate();
    expect(result.updateAvailable).toBe(false);
    expect(result.update).toBeUndefined();
  });

  it("re-published fix with new hash passes circuit breaker", async () => {
    const breaker = new CircuitBreaker();
    breaker.blacklist("1.0.1", HASH_V1);
    // New build of same version has different hash
    mockCheckResponse(HASH_V2, "1.0.1");

    const updater = new Updater({
      storage: makeStorage(),
      config: { appId: "test-app" },
      nativeModule: makeNativeModule(),
      circuitBreaker: breaker,
    });
    const result = await updater.checkForUpdate();
    expect(result.updateAvailable).toBe(true);
    expect(result.update?.bundleHash).toBe(HASH_V2);
  });
});
