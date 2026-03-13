/**
 * Upload Client - CLI/CI bundle uploads with polling-based status tracking.
 */

import { API_REQUEST_TIMEOUT_MS, BUNDLE_DOWNLOAD_TIMEOUT_MS } from "../constants";
import { fetchWithTimeout } from "../fetch-utils";
import type {
  StatusResponse,
  UploadConfig,
  UploadJobStatus,
  UploadOptions,
  UploadResponse,
  UploadResult,
} from "./types";

const DEFAULT_POLL_INTERVAL = 2000;
const DEFAULT_MAX_ATTEMPTS = 60;

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const isTerminal = (s: UploadJobStatus): boolean => s === "complete" || s === "failed";
const failResult = (jobId: string, error: string): UploadResult => ({
  jobId,
  status: "failed",
  error,
  progress: 0,
});

export class UploadClient {
  constructor(private config: UploadConfig) {}

  async upload(
    bundle: ArrayBuffer | Uint8Array,
    options: UploadOptions = {},
  ): Promise<UploadResult> {
    const jobId = await this.initiateUpload(bundle);
    if (!jobId) return failResult("", "Failed to initiate upload");
    return this.pollUntilComplete(jobId, options);
  }

  async getStatus(jobId: string): Promise<UploadResult> {
    try {
      const response = await fetchWithTimeout(`${this.config.apiUrl}/v1/uploads/${jobId}/status`, {
        method: "GET",
        headers: this.buildHeaders(),
        timeout: API_REQUEST_TIMEOUT_MS,
      });
      if (!response.ok) return failResult(jobId, `HTTP ${String(response.status)}`);

      const data = (await response.json()) as StatusResponse;
      return {
        jobId,
        status: data.status,
        releaseId: data.releaseId,
        error: data.error,
        progress: data.progress,
      };
    } catch (error) {
      return failResult(jobId, error instanceof Error ? error.message : "Unknown error");
    }
  }

  async cancel(jobId: string): Promise<void> {
    await fetchWithTimeout(`${this.config.apiUrl}/v1/uploads/${jobId}/cancel`, {
      method: "POST",
      headers: this.buildHeaders(),
      timeout: API_REQUEST_TIMEOUT_MS,
    });
  }

  private buildHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.apiKey}`,
      "X-App-Id": this.config.appId,
    };
  }

  private async initiateUpload(bundle: ArrayBuffer | Uint8Array): Promise<string | null> {
    try {
      const response = await fetchWithTimeout(`${this.config.apiUrl}/v1/uploads`, {
        method: "POST",
        headers: {
          ...this.buildHeaders(),
          "Content-Type": "application/octet-stream",
        },
        body: bundle,
        timeout: BUNDLE_DOWNLOAD_TIMEOUT_MS,
      });
      if (!response.ok) return null;
      return ((await response.json()) as UploadResponse).jobId;
    } catch {
      return null;
    }
  }

  private async pollUntilComplete(jobId: string, options: UploadOptions): Promise<UploadResult> {
    const interval = options.pollInterval ?? DEFAULT_POLL_INTERVAL;
    const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const result = await this.getStatus(jobId);
      options.onStatusChange?.(result.status);
      options.onProgress?.(result.progress);
      if (isTerminal(result.status)) return result;
      await sleep(interval);
    }
    return failResult(jobId, "Polling timeout");
  }
}

export async function uploadBundle(
  config: UploadConfig,
  bundle: ArrayBuffer | Uint8Array,
  options?: UploadOptions,
): Promise<UploadResult> {
  return new UploadClient(config).upload(bundle, options);
}
