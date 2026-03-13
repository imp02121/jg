/**
 * Fetch utilities with timeout support and HTTPS enforcement.
 *
 * SECURITY: TLS enforcement depends on the React Native runtime
 * (JavaScriptCore/Hermes + platform networking). The SDK enforces
 * HTTPS at the URL level to prevent accidental plaintext requests.
 * Actual TLS version negotiation is handled by the platform's
 * networking stack (NSURLSession on iOS, OkHttp on Android).
 */

export class FetchTimeoutError extends Error {
  readonly timeout: number;

  constructor(timeout: number) {
    super(`BundleNudge: Request timed out after ${String(timeout)}ms`);
    this.name = "FetchTimeoutError";
    this.timeout = timeout;
  }
}

export class InsecureUrlError extends Error {
  constructor() {
    super(
      "BundleNudge: HTTPS is required for all requests. " +
        "HTTP is only allowed for localhost/127.0.0.1 during development.",
    );
    this.name = "InsecureUrlError";
  }
}

export class FetchRedirectError extends Error {
  constructor(url: string) {
    super(
      `BundleNudge: Request to ${url} was redirected. Redirects are blocked on authenticated requests to prevent token leakage.`,
    );
    this.name = "FetchRedirectError";
  }
}

export interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number;
}

/**
 * Check if a URL is allowed (HTTPS or localhost HTTP for development).
 */
function isSecureUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (lower.startsWith("https://")) return true;
  if (lower.startsWith("http://localhost")) return true;
  if (lower.startsWith("http://127.0.0.1")) return true;
  return false;
}

/**
 * Check if request headers contain an Authorization token.
 * Used to automatically block redirects on authenticated requests.
 */
function hasAuthHeader(headers: RequestInit["headers"]): boolean {
  if (!headers) return false;
  if (headers instanceof Headers) return headers.has("Authorization");
  if (Array.isArray(headers)) {
    return headers.some(([key]) => key.toLowerCase() === "authorization");
  }
  return "Authorization" in headers || "authorization" in headers;
}

/**
 * Fetch with configurable timeout and HTTPS enforcement.
 *
 * SECURITY: Rejects any URL that does not use HTTPS (except localhost).
 * This prevents MITM attacks from intercepting bundle downloads or API calls.
 *
 * @param url - URL to fetch (must use HTTPS or localhost)
 * @param options - Fetch options with optional timeout (default 30000ms)
 * @returns Promise<Response>
 * @throws InsecureUrlError if URL does not use HTTPS
 * @throws FetchTimeoutError if request times out
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {},
): Promise<Response> {
  if (!isSecureUrl(url)) {
    throw new InsecureUrlError();
  }

  const { timeout = 30000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  // SECURITY: Block redirects on authenticated requests to prevent
  // Authorization header leakage to third-party domains.
  const redirectPolicy =
    fetchOptions.redirect ?? (hasAuthHeader(fetchOptions.headers) ? "error" : undefined);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      ...(redirectPolicy && { redirect: redirectPolicy }),
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new FetchTimeoutError(timeout);
    }
    if (isRedirectError(error)) {
      throw new FetchRedirectError(url);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function isRedirectError(error: unknown): boolean {
  if (!(error instanceof TypeError)) return false;
  const msg = error.message.toLowerCase();
  return msg.includes("redirect") || msg.includes("opaqueredirect");
}
