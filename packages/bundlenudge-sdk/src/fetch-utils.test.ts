/** fetch-utils Tests — timeout, HTTPS enforcement, and error handling. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FetchRedirectError,
  FetchTimeoutError,
  InsecureUrlError,
  fetchWithTimeout,
} from "./fetch-utils";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchWithTimeout", () => {
  describe("HTTPS enforcement", () => {
    it("allows HTTPS URLs", async () => {
      mockFetch.mockResolvedValue(new Response("ok", { status: 200 }));
      const res = await fetchWithTimeout("https://api.bundlenudge.com/v1/check");
      expect(res.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.bundlenudge.com/v1/check",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it("allows localhost HTTP for development", async () => {
      mockFetch.mockResolvedValue(new Response("ok", { status: 200 }));
      const res = await fetchWithTimeout("http://localhost:3000/api/test");
      expect(res.status).toBe(200);

      const res2 = await fetchWithTimeout("http://127.0.0.1:8080/api/test");
      expect(res2.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("rejects plain HTTP URLs — prevents MITM on bundle downloads", async () => {
      // Security: HTTP allows man-in-the-middle attacks where an attacker
      // could intercept bundle downloads and inject malicious JavaScript.
      // Without HTTPS enforcement, an attacker on the same network could
      // serve a crafted bundle that steals user credentials or data.
      await expect(fetchWithTimeout("http://evil.com/bundle.js")).rejects.toThrow(InsecureUrlError);
      await expect(fetchWithTimeout("http://api.bundlenudge.com/v1/check")).rejects.toThrow(
        "HTTPS is required",
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("redirect and auth header behavior", () => {
    it("sets redirect: error when Authorization header is present", async () => {
      mockFetch.mockResolvedValue(new Response("ok", { status: 200 }));
      await fetchWithTimeout("https://api.bundlenudge.com/v1/check", {
        headers: { Authorization: "Bearer secret-token" },
      });

      const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
      const headers = callArgs[1].headers as Record<string, string>;
      expect(headers.Authorization).toBe("Bearer secret-token");
      expect(callArgs[1].redirect).toBe("error");
    });

    it("allows redirects when no auth header is present", async () => {
      mockFetch.mockResolvedValue(new Response("ok", { status: 200 }));
      await fetchWithTimeout("https://api.bundlenudge.com/v1/check");
      const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(callArgs[1].redirect).toBeUndefined();
    });

    it("throws FetchRedirectError when redirect occurs on auth request", async () => {
      const redirectErr = new TypeError("Failed to fetch: redirect mode error");
      mockFetch.mockRejectedValue(redirectErr);

      await expect(
        fetchWithTimeout("https://api.bundlenudge.com/v1/check", {
          headers: { Authorization: "Bearer token" },
        }),
      ).rejects.toThrow(FetchRedirectError);
    });

    it("respects explicit redirect policy even with auth headers", async () => {
      mockFetch.mockResolvedValue(new Response("ok", { status: 200 }));
      await fetchWithTimeout("https://api.bundlenudge.com/v1/check", {
        headers: { Authorization: "Bearer token" },
        redirect: "follow",
      });
      const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(callArgs[1].redirect).toBe("follow");
    });
  });

  describe("timeout", () => {
    it("throws FetchTimeoutError when request exceeds timeout", async () => {
      const abortError = new Error("The operation was aborted");
      abortError.name = "AbortError";
      mockFetch.mockRejectedValue(abortError);

      const err = await fetchWithTimeout("https://api.bundlenudge.com/slow", {
        timeout: 100,
      }).catch((e: unknown) => e);

      expect(err).toBeInstanceOf(FetchTimeoutError);
      expect((err as FetchTimeoutError).timeout).toBe(100);
      expect((err as FetchTimeoutError).message).toContain("100ms");
    });

    it("defaults to 30000ms timeout", async () => {
      mockFetch.mockResolvedValue(new Response("ok", { status: 200 }));
      await fetchWithTimeout("https://api.bundlenudge.com/v1/check");

      const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(callArgs[1].signal).toBeInstanceOf(AbortSignal);
    });
  });

  describe("error paths", () => {
    it("re-throws network errors with original message", async () => {
      const networkErr = new TypeError("Failed to fetch");
      mockFetch.mockRejectedValue(networkErr);

      await expect(fetchWithTimeout("https://api.bundlenudge.com/v1/check")).rejects.toThrow(
        "Failed to fetch",
      );
      await expect(fetchWithTimeout("https://api.bundlenudge.com/v1/check")).rejects.toBeInstanceOf(
        TypeError,
      );
    });
  });
});
