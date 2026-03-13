/**
 * Expo Config Plugin Types
 *
 * Type definitions for BundleNudge Expo config plugin.
 */

/**
 * Configuration options for the BundleNudge Expo plugin.
 * These are passed to the plugin in app.json/app.config.js
 */
export interface BundleNudgePluginProps {
  /** App ID from BundleNudge dashboard (required) */
  appId: string;

  /** Custom API URL (optional, defaults to production) */
  apiUrl?: string;

  /** Enable debug logging (optional, defaults to false) */
  debug?: boolean;
}
