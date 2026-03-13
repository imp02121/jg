import type { TurboModule } from "react-native";
import { TurboModuleRegistry } from "react-native";

export interface Spec extends TurboModule {
  getConfiguration(): Promise<{
    appVersion: string;
    buildNumber: string;
    bundleId: string;
  }>;
  getCurrentBundleInfo(): Promise<{
    currentVersion: string | null;
    currentVersionHash: string | null;
    pendingVersion: string | null;
    previousVersion: string | null;
  } | null>;
  getBundlePath(): Promise<string | null>;
  notifyAppReady(): Promise<boolean>;
  restartApp(onlyIfUpdateIsPending: boolean): Promise<boolean>;
  clearUpdates(): Promise<boolean>;
  saveBundleToStorage(version: string, bundleData: string): Promise<string>;
  setUpdateInfo(payload: string): Promise<boolean>;
  downloadBundleToStorage(): Promise<{ path: string; hash: string }>;
  hashFile(path: string): Promise<string>;
  deleteBundleVersion(version: string): Promise<boolean>;
  rollbackToVersion(version: string): Promise<boolean>;
  getFreeDiskSpace(): Promise<number>;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

// eslint-disable-next-line no-restricted-syntax -- TurboModule codegen requires default export
export default TurboModuleRegistry.get<Spec>("BundleNudge");
