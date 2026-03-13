/**
 * Mandatory Update Handling
 *
 * Handles mandatory/critical updates that require immediate installation
 * and app store update requirements.
 */

/** Configuration for mandatory update behavior */
export interface MandatoryUpdateConfig {
  /** Show blocking UI when mandatory update available */
  showBlockingUI?: boolean;
  /** Custom message for mandatory updates */
  mandatoryMessage?: string;
  /** Callback when user dismisses (if allowed) */
  onDismiss?: () => void;
  /** Allow dismissal of mandatory updates (default: false) */
  allowDismissal?: boolean;
}

/** State representing a mandatory update check result */
export interface MandatoryUpdateState {
  isMandatory: boolean;
  message: string | null;
  canDismiss: boolean;
}

/** Update data with mandatory fields */
export interface MandatoryUpdateData {
  mandatory?: boolean;
  mandatoryMessage?: string;
}

/** Response with app store update fields */
export interface AppStoreUpdateResponse {
  requiresAppStoreUpdate?: boolean;
  appStoreMessage?: string;
  appStoreUrl?: string;
}

/** State representing an app store update requirement */
export interface AppStoreUpdateState {
  required: boolean;
  message: string | null;
  storeUrl: string | null;
}

const DEFAULT_MANDATORY_MESSAGE = "A critical update is required to continue using this app.";
const DEFAULT_APP_STORE_MESSAGE = "Please update the app from the store to continue.";

/**
 * Check if an update is mandatory and return the appropriate state.
 * @param update - The update data (or null if no update)
 * @param config - Optional configuration for mandatory behavior
 * @returns The mandatory update state
 */
export function checkMandatoryUpdate(
  update: MandatoryUpdateData | null,
  config?: MandatoryUpdateConfig,
): MandatoryUpdateState {
  if (!update?.mandatory) {
    return { isMandatory: false, message: null, canDismiss: true };
  }

  const message = getMandatoryMessage(update, config?.mandatoryMessage);
  const canDismiss = config?.allowDismissal ?? false;

  return { isMandatory: true, message, canDismiss };
}

/**
 * Get the message to display for a mandatory update.
 * @param update - The update data (or null)
 * @param defaultMessage - Custom default message (optional)
 * @returns The message to display
 */
export function getMandatoryMessage(
  update: MandatoryUpdateData | null,
  defaultMessage?: string,
): string {
  if (update?.mandatoryMessage) {
    return update.mandatoryMessage;
  }
  return defaultMessage ?? DEFAULT_MANDATORY_MESSAGE;
}

/**
 * Check if an app store update is required.
 * @param response - The server response with app store update fields
 * @returns The app store update state
 */
export function checkAppStoreUpdate(response: AppStoreUpdateResponse): AppStoreUpdateState {
  if (!response.requiresAppStoreUpdate) {
    return { required: false, message: null, storeUrl: null };
  }

  return {
    required: true,
    message: response.appStoreMessage ?? DEFAULT_APP_STORE_MESSAGE,
    storeUrl: response.appStoreUrl ?? null,
  };
}

/**
 * Determine if the app should block user interaction.
 * Returns true if there's a mandatory update that cannot be dismissed.
 */
export function shouldBlockApp(state: MandatoryUpdateState): boolean {
  return state.isMandatory && !state.canDismiss;
}

/**
 * Determine if user should be redirected to app store.
 * Returns true if an app store update is required.
 */
export function shouldRedirectToStore(state: AppStoreUpdateState): boolean {
  return state.required && state.storeUrl !== null;
}
