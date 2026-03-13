/**
 * UpdateCheckResponseSchema Message Field Tests
 *
 * Tests that the Zod schema correctly handles the optional message field.
 */

import { describe, expect, it } from "vitest";
import { UpdateCheckResponseSchema } from "./updater-helpers";

describe("UpdateCheckResponseSchema message field", () => {
  const baseResponse = {
    updateAvailable: false,
  };

  const baseWithRelease = {
    updateAvailable: true,
    release: {
      version: "1.0.0",
      bundleUrl: "https://cdn.example.com/bundle.js",
      bundleSize: 1024,
      bundleHash: "abc123",
      releaseId: "rel-1",
    },
  };

  it("accepts response without message", () => {
    const result = UpdateCheckResponseSchema.safeParse(baseResponse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.message).toBeUndefined();
    }
  });

  it("accepts response with message", () => {
    const input = {
      ...baseResponse,
      message: {
        id: "msg-1",
        title: "Please update",
        body: "Update for the best experience",
      },
    };

    const result = UpdateCheckResponseSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.message).toEqual({
        id: "msg-1",
        title: "Please update",
        body: "Update for the best experience",
      });
    }
  });

  it("accepts response with both release and message", () => {
    const input = {
      ...baseWithRelease,
      message: {
        id: "msg-2",
        title: "New features",
        body: "Check out the new features",
      },
    };

    const result = UpdateCheckResponseSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.release?.version).toBe("1.0.0");
      expect(result.data.message?.id).toBe("msg-2");
    }
  });

  it("rejects message missing id", () => {
    const input = {
      ...baseResponse,
      message: {
        title: "No ID",
        body: "Missing the id field",
      },
    };

    const result = UpdateCheckResponseSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects message missing title", () => {
    const input = {
      ...baseResponse,
      message: {
        id: "msg-3",
        body: "Missing title",
      },
    };

    const result = UpdateCheckResponseSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects message missing body", () => {
    const input = {
      ...baseResponse,
      message: {
        id: "msg-4",
        title: "Has title",
      },
    };

    const result = UpdateCheckResponseSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects message with non-string fields", () => {
    const input = {
      ...baseResponse,
      message: {
        id: 123,
        title: "Title",
        body: "Body",
      },
    };

    const result = UpdateCheckResponseSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});
