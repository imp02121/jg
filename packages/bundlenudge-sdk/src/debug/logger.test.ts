import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearLogs,
  getRecentLogs,
  isDebugEnabled,
  logDebug,
  logError,
  logInfo,
  logWarn,
  setDebugEnabled,
} from "./logger";

const noop = (): void => {
  /* test mock */
};

describe("logger", () => {
  const mocks = {
    debug: vi.spyOn(console, "debug").mockImplementation(noop),
    info: vi.spyOn(console, "info").mockImplementation(noop),
    warn: vi.spyOn(console, "warn").mockImplementation(noop),
    error: vi.spyOn(console, "error").mockImplementation(noop),
  };

  beforeEach(() => {
    setDebugEnabled(false);
    clearLogs();
    vi.clearAllMocks();
  });

  describe("setDebugEnabled/isDebugEnabled", () => {
    it("defaults to disabled", () => {
      expect(isDebugEnabled()).toBe(false);
    });
    it("enables debug mode", () => {
      setDebugEnabled(true);
      expect(isDebugEnabled()).toBe(true);
    });
    it("disables debug mode", () => {
      setDebugEnabled(true);
      setDebugEnabled(false);
      expect(isDebugEnabled()).toBe(false);
    });
  });

  describe("logDebug", () => {
    it("does not log when debug disabled", () => {
      logDebug("test");
      expect(mocks.debug).not.toHaveBeenCalled();
    });
    it("logs when debug enabled", () => {
      setDebugEnabled(true);
      logDebug("test message", { key: "value" });
      expect(mocks.debug).toHaveBeenCalledWith("[BundleNudge]", "test message", { key: "value" });
    });
    it("adds to history regardless of debug mode", () => {
      logDebug("hidden");
      expect(getRecentLogs()).toHaveLength(1);
    });
  });

  describe("logInfo", () => {
    it("does not log when debug disabled", () => {
      logInfo("info");
      expect(mocks.info).not.toHaveBeenCalled();
    });
    it("logs when debug enabled", () => {
      setDebugEnabled(true);
      logInfo("info");
      expect(mocks.info).toHaveBeenCalledWith("[BundleNudge]", "info", "");
    });
  });

  describe("logWarn", () => {
    it("logs message without context when debug disabled", () => {
      logWarn("warn", { detail: "hidden" });
      expect(mocks.warn).toHaveBeenCalledWith("[BundleNudge]", "warn", "");
    });
    it("logs message with context when debug enabled", () => {
      setDebugEnabled(true);
      logWarn("warn", { detail: "visible" });
      expect(mocks.warn).toHaveBeenCalledWith("[BundleNudge]", "warn", { detail: "visible" });
    });
  });

  describe("logError", () => {
    it("always logs with context when debug disabled", () => {
      logError("err", { error: "details" });
      expect(mocks.error).toHaveBeenCalledWith("[BundleNudge]", "err", { error: "details" });
    });
    it("always logs with context when debug enabled", () => {
      setDebugEnabled(true);
      logError("err", { error: "details" });
      expect(mocks.error).toHaveBeenCalledWith("[BundleNudge]", "err", { error: "details" });
    });
  });

  describe("getRecentLogs", () => {
    it("returns empty array initially", () => {
      expect(getRecentLogs()).toEqual([]);
    });
    it("returns all logs when count not specified", () => {
      logDebug("one");
      logInfo("two");
      logWarn("three");
      expect(getRecentLogs()).toHaveLength(3);
    });
    it("returns limited logs when count specified", () => {
      logDebug("one");
      logInfo("two");
      logWarn("three");
      expect(getRecentLogs(2)).toHaveLength(2);
      expect(getRecentLogs(2)[0].message).toBe("two");
    });
    it("limits history to 100 entries", () => {
      for (let i = 0; i < 110; i++) logDebug(`msg ${String(i)}`);
      expect(getRecentLogs()).toHaveLength(100);
      expect(getRecentLogs()[0].message).toBe("msg 10");
    });
  });

  describe("clearLogs", () => {
    it("clears log history", () => {
      logDebug("a");
      logInfo("b");
      clearLogs();
      expect(getRecentLogs()).toHaveLength(0);
    });
  });

  describe("log entry format", () => {
    it("has correct structure", () => {
      logDebug("test", { key: "value" });
      const e = getRecentLogs()[0];
      expect(e.level).toBe("debug");
      expect(e.message).toBe("test");
      expect(e.context).toEqual({ key: "value" });
      expect(e.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
    it("handles missing context", () => {
      logDebug("nc");
      expect(getRecentLogs()[0].context).toBeUndefined();
    });
  });
});
