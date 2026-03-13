/**
 * Updater Helpers Tests
 *
 * Tests for validateNotDowngrade and validateBundleUrl helper functions.
 */

import { describe, expect, it } from "vitest";
import { validateBundleUrl, validateNotDowngrade } from "./updater-helpers";

describe("validateNotDowngrade", () => {
  it("rejects downgrade from 2.0.0 to 1.0.0", () => {
    expect(() => validateNotDowngrade("1.0.0", "2.0.0", false)).toThrow("Downgrade rejected");
  });

  it("rejects minor downgrade from 1.2.0 to 1.1.0", () => {
    expect(() => validateNotDowngrade("1.1.0", "1.2.0", false)).toThrow("Downgrade rejected");
  });

  it("rejects patch downgrade from 1.0.2 to 1.0.1", () => {
    expect(() => validateNotDowngrade("1.0.1", "1.0.2", false)).toThrow("Downgrade rejected");
  });

  it("allows upgrade from 1.0.0 to 2.0.0", () => {
    expect(() => validateNotDowngrade("2.0.0", "1.0.0", false)).not.toThrow();
  });

  it("allows same version", () => {
    expect(() => validateNotDowngrade("1.0.0", "1.0.0", false)).not.toThrow();
  });

  it("allows downgrade when allowDowngrades is true", () => {
    expect(() => validateNotDowngrade("1.0.0", "2.0.0", true)).not.toThrow();
  });

  it("skips check when currentVersion is null", () => {
    expect(() => validateNotDowngrade("1.0.0", null, false)).not.toThrow();
  });

  it("strips pre-release tags before comparison", () => {
    expect(() => validateNotDowngrade("1.0.0-beta.1", "1.0.0", false)).not.toThrow();
  });

  it("error message includes both versions", () => {
    expect(() => validateNotDowngrade("1.0.0", "2.0.0", false)).toThrow(/1\.0\.0.*2\.0\.0/);
  });
});

describe("validateBundleUrl", () => {
  it("allows HTTPS URLs", () => {
    expect(() => validateBundleUrl("https://cdn.example.com/bundle.js")).not.toThrow();
  });

  it("allows localhost HTTP URLs", () => {
    expect(() => validateBundleUrl("http://localhost:8081/bundle.js")).not.toThrow();
  });

  it("allows 127.0.0.1 HTTP URLs", () => {
    expect(() => validateBundleUrl("http://127.0.0.1:8081/bundle.js")).not.toThrow();
  });

  it("rejects plain HTTP URLs", () => {
    expect(() => validateBundleUrl("http://cdn.example.com/bundle.js")).toThrow("must use HTTPS");
  });

  it("rejects FTP URLs", () => {
    expect(() => validateBundleUrl("ftp://cdn.example.com/bundle.js")).toThrow("must use HTTPS");
  });
});
