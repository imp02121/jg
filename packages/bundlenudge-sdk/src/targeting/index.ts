/**
 * Targeting module
 *
 * Device information collection and variant tracking for targeted updates.
 */

// Device info
export {
  collectDeviceInfo,
  collectOsVersion,
  collectLocale,
  collectTimezone,
  collectDeviceModel,
} from "./device-info";

// Variant tracking
export {
  createVariantManager,
  getVariant,
  setVariant,
  clearVariant,
  isControlGroup,
  loadVariant,
} from "./variant";
export type { VariantManager, VariantInfo } from "./variant";
