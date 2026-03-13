/**
 * Global type declarations for React Native environment.
 */

declare global {
  /**
   * React Native development mode flag.
   * true in development, false in production builds.
   */
  var __DEV__: boolean | undefined;
}

// Helper type for test files that need to access globalThis.__DEV__
export interface GlobalWithDev {
  __DEV__: boolean | undefined;
}
