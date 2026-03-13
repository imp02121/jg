/** Tests for update metadata validation. */

import { describe, expect, it } from "vitest";
import { validateUpdateMetadata } from "./updater-helpers";

describe("validateUpdateMetadata", () => {
  const validUpdate = {
    version: "1.0.0",
    bundleHash: "abc123def456",
    bundleSize: 10240,
    bundleUrl: "https://cdn.example.com/bundle.js",
  };

  it("accepts valid metadata", () => {
    expect(() => {
      validateUpdateMetadata(validUpdate);
    }).not.toThrow();
  });

  it("rejects missing version", () => {
    expect(() => {
      validateUpdateMetadata({ ...validUpdate, version: "" });
    }).toThrow("version is required");
  });

  it("rejects undefined version", () => {
    expect(() => {
      validateUpdateMetadata({ ...validUpdate, version: undefined });
    }).toThrow("version is required");
  });

  it("rejects whitespace-only version", () => {
    expect(() => {
      validateUpdateMetadata({ ...validUpdate, version: "   " });
    }).toThrow("version is required");
  });

  it("rejects missing bundleHash", () => {
    expect(() => {
      validateUpdateMetadata({ ...validUpdate, bundleHash: "" });
    }).toThrow("bundleHash is required");
  });

  it("rejects undefined bundleHash", () => {
    expect(() => {
      validateUpdateMetadata({ ...validUpdate, bundleHash: undefined });
    }).toThrow("bundleHash is required");
  });

  it("rejects missing bundleUrl", () => {
    expect(() => {
      validateUpdateMetadata({ ...validUpdate, bundleUrl: "" });
    }).toThrow("bundleUrl is required");
  });

  it("rejects zero bundleSize", () => {
    expect(() => {
      validateUpdateMetadata({ ...validUpdate, bundleSize: 0 });
    }).toThrow("bundleSize must be positive");
  });

  it("rejects negative bundleSize", () => {
    expect(() => {
      validateUpdateMetadata({ ...validUpdate, bundleSize: -1 });
    }).toThrow("bundleSize must be positive");
  });

  it("rejects undefined bundleSize", () => {
    expect(() => {
      validateUpdateMetadata({ ...validUpdate, bundleSize: undefined });
    }).toThrow("bundleSize must be positive");
  });
});
