/**
 * Variant Tracking
 *
 * Tracks A/B test variant assignments from the server.
 * Persists assignments for consistency across sessions.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { VariantInfo } from "../metrics/types";

const STORAGE_KEY = "@bundlenudge:variant";

export interface VariantManager {
  /** Get current variant (null if not assigned) */
  getVariant(): VariantInfo | null;
  /** Set variant (called when server assigns one) */
  setVariant(variant: VariantInfo): Promise<void>;
  /** Clear variant (for testing/reset) */
  clearVariant(): Promise<void>;
  /** Check if in control group */
  isControlGroup(): boolean;
}

/**
 * Creates a new VariantManager instance.
 * Use this for testing or when you need isolated instances.
 */
export function createVariantManager(): VariantManager {
  let cachedVariant: VariantInfo | null = null;

  return {
    getVariant(): VariantInfo | null {
      return cachedVariant;
    },

    setVariant(variant: VariantInfo): Promise<void> {
      cachedVariant = variant;
      // Fire-and-forget storage - don't block on persistence
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(variant)).catch(() => {
        // Silent failure for non-critical storage operation
      });
      return Promise.resolve();
    },

    async clearVariant(): Promise<void> {
      cachedVariant = null;
      await AsyncStorage.removeItem(STORAGE_KEY);
    },

    isControlGroup(): boolean {
      return cachedVariant?.isControl ?? false;
    },
  };
}

// Singleton instance for app-wide usage
const singletonManager = createVariantManager();

/** Get current variant (null if not assigned) */
export function getVariant(): VariantInfo | null {
  return singletonManager.getVariant();
}

/** Set variant (called when server assigns one) */
export function setVariant(variant: VariantInfo): Promise<void> {
  return singletonManager.setVariant(variant);
}

/** Clear variant (for testing/reset) */
export function clearVariant(): Promise<void> {
  return singletonManager.clearVariant();
}

/** Check if in control group */
export function isControlGroup(): boolean {
  return singletonManager.isControlGroup();
}

/** Load persisted variant from storage (call on app init) */
export async function loadVariant(): Promise<VariantInfo | null> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const parsed: unknown = JSON.parse(stored);
    if (!isValidVariantInfo(parsed)) {
      // Corrupted data - clear it
      await AsyncStorage.removeItem(STORAGE_KEY);
      return null;
    }

    await singletonManager.setVariant(parsed);
    return parsed;
  } catch {
    // Storage error or JSON parse error - return null
    return null;
  }
}

function isValidVariantInfo(value: unknown): value is VariantInfo {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === "string" && typeof obj.name === "string" && typeof obj.isControl === "boolean"
  );
}

// Re-export VariantInfo for convenience
export type { VariantInfo } from "../metrics/types";
