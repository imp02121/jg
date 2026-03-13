/**
 * Cryptographic Utility Functions
 *
 * Functions for generating device IDs and hashing data.
 * Uses cryptographically secure random generation.
 */

/**
 * Generate a unique device ID using UUID v4 format.
 *
 * Uses cryptographically secure random generation via:
 * 1. crypto.randomUUID() if available (modern environments)
 * 2. crypto.getRandomValues() fallback (RFC4122 compliant)
 *
 * @returns A UUID v4 string (e.g., "550e8400-e29b-41d4-a716-446655440000")
 * @throws Error if no secure random source is available
 */
export function generateDeviceId(): string {
  // Use crypto.randomUUID if available (modern environments)
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  // Fallback to crypto.getRandomValues (RFC4122 compliant UUID v4)
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 1

    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  // Throw error if no secure source available
  throw new Error(
    "crypto.randomUUID or crypto.getRandomValues required for secure device ID generation",
  );
}

/**
 * Calculate SHA-256 hash of data.
 *
 * @param data - The ArrayBuffer to hash
 * @returns Hex-encoded SHA-256 hash with "sha256:" prefix
 * @throws Error if crypto.subtle is not available
 */
export async function sha256(data: ArrayBuffer): Promise<string> {
  if (data.byteLength === 0) {
    throw new Error("BundleNudge: Cannot hash empty data");
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- crypto.subtle may not be available in all JS environments
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("BundleNudge: crypto.subtle is required for SHA-256 hashing");
  }

  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return `sha256:${hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Normalize a hash string by stripping the "sha256:" prefix if present.
 * Ensures consistent comparison between native (raw hex) and JS (prefixed) hashes.
 */
export function normalizeHash(hash: string): string {
  if (hash.startsWith("sha256:")) return hash.slice(7);
  return hash;
}

/**
 * Generate secure random jitter for backoff delays.
 * Uses crypto.getRandomValues instead of Math.random.
 */
export function getSecureJitter(maxMs: number): number {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return (array[0] / 0xffffffff) * maxMs;
  }
  // Fallback: Math.random is better than Date.now() for jitter
  // even though it's not cryptographic — jitter doesn't need crypto-grade randomness
  return Math.random() * maxMs;
}
