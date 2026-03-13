/**
 * Background Downloads
 *
 * Public API for background/silent update preloading.
 */

export {
  PreloadManager,
  preloadUpdate,
  type PreloadConfig,
  type PreloadResult,
  type DeviceConditions,
} from "./preload";

export { getDeviceConditions, shouldDownload } from "./conditions";
