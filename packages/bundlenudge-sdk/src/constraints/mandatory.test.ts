/**
 * Mandatory Update Handling Tests
 *
 * Tests for the mandatory update module that handles critical updates
 * and app store update requirements.
 */

import { describe, expect, it } from "vitest";
import {
  checkAppStoreUpdate,
  checkMandatoryUpdate,
  getMandatoryMessage,
  shouldBlockApp,
  shouldRedirectToStore,
} from "./mandatory";
import type {
  AppStoreUpdateResponse,
  MandatoryUpdateConfig,
  MandatoryUpdateData,
} from "./mandatory";

describe("checkMandatoryUpdate", () => {
  it("returns non-mandatory state when update is null", () => {
    const result = checkMandatoryUpdate(null);
    expect(result).toEqual({
      isMandatory: false,
      message: null,
      canDismiss: true,
    });
  });

  it("returns non-mandatory state when mandatory is false", () => {
    const update: MandatoryUpdateData = { mandatory: false };
    const result = checkMandatoryUpdate(update);
    expect(result).toEqual({
      isMandatory: false,
      message: null,
      canDismiss: true,
    });
  });

  it("returns non-mandatory state when mandatory is undefined", () => {
    const update: MandatoryUpdateData = {};
    const result = checkMandatoryUpdate(update);
    expect(result).toEqual({
      isMandatory: false,
      message: null,
      canDismiss: true,
    });
  });

  it("returns mandatory state with default message", () => {
    const update: MandatoryUpdateData = { mandatory: true };
    const result = checkMandatoryUpdate(update);
    expect(result.isMandatory).toBe(true);
    expect(result.message).toBe("A critical update is required to continue using this app.");
    expect(result.canDismiss).toBe(false);
  });

  it("returns mandatory state with update message", () => {
    const update: MandatoryUpdateData = {
      mandatory: true,
      mandatoryMessage: "Security fix required",
    };
    const result = checkMandatoryUpdate(update);
    expect(result.message).toBe("Security fix required");
  });

  it("uses config message when update has no message", () => {
    const update: MandatoryUpdateData = { mandatory: true };
    const config: MandatoryUpdateConfig = {
      mandatoryMessage: "Custom default message",
    };
    const result = checkMandatoryUpdate(update, config);
    expect(result.message).toBe("Custom default message");
  });

  it("prefers update message over config message", () => {
    const update: MandatoryUpdateData = {
      mandatory: true,
      mandatoryMessage: "Update message",
    };
    const config: MandatoryUpdateConfig = {
      mandatoryMessage: "Config message",
    };
    const result = checkMandatoryUpdate(update, config);
    expect(result.message).toBe("Update message");
  });

  it("respects allowDismissal config", () => {
    const update: MandatoryUpdateData = { mandatory: true };
    const config: MandatoryUpdateConfig = { allowDismissal: true };
    const result = checkMandatoryUpdate(update, config);
    expect(result.canDismiss).toBe(true);
  });

  it("defaults canDismiss to false for mandatory updates", () => {
    const update: MandatoryUpdateData = { mandatory: true };
    const result = checkMandatoryUpdate(update);
    expect(result.canDismiss).toBe(false);
  });
});

describe("getMandatoryMessage", () => {
  it("returns default message when update is null", () => {
    const result = getMandatoryMessage(null);
    expect(result).toBe("A critical update is required to continue using this app.");
  });

  it("returns custom default when provided and update has no message", () => {
    const result = getMandatoryMessage(null, "Custom default");
    expect(result).toBe("Custom default");
  });

  it("returns update message when available", () => {
    const update: MandatoryUpdateData = { mandatoryMessage: "Update message" };
    const result = getMandatoryMessage(update);
    expect(result).toBe("Update message");
  });

  it("prefers update message over default", () => {
    const update: MandatoryUpdateData = { mandatoryMessage: "Update message" };
    const result = getMandatoryMessage(update, "Default message");
    expect(result).toBe("Update message");
  });

  it("returns empty string message if provided", () => {
    const update: MandatoryUpdateData = { mandatoryMessage: "" };
    const result = getMandatoryMessage(update);
    // Empty string is falsy, so default is used
    expect(result).toBe("A critical update is required to continue using this app.");
  });
});

describe("checkAppStoreUpdate", () => {
  it("returns not required when requiresAppStoreUpdate is false", () => {
    const response: AppStoreUpdateResponse = { requiresAppStoreUpdate: false };
    const result = checkAppStoreUpdate(response);
    expect(result).toEqual({
      required: false,
      message: null,
      storeUrl: null,
    });
  });

  it("returns not required when requiresAppStoreUpdate is undefined", () => {
    const response: AppStoreUpdateResponse = {};
    const result = checkAppStoreUpdate(response);
    expect(result).toEqual({
      required: false,
      message: null,
      storeUrl: null,
    });
  });

  it("returns required with default message", () => {
    const response: AppStoreUpdateResponse = { requiresAppStoreUpdate: true };
    const result = checkAppStoreUpdate(response);
    expect(result.required).toBe(true);
    expect(result.message).toBe("Please update the app from the store to continue.");
    expect(result.storeUrl).toBeNull();
  });

  it("returns required with custom message", () => {
    const response: AppStoreUpdateResponse = {
      requiresAppStoreUpdate: true,
      appStoreMessage: "New version available in store",
    };
    const result = checkAppStoreUpdate(response);
    expect(result.message).toBe("New version available in store");
  });

  it("returns required with store URL", () => {
    const response: AppStoreUpdateResponse = {
      requiresAppStoreUpdate: true,
      appStoreUrl: "https://apps.apple.com/app/myapp",
    };
    const result = checkAppStoreUpdate(response);
    expect(result.storeUrl).toBe("https://apps.apple.com/app/myapp");
  });

  it("returns all fields when provided", () => {
    const response: AppStoreUpdateResponse = {
      requiresAppStoreUpdate: true,
      appStoreMessage: "Custom message",
      appStoreUrl: "https://play.google.com/store/apps/details?id=com.myapp",
    };
    const result = checkAppStoreUpdate(response);
    expect(result).toEqual({
      required: true,
      message: "Custom message",
      storeUrl: "https://play.google.com/store/apps/details?id=com.myapp",
    });
  });
});

describe("shouldBlockApp", () => {
  it("returns true when mandatory and cannot dismiss", () => {
    const state = { isMandatory: true, message: "msg", canDismiss: false };
    expect(shouldBlockApp(state)).toBe(true);
  });

  it("returns false when mandatory but can dismiss", () => {
    const state = { isMandatory: true, message: "msg", canDismiss: true };
    expect(shouldBlockApp(state)).toBe(false);
  });

  it("returns false when not mandatory", () => {
    const state = { isMandatory: false, message: null, canDismiss: true };
    expect(shouldBlockApp(state)).toBe(false);
  });
});

describe("shouldRedirectToStore", () => {
  it("returns true when required and has store URL", () => {
    const state = { required: true, message: "msg", storeUrl: "https://store.com" };
    expect(shouldRedirectToStore(state)).toBe(true);
  });

  it("returns false when required but no store URL", () => {
    const state = { required: true, message: "msg", storeUrl: null };
    expect(shouldRedirectToStore(state)).toBe(false);
  });

  it("returns false when not required", () => {
    const state = { required: false, message: null, storeUrl: null };
    expect(shouldRedirectToStore(state)).toBe(false);
  });
});
