/**
 * Version Comparison Tests
 *
 * Tests for semver comparison utilities used in constraint evaluation.
 */

import { describe, expect, it } from "vitest";
import {
  compareVersions,
  isVersionGte,
  isVersionInRange,
  isVersionLte,
  parseVersion,
} from "./version";

describe("parseVersion", () => {
  describe("valid versions", () => {
    it("parses full semver", () => {
      expect(parseVersion("1.2.3")).toEqual({ major: 1, minor: 2, patch: 3 });
    });

    it("parses version with minor only", () => {
      expect(parseVersion("1.2")).toEqual({ major: 1, minor: 2, patch: 0 });
    });

    it("parses version with major only", () => {
      expect(parseVersion("1")).toEqual({ major: 1, minor: 0, patch: 0 });
    });

    it("parses large version numbers", () => {
      expect(parseVersion("100.200.300")).toEqual({
        major: 100,
        minor: 200,
        patch: 300,
      });
    });

    it("parses zero versions", () => {
      expect(parseVersion("0.0.0")).toEqual({ major: 0, minor: 0, patch: 0 });
    });
  });

  describe("versions with suffixes", () => {
    it("strips -beta suffix", () => {
      expect(parseVersion("1.2.3-beta")).toEqual({ major: 1, minor: 2, patch: 3 });
    });

    it("strips -alpha suffix", () => {
      expect(parseVersion("1.2.3-alpha")).toEqual({ major: 1, minor: 2, patch: 3 });
    });

    it("strips -rc.1 suffix", () => {
      expect(parseVersion("1.2.3-rc.1")).toEqual({ major: 1, minor: 2, patch: 3 });
    });

    it("strips +build suffix", () => {
      expect(parseVersion("1.2.3+build123")).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
      });
    });

    it("handles suffix on minor part", () => {
      expect(parseVersion("1.2-beta")).toEqual({ major: 1, minor: 2, patch: 0 });
    });
  });

  describe("invalid versions", () => {
    it("returns zeros for empty string", () => {
      expect(parseVersion("")).toEqual({ major: 0, minor: 0, patch: 0 });
    });

    it("returns zeros for non-string input", () => {
      // @ts-expect-error Testing invalid input
      expect(parseVersion(null)).toEqual({ major: 0, minor: 0, patch: 0 });
      // @ts-expect-error Testing invalid input
      expect(parseVersion(undefined)).toEqual({ major: 0, minor: 0, patch: 0 });
      // @ts-expect-error Testing invalid input
      expect(parseVersion(123)).toEqual({ major: 0, minor: 0, patch: 0 });
    });

    it("returns zeros for non-numeric parts", () => {
      expect(parseVersion("abc.def.ghi")).toEqual({ major: 0, minor: 0, patch: 0 });
    });

    it("handles partial non-numeric", () => {
      expect(parseVersion("1.abc.3")).toEqual({ major: 1, minor: 0, patch: 3 });
    });
  });
});

describe("compareVersions", () => {
  describe("equal versions", () => {
    it("returns 0 for identical versions", () => {
      expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
      expect(compareVersions("2.3.4", "2.3.4")).toBe(0);
    });

    it("returns 0 for versions with missing parts", () => {
      expect(compareVersions("1.0", "1.0.0")).toBe(0);
      expect(compareVersions("1", "1.0.0")).toBe(0);
      expect(compareVersions("1.0.0", "1")).toBe(0);
    });
  });

  describe("first version greater", () => {
    it("returns 1 when major is greater", () => {
      expect(compareVersions("2.0.0", "1.0.0")).toBe(1);
      expect(compareVersions("10.0.0", "9.0.0")).toBe(1);
    });

    it("returns 1 when minor is greater", () => {
      expect(compareVersions("1.1.0", "1.0.0")).toBe(1);
      expect(compareVersions("1.10.0", "1.9.0")).toBe(1);
    });

    it("returns 1 when patch is greater", () => {
      expect(compareVersions("1.0.1", "1.0.0")).toBe(1);
      expect(compareVersions("1.0.10", "1.0.9")).toBe(1);
    });
  });

  describe("first version lesser", () => {
    it("returns -1 when major is lesser", () => {
      expect(compareVersions("1.0.0", "2.0.0")).toBe(-1);
      expect(compareVersions("9.0.0", "10.0.0")).toBe(-1);
    });

    it("returns -1 when minor is lesser", () => {
      expect(compareVersions("1.0.0", "1.1.0")).toBe(-1);
      expect(compareVersions("1.9.0", "1.10.0")).toBe(-1);
    });

    it("returns -1 when patch is lesser", () => {
      expect(compareVersions("1.0.0", "1.0.1")).toBe(-1);
      expect(compareVersions("1.0.9", "1.0.10")).toBe(-1);
    });
  });

  describe("edge cases", () => {
    it("handles versions with suffixes", () => {
      expect(compareVersions("1.0.0-beta", "1.0.0")).toBe(0);
      expect(compareVersions("2.0.0-alpha", "1.0.0")).toBe(1);
    });

    it("handles empty strings", () => {
      expect(compareVersions("", "")).toBe(0);
      expect(compareVersions("1.0.0", "")).toBe(1);
      expect(compareVersions("", "1.0.0")).toBe(-1);
    });
  });
});

describe("isVersionGte", () => {
  it("returns true when version is greater", () => {
    expect(isVersionGte("2.0.0", "1.0.0")).toBe(true);
    expect(isVersionGte("1.1.0", "1.0.0")).toBe(true);
    expect(isVersionGte("1.0.1", "1.0.0")).toBe(true);
  });

  it("returns true when versions are equal", () => {
    expect(isVersionGte("1.0.0", "1.0.0")).toBe(true);
    expect(isVersionGte("1.0", "1.0.0")).toBe(true);
  });

  it("returns false when version is lesser", () => {
    expect(isVersionGte("1.0.0", "2.0.0")).toBe(false);
    expect(isVersionGte("1.0.0", "1.1.0")).toBe(false);
    expect(isVersionGte("1.0.0", "1.0.1")).toBe(false);
  });
});

describe("isVersionLte", () => {
  it("returns true when version is lesser", () => {
    expect(isVersionLte("1.0.0", "2.0.0")).toBe(true);
    expect(isVersionLte("1.0.0", "1.1.0")).toBe(true);
    expect(isVersionLte("1.0.0", "1.0.1")).toBe(true);
  });

  it("returns true when versions are equal", () => {
    expect(isVersionLte("1.0.0", "1.0.0")).toBe(true);
    expect(isVersionLte("1.0", "1.0.0")).toBe(true);
  });

  it("returns false when version is greater", () => {
    expect(isVersionLte("2.0.0", "1.0.0")).toBe(false);
    expect(isVersionLte("1.1.0", "1.0.0")).toBe(false);
    expect(isVersionLte("1.0.1", "1.0.0")).toBe(false);
  });
});

describe("isVersionInRange", () => {
  describe("with both bounds", () => {
    it("returns true when in range", () => {
      expect(isVersionInRange("1.5.0", "1.0.0", "2.0.0")).toBe(true);
      expect(isVersionInRange("1.0.0", "1.0.0", "2.0.0")).toBe(true);
      expect(isVersionInRange("2.0.0", "1.0.0", "2.0.0")).toBe(true);
    });

    it("returns false when below min", () => {
      expect(isVersionInRange("0.9.0", "1.0.0", "2.0.0")).toBe(false);
    });

    it("returns false when above max", () => {
      expect(isVersionInRange("2.1.0", "1.0.0", "2.0.0")).toBe(false);
    });
  });

  describe("with only min bound", () => {
    it("returns true when at or above min", () => {
      expect(isVersionInRange("1.0.0", "1.0.0", undefined)).toBe(true);
      expect(isVersionInRange("5.0.0", "1.0.0", undefined)).toBe(true);
    });

    it("returns false when below min", () => {
      expect(isVersionInRange("0.9.0", "1.0.0", undefined)).toBe(false);
    });
  });

  describe("with only max bound", () => {
    it("returns true when at or below max", () => {
      expect(isVersionInRange("2.0.0", undefined, "2.0.0")).toBe(true);
      expect(isVersionInRange("1.0.0", undefined, "2.0.0")).toBe(true);
    });

    it("returns false when above max", () => {
      expect(isVersionInRange("2.1.0", undefined, "2.0.0")).toBe(false);
    });
  });

  describe("with no bounds", () => {
    it("returns true for any version", () => {
      expect(isVersionInRange("0.0.1", undefined, undefined)).toBe(true);
      expect(isVersionInRange("999.999.999", undefined, undefined)).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles versions with suffixes", () => {
      expect(isVersionInRange("1.5.0-beta", "1.0.0", "2.0.0")).toBe(true);
    });

    it("handles missing patch versions", () => {
      expect(isVersionInRange("1.5", "1.0.0", "2.0.0")).toBe(true);
    });
  });
});
