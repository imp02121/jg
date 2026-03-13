import { NativeModules } from "react-native";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkModuleCompatibility,
  generateDeviceFingerprint,
  getAvailableNativeModules,
} from "./native-compatibility";

vi.mock("react-native", () => ({
  NativeModules: {} as Record<string, unknown>,
}));

const mocked = vi.mocked(NativeModules) as unknown as Record<string, unknown>;

function clearModules(): void {
  for (const key of Object.keys(mocked)) {
    Reflect.deleteProperty(mocked, key);
  }
  Reflect.deleteProperty(globalThis as Record<string, unknown>, "__turboModuleProxy");
}

beforeEach(() => {
  clearModules();
});

describe("getAvailableNativeModules", () => {
  it("returns empty array when no modules exist", () => {
    expect(getAvailableNativeModules()).toEqual([]);
  });

  it("returns third-party modules sorted alphabetically", () => {
    mocked.RNCamera = {};
    mocked.RNGeolocation = {};
    mocked.RNBluetooth = {};

    const result = getAvailableNativeModules();
    expect(result).toEqual(["RNBluetooth", "RNCamera", "RNGeolocation"]);
  });

  it("filters out internal RN modules", () => {
    mocked.UIManager = {};
    mocked.Timing = {};
    mocked.AppState = {};
    mocked.RNCamera = {};

    const result = getAvailableNativeModules();
    expect(result).toEqual(["RNCamera"]);
  });

  it("filters all known internal modules", () => {
    const internals = [
      "UIManager",
      "DeviceInfo",
      "Timing",
      "PlatformConstants",
      "SourceCode",
      "ExceptionsManager",
      "Networking",
      "WebSocketModule",
      "AppState",
      "DevSettings",
      "NativeAnimatedModule",
      "StatusBarManager",
      "Appearance",
      "I18nManager",
      "Clipboard",
      "Vibration",
      "DeviceEventManager",
      "KeyboardObserver",
      "AsyncLocalStorage",
      "ImageLoader",
      "HeadlessJsTaskSupport",
      "BlobModule",
      "LinkingManager",
      "PermissionsAndroid",
      "ShareModule",
      "AlertManager",
    ];
    for (const name of internals) {
      mocked[name] = {};
    }

    expect(getAvailableNativeModules()).toEqual([]);
  });

  it("returns null when TurboModules proxy exists and NativeModules is empty", () => {
    (globalThis as Record<string, unknown>).__turboModuleProxy = () => null;

    expect(getAvailableNativeModules()).toBeNull();
  });

  it("returns null when TurboModules proxy exists even if NativeModules has entries", () => {
    (globalThis as Record<string, unknown>).__turboModuleProxy = () => null;
    mocked.RNCamera = {};

    // TurboModules active = unreliable enumeration, always return null
    const result = getAvailableNativeModules();
    expect(result).toBeNull();
  });
});

describe("generateDeviceFingerprint", () => {
  it("returns null when no modules available", async () => {
    const result = await generateDeviceFingerprint();
    expect(result).toBeNull();
  });

  it("returns null when TurboModules proxy active and no modules", async () => {
    (globalThis as Record<string, unknown>).__turboModuleProxy = () => null;

    const result = await generateDeviceFingerprint();
    expect(result).toBeNull();
  });

  it("returns a 64-char hex SHA-256 fingerprint for available modules", async () => {
    mocked.RNCamera = {};
    mocked.RNGeolocation = {};

    const result = await generateDeviceFingerprint();
    expect(typeof result).toBe("string");
    expect(result).toMatch(/^[a-f0-9]{64}$/);
  });

  it("returns consistent fingerprint for same modules", async () => {
    mocked.RNCamera = {};
    mocked.RNGeolocation = {};

    const first = await generateDeviceFingerprint();
    const second = await generateDeviceFingerprint();
    expect(first).toBe(second);
  });

  it("returns different fingerprint for different modules", async () => {
    mocked.RNCamera = {};
    const first = await generateDeviceFingerprint();

    mocked.RNGeolocation = {};
    const second = await generateDeviceFingerprint();

    expect(first).not.toBe(second);
  });

  it("produces order-independent fingerprint", async () => {
    mocked.Zebra = {};
    mocked.Alpha = {};
    const first = await generateDeviceFingerprint();

    Reflect.deleteProperty(mocked, "Zebra");
    Reflect.deleteProperty(mocked, "Alpha");
    mocked.Alpha = {};
    mocked.Zebra = {};
    const second = await generateDeviceFingerprint();

    expect(first).toBe(second);
  });
});

describe("checkModuleCompatibility", () => {
  it("returns empty array when all required modules are present", () => {
    mocked.RNCamera = {};
    mocked.RNMaps = {};

    const missing = checkModuleCompatibility(["RNCamera", "RNMaps"]);
    expect(missing).toEqual([]);
  });

  it("returns missing module names", () => {
    mocked.RNCamera = {};

    const missing = checkModuleCompatibility(["RNCamera", "RNMaps"]);
    expect(missing).toEqual(["RNMaps"]);
  });

  it("returns all required when no modules available", () => {
    const missing = checkModuleCompatibility(["RNCamera", "RNMaps"]);
    expect(missing).toEqual(["RNCamera", "RNMaps"]);
  });

  it("returns all required when TurboModules proxy active", () => {
    (globalThis as Record<string, unknown>).__turboModuleProxy = () => null;

    const missing = checkModuleCompatibility(["RNCamera"]);
    expect(missing).toEqual(["RNCamera"]);
  });

  it("returns empty array for empty required list", () => {
    expect(checkModuleCompatibility([])).toEqual([]);
  });
});

describe("fingerprint gating", () => {
  it("fingerprint changes when native modules change (native app update)", async () => {
    // When a native app update adds/removes modules, the fingerprint
    // changes. The server compares device fingerprint to the build's
    // expected fingerprint and blocks incompatible OTA bundles.
    mocked.RNCamera = {};
    const before = await generateDeviceFingerprint();

    // Simulate native app update adding a new module
    mocked.RNMaps = {};
    const after = await generateDeviceFingerprint();

    expect(typeof before).toBe("string");
    expect(typeof after).toBe("string");
    expect(before).not.toBe(after);
  });

  it("missing fingerprint (null) allows backward-compat updates", async () => {
    // When no modules can be enumerated (TurboModules, empty),
    // fingerprint is null. The server treats null as "no gating"
    // so older devices/SDKs still receive updates.
    (globalThis as Record<string, unknown>).__turboModuleProxy = () => null;
    const fp = await generateDeviceFingerprint();
    expect(fp).toBeNull();
  });

  it("same modules produce stable fingerprint across calls", async () => {
    mocked.RNCamera = {};
    mocked.RNGeolocation = {};
    const fp1 = await generateDeviceFingerprint();
    const fp2 = await generateDeviceFingerprint();
    expect(fp1).toBe(fp2);
    expect(fp1).toMatch(/^[a-f0-9]{64}$/);
  });
});
