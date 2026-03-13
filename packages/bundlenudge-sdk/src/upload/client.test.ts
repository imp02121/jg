/**
 * Upload Client Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UploadClient, uploadBundle } from "./client";
import type { UploadConfig, UploadJobStatus } from "./types";

describe("upload/client", () => {
  const mockFetch = vi.fn();
  const testConfig: UploadConfig = {
    apiUrl: "https://api.bundlenudge.com",
    apiKey: "test-api-key",
    appId: "test-app-id",
  };
  const bundle = new Uint8Array([1, 2, 3]);

  beforeEach(() => {
    vi.useFakeTimers();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  function mockUploadSuccess(jobId = "job-123"): void {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ jobId }) });
  }

  function mockStatus(status: UploadJobStatus, progress = 0, extra = {}): void {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status, progress, ...extra }),
    });
  }

  it("constructor stores config", () => {
    expect(new UploadClient(testConfig)).toBeDefined();
  });

  it("upload sends POST with correct headers", async () => {
    mockUploadSuccess();
    mockStatus("complete", 100);
    await new UploadClient(testConfig).upload(bundle);

    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.bundlenudge.com/v1/uploads");
    expect(opts.method).toBe("POST");
    expect(opts.headers).toMatchObject({
      Authorization: "Bearer test-api-key",
      "X-App-Id": "test-app-id",
    });
  });

  it("upload polls until complete", async () => {
    mockUploadSuccess();
    mockStatus("processing", 50);
    mockStatus("complete", 100);

    const resultPromise = new UploadClient(testConfig).upload(bundle, { pollInterval: 100 });
    await vi.advanceTimersByTimeAsync(100);

    expect((await resultPromise).status).toBe("complete");
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("upload returns on failed status", async () => {
    mockUploadSuccess();
    mockStatus("failed", 0, { error: "Build error" });
    const result = await new UploadClient(testConfig).upload(bundle);
    expect(result).toMatchObject({ status: "failed", error: "Build error" });
  });

  it("upload respects maxAttempts", async () => {
    mockUploadSuccess();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "processing", progress: 50 }),
    });

    const resultPromise = new UploadClient(testConfig).upload(bundle, {
      pollInterval: 100,
      maxAttempts: 3,
    });
    await vi.advanceTimersByTimeAsync(300);

    expect((await resultPromise).error).toBe("Polling timeout");
  });

  it("upload calls callbacks", async () => {
    mockUploadSuccess();
    mockStatus("pending", 0);
    mockStatus("complete", 100);

    const onProgress = vi.fn();
    const onStatusChange = vi.fn();
    const resultPromise = new UploadClient(testConfig).upload(bundle, {
      pollInterval: 100,
      onProgress,
      onStatusChange,
    });
    await vi.advanceTimersByTimeAsync(100);
    await resultPromise;

    expect(onProgress).toHaveBeenCalledWith(100);
    expect(onStatusChange.mock.calls.map((c) => c[0] as UploadJobStatus)).toContain("complete");
  });

  it("getStatus fetches job status", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: "processing", progress: 50, releaseId: "rel-123" }),
    });
    const result = await new UploadClient(testConfig).getStatus("job-123");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.bundlenudge.com/v1/uploads/job-123/status",
      expect.objectContaining({ method: "GET" }),
    );
    expect(result).toMatchObject({ status: "processing", progress: 50, releaseId: "rel-123" });
  });

  it("getStatus handles errors", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
    expect((await new UploadClient(testConfig).getStatus("job-1")).error).toBe("HTTP 404");

    mockFetch.mockRejectedValueOnce(new Error("Network failure"));
    expect((await new UploadClient(testConfig).getStatus("job-2")).error).toBe("Network failure");
  });

  it("cancel sends POST request to cancel endpoint", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });
    await new UploadClient(testConfig).cancel("job-123");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.bundlenudge.com/v1/uploads/job-123/cancel",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("uploadBundle convenience function works", async () => {
    mockUploadSuccess("job-456");
    mockStatus("complete", 100);
    const resultPromise = uploadBundle(testConfig, bundle);
    await vi.advanceTimersByTimeAsync(0);
    expect(await resultPromise).toMatchObject({ jobId: "job-456", status: "complete" });
  });

  it("handles upload failures", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    expect(await new UploadClient(testConfig).upload(bundle)).toMatchObject({
      status: "failed",
      error: "Failed to initiate upload",
      jobId: "",
    });

    mockUploadSuccess();
    mockStatus("failed", 0, { error: "Build error" });
    expect((await new UploadClient(testConfig).upload(bundle)).status).toBe("failed");
  });
});
