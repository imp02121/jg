/**
 * BundleValidator Tests
 *
 * Tests for bundle hash validation before loading.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { BundleValidator, type BundleValidatorConfig } from "./bundle-validator";
import type { Storage } from "./storage";

// Mock storage methods
const createMockStorage = () =>
  ({
    getBundleHash: vi.fn(),
    setBundleHash: vi.fn(),
    removeBundleVersion: vi.fn(),
  }) as unknown as Storage;

describe("BundleValidator", () => {
  let mockStorage: ReturnType<typeof createMockStorage>;
  let mockConfig: BundleValidatorConfig;
  let validator: BundleValidator;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage = createMockStorage();
    mockConfig = {
      hashFile: vi.fn(),
      onValidationFailed: vi.fn(),
    };
    validator = new BundleValidator(mockStorage, mockConfig);
  });

  describe("validateBundle", () => {
    it("returns true when hash matches", async () => {
      const version = "1.0.0";
      const bundlePath = "/path/to/bundle.js";
      const hash = "abc123def456";

      vi.mocked(mockStorage.getBundleHash).mockReturnValue(hash);
      vi.mocked(mockConfig.hashFile).mockResolvedValue(hash);

      const result = await validator.validateBundle(version, bundlePath);

      expect(result).toBe(true);
      expect(mockStorage.getBundleHash).toHaveBeenCalledWith(version);
      expect(mockConfig.hashFile).toHaveBeenCalledWith(bundlePath);
    });

    it("returns false when hash mismatches", async () => {
      const version = "1.0.0";
      const bundlePath = "/path/to/bundle.js";
      const expectedHash = "abc123def456";
      const actualHash = "corrupted789";

      vi.mocked(mockStorage.getBundleHash).mockReturnValue(expectedHash);
      vi.mocked(mockConfig.hashFile).mockResolvedValue(actualHash);

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const result = await validator.validateBundle(version, bundlePath);
      warnSpy.mockRestore();

      expect(result).toBe(false);
    });

    it("returns false for bundles without stored hash by default (secure mode)", async () => {
      const version = "0.9.0";
      const bundlePath = "/path/to/legacy-bundle.js";

      vi.mocked(mockStorage.getBundleHash).mockReturnValue(null);

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const result = await validator.validateBundle(version, bundlePath);
      warnSpy.mockRestore();

      expect(result).toBe(false);
      expect(mockStorage.getBundleHash).toHaveBeenCalledWith(version);
      // hashFile should not be called when no stored hash
      expect(mockConfig.hashFile).not.toHaveBeenCalled();
    });

    it("returns true for bundles without stored hash when allowLegacyBundles is true", async () => {
      const version = "0.9.0";
      const bundlePath = "/path/to/legacy-bundle.js";
      const legacyConfig: BundleValidatorConfig = {
        hashFile: vi.fn(),
        allowLegacyBundles: true,
      };
      const legacyValidator = new BundleValidator(mockStorage, legacyConfig);

      vi.mocked(mockStorage.getBundleHash).mockReturnValue(null);

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const result = await legacyValidator.validateBundle(version, bundlePath);
      warnSpy.mockRestore();

      expect(result).toBe(true);
      expect(mockStorage.getBundleHash).toHaveBeenCalledWith(version);
      // hashFile should not be called for legacy bundles
      expect(legacyConfig.hashFile).not.toHaveBeenCalled();
    });

    it("removes bundle on hash mismatch", async () => {
      const version = "2.0.0";
      const bundlePath = "/path/to/corrupted.js";

      vi.mocked(mockStorage.getBundleHash).mockReturnValue("expected-hash");
      vi.mocked(mockConfig.hashFile).mockResolvedValue("actual-hash");

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      await validator.validateBundle(version, bundlePath);
      warnSpy.mockRestore();

      expect(mockStorage.removeBundleVersion).toHaveBeenCalledWith(version);
    });

    it("calls onValidationFailed callback on mismatch", async () => {
      const version = "3.0.0";
      const bundlePath = "/path/to/bundle.js";
      const expectedHash = "expected123";
      const actualHash = "actual456";

      vi.mocked(mockStorage.getBundleHash).mockReturnValue(expectedHash);
      vi.mocked(mockConfig.hashFile).mockResolvedValue(actualHash);

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      await validator.validateBundle(version, bundlePath);
      warnSpy.mockRestore();

      expect(mockConfig.onValidationFailed).toHaveBeenCalledWith(version, expectedHash, actualHash);
    });

    it("does not call onValidationFailed when hashes match", async () => {
      const version = "1.0.0";
      const hash = "matching-hash";

      vi.mocked(mockStorage.getBundleHash).mockReturnValue(hash);
      vi.mocked(mockConfig.hashFile).mockResolvedValue(hash);

      await validator.validateBundle(version, "/path/to/bundle.js");

      expect(mockConfig.onValidationFailed).not.toHaveBeenCalled();
    });

    it("does not remove bundle when hashes match", async () => {
      const version = "1.0.0";
      const hash = "valid-hash";

      vi.mocked(mockStorage.getBundleHash).mockReturnValue(hash);
      vi.mocked(mockConfig.hashFile).mockResolvedValue(hash);

      await validator.validateBundle(version, "/path/to/bundle.js");

      expect(mockStorage.removeBundleVersion).not.toHaveBeenCalled();
    });

    it("logs warning on hash mismatch", async () => {
      const version = "1.2.3";
      const expectedHash = "expected-abc";
      const actualHash = "actual-xyz";

      vi.mocked(mockStorage.getBundleHash).mockReturnValue(expectedHash);
      vi.mocked(mockConfig.hashFile).mockResolvedValue(actualHash);

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      await validator.validateBundle(version, "/path/to/bundle.js");

      // Logger outputs: '[BundleNudge]', 'message', '' (context)
      expect(warnSpy).toHaveBeenCalledWith(
        "[BundleNudge]",
        expect.stringContaining(`Hash mismatch for version ${version}`),
        "",
      );

      warnSpy.mockRestore();
    });

    it("works correctly with multiple validations", async () => {
      // First validation - valid
      vi.mocked(mockStorage.getBundleHash).mockReturnValueOnce("hash1");
      vi.mocked(mockConfig.hashFile).mockResolvedValueOnce("hash1");
      const result1 = await validator.validateBundle("v1", "/path/v1.js");
      expect(result1).toBe(true);

      // Second validation - invalid
      vi.mocked(mockStorage.getBundleHash).mockReturnValueOnce("hash2");
      vi.mocked(mockConfig.hashFile).mockResolvedValueOnce("wrong-hash");
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const result2 = await validator.validateBundle("v2", "/path/v2.js");
      expect(result2).toBe(false);

      // Third validation - no stored hash (rejected in secure mode)
      vi.mocked(mockStorage.getBundleHash).mockReturnValueOnce(null);
      const result3 = await validator.validateBundle("v3", "/path/v3.js");
      expect(result3).toBe(false);
      warnSpy.mockRestore();
    });

    it("works without onValidationFailed callback", async () => {
      const configWithoutCallback: BundleValidatorConfig = {
        hashFile: vi.fn().mockResolvedValue("actual"),
      };
      const validatorNoCallback = new BundleValidator(mockStorage, configWithoutCallback);

      vi.mocked(mockStorage.getBundleHash).mockReturnValue("expected");

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const result = await validatorNoCallback.validateBundle("1.0.0", "/path/bundle.js");
      warnSpy.mockRestore();

      expect(result).toBe(false);
      expect(mockStorage.removeBundleVersion).toHaveBeenCalled();
    });

    it("returns false when hashFile returns empty string by default", async () => {
      const version = "1.0.0";
      const bundlePath = "/path/to/bundle.js";

      vi.mocked(mockStorage.getBundleHash).mockReturnValue("expected-hash");
      vi.mocked(mockConfig.hashFile).mockResolvedValue("");

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const result = await validator.validateBundle(version, bundlePath);
      warnSpy.mockRestore();

      expect(result).toBe(false);
    });

    it("returns true when hashFile returns empty with allowLegacyBundles", async () => {
      const version = "1.0.0";
      const bundlePath = "/path/to/bundle.js";
      const legacyConfig: BundleValidatorConfig = {
        hashFile: vi.fn().mockResolvedValue(""),
        allowLegacyBundles: true,
      };
      const legacyValidator = new BundleValidator(mockStorage, legacyConfig);

      vi.mocked(mockStorage.getBundleHash).mockReturnValue("expected-hash");

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const result = await legacyValidator.validateBundle(version, bundlePath);
      warnSpy.mockRestore();

      expect(result).toBe(true);
    });
  });

  describe("validateBundleDetailed", () => {
    it("returns hash_match reason when valid", async () => {
      const hash = "matching-hash";
      vi.mocked(mockStorage.getBundleHash).mockReturnValue(hash);
      vi.mocked(mockConfig.hashFile).mockResolvedValue(hash);

      const result = await validator.validateBundleDetailed("1.0.0", "/path/bundle.js");

      expect(result).toEqual({ valid: true, reason: "hash_match" });
    });

    it("returns no_stored_hash reason for bundles without hash (default secure mode)", async () => {
      vi.mocked(mockStorage.getBundleHash).mockReturnValue(null);

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const result = await validator.validateBundleDetailed("0.9.0", "/path/bundle.js");
      warnSpy.mockRestore();

      expect(result).toEqual({ valid: false, reason: "no_stored_hash" });
    });

    it("returns legacy_bundle reason when allowLegacyBundles is true", async () => {
      const legacyConfig: BundleValidatorConfig = {
        hashFile: vi.fn(),
        allowLegacyBundles: true,
      };
      const legacyValidator = new BundleValidator(mockStorage, legacyConfig);

      vi.mocked(mockStorage.getBundleHash).mockReturnValue(null);

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const result = await legacyValidator.validateBundleDetailed("0.9.0", "/path/bundle.js");
      warnSpy.mockRestore();

      expect(result).toEqual({ valid: true, reason: "legacy_bundle" });
    });

    it("returns hash_mismatch reason when invalid", async () => {
      vi.mocked(mockStorage.getBundleHash).mockReturnValue("expected");
      vi.mocked(mockConfig.hashFile).mockResolvedValue("actual");

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const result = await validator.validateBundleDetailed("1.0.0", "/path/bundle.js");
      warnSpy.mockRestore();

      expect(result).toEqual({ valid: false, reason: "hash_mismatch" });
    });

    it("returns verification_unavailable when hashFile returns empty", async () => {
      vi.mocked(mockStorage.getBundleHash).mockReturnValue("expected");
      vi.mocked(mockConfig.hashFile).mockResolvedValue("");

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const result = await validator.validateBundleDetailed("1.0.0", "/path/bundle.js");
      warnSpy.mockRestore();

      expect(result).toEqual({
        valid: false,
        reason: "verification_unavailable",
      });
    });

    it("returns unavailable when fileExists returns false", async () => {
      const configWithFileExists: BundleValidatorConfig = {
        hashFile: vi.fn(),
        fileExists: vi.fn().mockResolvedValue(false),
      };
      const v = new BundleValidator(mockStorage, configWithFileExists);

      vi.mocked(mockStorage.getBundleHash).mockReturnValue("expected-hash");

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const result = await v.validateBundleDetailed("1.0.0", "/missing/bundle.js");
      warnSpy.mockRestore();

      expect(result).toEqual({ valid: false, reason: "unavailable" });
      expect(configWithFileExists.hashFile).not.toHaveBeenCalled();
    });

    it("returns hash_mismatch when file exists but hash is wrong", async () => {
      const configWithFileExists: BundleValidatorConfig = {
        hashFile: vi.fn().mockResolvedValue("wrong-hash"),
        fileExists: vi.fn().mockResolvedValue(true),
      };
      const v = new BundleValidator(mockStorage, configWithFileExists);

      vi.mocked(mockStorage.getBundleHash).mockReturnValue("expected-hash");

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const result = await v.validateBundleDetailed("1.0.0", "/path/bundle.js");
      warnSpy.mockRestore();

      expect(result).toEqual({ valid: false, reason: "hash_mismatch" });
    });

    it("returns unavailable when hashFile throws ENOENT", async () => {
      vi.mocked(mockStorage.getBundleHash).mockReturnValue("expected-hash");
      vi.mocked(mockConfig.hashFile).mockRejectedValue(new Error("ENOENT: no such file"));

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const result = await validator.validateBundleDetailed("1.0.0", "/missing/bundle.js");
      warnSpy.mockRestore();

      expect(result).toEqual({ valid: false, reason: "unavailable" });
    });

    it("returns unavailable when fileExists check throws", async () => {
      const configWithBrokenFileExists: BundleValidatorConfig = {
        hashFile: vi.fn(),
        fileExists: vi.fn().mockRejectedValue(new Error("fs error")),
      };
      const v = new BundleValidator(mockStorage, configWithBrokenFileExists);

      vi.mocked(mockStorage.getBundleHash).mockReturnValue("expected-hash");

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const result = await v.validateBundleDetailed("1.0.0", "/path/bundle.js");
      warnSpy.mockRestore();

      expect(result).toEqual({ valid: false, reason: "unavailable" });
    });
  });
});
