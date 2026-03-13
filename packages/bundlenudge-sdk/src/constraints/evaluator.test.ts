import { describe, expect, it } from "vitest";
import { type DeviceContext, type UpdateConstraints, evaluateConstraints } from "./evaluator";

describe("evaluateConstraints", () => {
  const defaultDevice: DeviceContext = {
    appVersion: "2.0.0",
    osVersion: "16.0",
    platform: "ios",
  };

  describe("with no constraints", () => {
    it("returns eligible for any device", () => {
      const result = evaluateConstraints({}, defaultDevice);
      expect(result.eligible).toBe(true);
      expect(result.reason).toBeUndefined();
    });
  });

  describe("platform constraints", () => {
    it("returns eligible when platform matches", () => {
      const constraints: UpdateConstraints = { platforms: ["ios"] };
      const result = evaluateConstraints(constraints, defaultDevice);
      expect(result.eligible).toBe(true);
    });

    it("returns eligible when platform is in list", () => {
      const constraints: UpdateConstraints = { platforms: ["ios", "android"] };
      const result = evaluateConstraints(constraints, defaultDevice);
      expect(result.eligible).toBe(true);
    });

    it("returns ineligible when platform does not match", () => {
      const constraints: UpdateConstraints = { platforms: ["android"] };
      const result = evaluateConstraints(constraints, defaultDevice);
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe("This update is not available for ios");
    });

    it("returns eligible when platforms array is empty", () => {
      const constraints: UpdateConstraints = { platforms: [] };
      const result = evaluateConstraints(constraints, defaultDevice);
      expect(result.eligible).toBe(true);
    });
  });

  describe("minAppVersion constraint", () => {
    it("returns eligible when app version equals minimum", () => {
      const constraints: UpdateConstraints = { minAppVersion: "2.0.0" };
      const result = evaluateConstraints(constraints, defaultDevice);
      expect(result.eligible).toBe(true);
    });

    it("returns eligible when app version exceeds minimum", () => {
      const constraints: UpdateConstraints = { minAppVersion: "1.5.0" };
      const result = evaluateConstraints(constraints, defaultDevice);
      expect(result.eligible).toBe(true);
    });

    it("returns ineligible when app version below minimum", () => {
      const constraints: UpdateConstraints = { minAppVersion: "3.0.0" };
      const result = evaluateConstraints(constraints, defaultDevice);
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe("App version 2.0.0 is below minimum 3.0.0");
    });
  });

  describe("maxAppVersion constraint", () => {
    it("returns eligible when app version equals maximum", () => {
      const constraints: UpdateConstraints = { maxAppVersion: "2.0.0" };
      const result = evaluateConstraints(constraints, defaultDevice);
      expect(result.eligible).toBe(true);
    });

    it("returns eligible when app version below maximum", () => {
      const constraints: UpdateConstraints = { maxAppVersion: "3.0.0" };
      const result = evaluateConstraints(constraints, defaultDevice);
      expect(result.eligible).toBe(true);
    });

    it("returns ineligible when app version exceeds maximum", () => {
      const constraints: UpdateConstraints = { maxAppVersion: "1.5.0" };
      const result = evaluateConstraints(constraints, defaultDevice);
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe("App version 2.0.0 is above maximum 1.5.0");
    });
  });

  describe("app version range constraint", () => {
    it("returns eligible when app version in range", () => {
      const constraints: UpdateConstraints = {
        minAppVersion: "1.0.0",
        maxAppVersion: "3.0.0",
      };
      const result = evaluateConstraints(constraints, defaultDevice);
      expect(result.eligible).toBe(true);
    });

    it("returns ineligible with range message when outside range", () => {
      const constraints: UpdateConstraints = {
        minAppVersion: "2.5.0",
        maxAppVersion: "3.0.0",
      };
      const result = evaluateConstraints(constraints, defaultDevice);
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe("App version 2.0.0 is outside range 2.5.0 - 3.0.0");
    });
  });

  describe("minOsVersion constraint", () => {
    it("returns eligible when OS version equals minimum", () => {
      const constraints: UpdateConstraints = { minOsVersion: "16.0" };
      const result = evaluateConstraints(constraints, defaultDevice);
      expect(result.eligible).toBe(true);
    });

    it("returns eligible when OS version exceeds minimum", () => {
      const constraints: UpdateConstraints = { minOsVersion: "14.0" };
      const result = evaluateConstraints(constraints, defaultDevice);
      expect(result.eligible).toBe(true);
    });

    it("returns ineligible when OS version below minimum", () => {
      const constraints: UpdateConstraints = { minOsVersion: "17.0" };
      const result = evaluateConstraints(constraints, defaultDevice);
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe("OS version 16.0 is below minimum 17.0");
    });
  });

  describe("combined constraints", () => {
    it("returns eligible when all constraints pass", () => {
      const constraints: UpdateConstraints = {
        platforms: ["ios", "android"],
        minAppVersion: "1.0.0",
        maxAppVersion: "3.0.0",
        minOsVersion: "14.0",
      };
      const result = evaluateConstraints(constraints, defaultDevice);
      expect(result.eligible).toBe(true);
    });

    it("returns first failing constraint reason (platform)", () => {
      const constraints: UpdateConstraints = {
        platforms: ["android"],
        minAppVersion: "3.0.0", // Would also fail
        minOsVersion: "17.0", // Would also fail
      };
      const result = evaluateConstraints(constraints, defaultDevice);
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe("This update is not available for ios");
    });

    it("returns app version reason when platform passes but version fails", () => {
      const constraints: UpdateConstraints = {
        platforms: ["ios"],
        minAppVersion: "3.0.0",
        minOsVersion: "17.0", // Would also fail
      };
      const result = evaluateConstraints(constraints, defaultDevice);
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe("App version 2.0.0 is below minimum 3.0.0");
    });
  });

  describe("android device", () => {
    const androidDevice: DeviceContext = {
      appVersion: "1.5.0",
      osVersion: "13",
      platform: "android",
    };

    it("evaluates constraints correctly for android", () => {
      const constraints: UpdateConstraints = {
        platforms: ["android"],
        minAppVersion: "1.0.0",
        minOsVersion: "12",
      };
      const result = evaluateConstraints(constraints, androidDevice);
      expect(result.eligible).toBe(true);
    });

    it("returns ineligible for ios-only update", () => {
      const constraints: UpdateConstraints = { platforms: ["ios"] };
      const result = evaluateConstraints(constraints, androidDevice);
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe("This update is not available for android");
    });
  });
});
