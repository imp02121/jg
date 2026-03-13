/**
 * Native module utilities.
 *
 * Public exports for native module helpers.
 */

export {
  restartApp,
  clearAllUpdates,
  notifyAppReady,
  getCurrentBundlePath,
  hasPendingUpdate,
  getNativeInfo,
} from "./helpers";

export type { RestartOptions, NativeInfo } from "./helpers";
