/**
 * Version Comparison Utilities
 *
 * Semver comparison functions for checking update eligibility
 * based on app version constraints.
 */

/** Parsed version structure */
export interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
}

/**
 * Parse a version string to its components.
 * Handles missing parts and strips non-numeric suffixes.
 *
 * @example
 * parseVersion('1.2.3')      // { major: 1, minor: 2, patch: 3 }
 * parseVersion('1.2')        // { major: 1, minor: 2, patch: 0 }
 * parseVersion('1.2.3-beta') // { major: 1, minor: 2, patch: 3 }
 */
export function parseVersion(version: string): ParsedVersion {
  if (!version || typeof version !== "string") {
    return { major: 0, minor: 0, patch: 0 };
  }

  // Split and parse parts, stripping any non-numeric suffix
  const parts = version.split(".").map((part) => {
    // Extract leading numeric portion, ignore rest (e.g., "3-beta" -> 3)
    const numericMatch = /^(\d+)/.exec(part);
    return numericMatch ? Number.parseInt(numericMatch[1], 10) : 0;
  });

  return {
    major: Number.isNaN(parts[0]) ? 0 : parts[0],
    minor: Number.isNaN(parts[1]) ? 0 : (parts[1] ?? 0),
    patch: Number.isNaN(parts[2]) ? 0 : (parts[2] ?? 0),
  };
}

/**
 * Compare two version strings.
 * Returns: -1 if a < b, 0 if a == b, 1 if a > b
 *
 * @example
 * compareVersions('1.0.0', '1.0.1')  // -1
 * compareVersions('2.0.0', '1.9.9')  // 1
 * compareVersions('1.0', '1.0.0')    // 0
 */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const parsedA = parseVersion(a);
  const parsedB = parseVersion(b);

  // Compare major
  if (parsedA.major < parsedB.major) return -1;
  if (parsedA.major > parsedB.major) return 1;

  // Compare minor
  if (parsedA.minor < parsedB.minor) return -1;
  if (parsedA.minor > parsedB.minor) return 1;

  // Compare patch
  if (parsedA.patch < parsedB.patch) return -1;
  if (parsedA.patch > parsedB.patch) return 1;

  return 0;
}

/**
 * Check if version is greater than or equal to target.
 *
 * @example
 * isVersionGte('1.2.0', '1.0.0')  // true
 * isVersionGte('1.0.0', '1.0.0')  // true
 * isVersionGte('0.9.0', '1.0.0')  // false
 */
export function isVersionGte(version: string, target: string): boolean {
  return compareVersions(version, target) >= 0;
}

/**
 * Check if version is less than or equal to target.
 *
 * @example
 * isVersionLte('1.0.0', '1.2.0')  // true
 * isVersionLte('1.0.0', '1.0.0')  // true
 * isVersionLte('2.0.0', '1.0.0')  // false
 */
export function isVersionLte(version: string, target: string): boolean {
  return compareVersions(version, target) <= 0;
}

/**
 * Check if version is within an optional range.
 * If min is undefined, there's no lower bound.
 * If max is undefined, there's no upper bound.
 *
 * @example
 * isVersionInRange('1.5.0', '1.0.0', '2.0.0')  // true
 * isVersionInRange('0.5.0', '1.0.0', undefined) // false (below min)
 * isVersionInRange('3.0.0', undefined, '2.0.0') // false (above max)
 * isVersionInRange('1.0.0', undefined, undefined) // true (no bounds)
 */
export function isVersionInRange(version: string, min?: string, max?: string): boolean {
  // Check minimum bound if specified
  if (min !== undefined && !isVersionGte(version, min)) {
    return false;
  }

  // Check maximum bound if specified
  if (max !== undefined && !isVersionLte(version, max)) {
    return false;
  }

  return true;
}
