/**
 * Constraints module
 *
 * Provides version comparison, constraint evaluation, and mandatory update checking.
 */

// Version utilities
export {
  compareVersions,
  isVersionGte,
  isVersionLte,
  isVersionInRange,
  parseVersion,
} from "./version";
export type { ParsedVersion } from "./version";

// Constraint evaluation
export { evaluateConstraints } from "./evaluator";
export type { UpdateConstraints, DeviceContext, EvaluationResult } from "./evaluator";

// Mandatory updates
export {
  checkMandatoryUpdate,
  getMandatoryMessage,
  checkAppStoreUpdate,
  shouldBlockApp,
  shouldRedirectToStore,
} from "./mandatory";
export type {
  MandatoryUpdateConfig,
  MandatoryUpdateState,
  MandatoryUpdateData,
  AppStoreUpdateResponse,
  AppStoreUpdateState,
} from "./mandatory";
