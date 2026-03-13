/**
 * useInAppMessage Hook Tests
 *
 * Tests for the React hook that exposes in-app message state.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock BundleNudge
const mockGetCurrentMessage = vi.fn();
const mockOnMessageChange = vi.fn();
const mockDismissMessage = vi.fn();
let mockThrowOnGetInstance = false;

vi.mock("../bundlenudge", () => ({
  BundleNudge: {
    getInstance: () => {
      if (mockThrowOnGetInstance) {
        throw new Error("BundleNudge not initialized");
      }
      return {
        getCurrentMessage: mockGetCurrentMessage,
        onMessageChange: mockOnMessageChange,
        dismissMessage: mockDismissMessage,
      };
    },
  },
}));

type MessageType = { id: string; title: string; body: string } | null;

// Track the latest result from useSyncExternalStore
let latestSubscribe: ((cb: () => void) => () => void) | null = null;
let latestGetSnapshot: (() => MessageType) | null = null;

vi.mock("react", () => ({
  useSyncExternalStore: (
    subscribe: (cb: () => void) => () => void,
    getSnapshot: () => MessageType,
  ): MessageType => {
    latestSubscribe = subscribe;
    latestGetSnapshot = getSnapshot;
    return getSnapshot();
  },
  useCallback: <T>(fn: T): T => fn,
  useMemo: <T>(fn: () => T): T => fn(),
}));

// Import hook after mocks are set up
import { useInAppMessage } from "./useInAppMessage";

describe("useInAppMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockThrowOnGetInstance = false;
    latestSubscribe = null;
    latestGetSnapshot = null;
    mockOnMessageChange.mockReturnValue(() => {
      /* noop */
    });
  });

  it("returns null when SDK is not initialized", () => {
    mockThrowOnGetInstance = true;

    const result = useInAppMessage();

    expect(result.message).toBeNull();
    expect(result.hasMessage).toBe(false);
  });

  it("returns null when no message exists", () => {
    mockGetCurrentMessage.mockReturnValue(null);

    const result = useInAppMessage();

    expect(result.message).toBeNull();
    expect(result.hasMessage).toBe(false);
  });

  it("returns message after update check", () => {
    const msg = { id: "msg-1", title: "Update!", body: "Please update now" };
    mockGetCurrentMessage.mockReturnValue(msg);

    const result = useInAppMessage();

    expect(result.message).toEqual(msg);
    expect(result.hasMessage).toBe(true);
  });

  it("dismiss calls dismissMessage on the singleton", () => {
    const msg = { id: "msg-2", title: "Hey", body: "Body text" };
    mockGetCurrentMessage.mockReturnValue(msg);

    const result = useInAppMessage();
    result.dismiss();

    expect(mockDismissMessage).toHaveBeenCalledWith("msg-2");
  });

  it("dismiss is a no-op when message is null", () => {
    mockGetCurrentMessage.mockReturnValue(null);

    const result = useInAppMessage();
    result.dismiss();

    expect(mockDismissMessage).not.toHaveBeenCalled();
  });

  it("hasMessage reflects state correctly", () => {
    mockGetCurrentMessage.mockReturnValue(null);
    const r1 = useInAppMessage();
    expect(r1.hasMessage).toBe(false);

    mockGetCurrentMessage.mockReturnValue({ id: "x", title: "T", body: "B" });
    const r2 = useInAppMessage();
    expect(r2.hasMessage).toBe(true);
  });

  it("subscribes to message changes via useSyncExternalStore", () => {
    mockGetCurrentMessage.mockReturnValue(null);

    useInAppMessage();

    expect(latestSubscribe).toBeTypeOf("function");
    expect(latestGetSnapshot).toBeTypeOf("function");
  });

  it("subscribe calls onMessageChange when SDK is initialized", () => {
    const mockUnsubscribe = vi.fn();
    mockOnMessageChange.mockReturnValue(mockUnsubscribe);
    mockGetCurrentMessage.mockReturnValue(null);

    useInAppMessage();

    const callback = vi.fn();
    const unsub = latestSubscribe?.(callback);

    expect(mockOnMessageChange).toHaveBeenCalledWith(callback);

    unsub();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it("subscribe returns noop when SDK is not initialized", () => {
    mockThrowOnGetInstance = true;

    useInAppMessage();

    const callback = vi.fn();
    const unsub = latestSubscribe?.(callback);
    expect(unsub).toBeTypeOf("function");
    // Should not throw
    unsub();
  });

  it("updates when message changes after mount", () => {
    mockGetCurrentMessage.mockReturnValue(null);

    const r1 = useInAppMessage();
    expect(r1.message).toBeNull();

    mockGetCurrentMessage.mockReturnValue({
      id: "new",
      title: "New",
      body: "New body",
    });

    const snapshot = latestGetSnapshot?.();
    expect(snapshot?.id).toBe("new");
    expect(snapshot?.title).toBe("New");
  });
});
