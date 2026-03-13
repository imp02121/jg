/** BundleNudge - Main SDK class for React Native OTA updates. */

import { AppState, type AppStateStatus } from "react-native";
import type { BundleValidator } from "./bundle-validator";
import {
  type BundleNudgeCallbacks,
  isValidApiUrl,
  validateApiKey,
  validateAppId,
} from "./bundlenudge-helpers";
import {
  type InitContext,
  createBundleValidator,
  createNativeModuleProxy,
  createVersionGuard,
  initHealthMonitor,
  registerDevice,
} from "./bundlenudge-init";
import {
  type CheckTrigger,
  type UpdateContext,
  checkForUpdate as doCheckForUpdate,
  downloadAndInstall as doDownloadAndInstall,
} from "./bundlenudge-updates";
import { CircuitBreaker } from "./circuit-breaker";
import { CrashDetector } from "./crash-detector";
import { logError, logInfo, logWarn, setDebugEnabled } from "./debug/logger";
import type { HealthMonitor } from "./health-monitor";
import { Mutex } from "./mutex";
import { checkForCrashOnStart, clearBundleLoading } from "./native-crash-guard";
import { RollbackManager } from "./rollback-manager";
import { Storage } from "./storage";
import { addDismissedMessage, isDismissed } from "./storage/dismissed-messages";
import type {
  BundleNudgeConfig,
  NativeModuleInterface,
  UpdateCheckResult,
  UpdateInfo,
  UpdateStatus,
} from "./types";
import { Updater } from "./updater";
import type { VersionGuard } from "./version-guard";

export {
  isValidApiUrl,
  validateAppId,
  validateApiKey,
} from "./bundlenudge-helpers";
export type { BundleNudgeCallbacks } from "./bundlenudge-helpers";

export interface BundleReleaseInfo {
  version: string | null;
  releaseNotes: string | null;
  releasedAt: string | null;
  isOtaUpdate: boolean;
}

export class BundleNudge {
  private static instance: BundleNudge | null = null;
  private static initPromise: Promise<BundleNudge> | null = null;

  private config: BundleNudgeConfig;
  private callbacks: BundleNudgeCallbacks;
  private storage: Storage;
  private updater: Updater;
  private crashDetector: CrashDetector;
  private rollbackManager: RollbackManager;
  private circuitBreaker: CircuitBreaker;
  private versionGuard: VersionGuard | null = null;
  private bundleValidator: BundleValidator;
  private healthMonitor: HealthMonitor | null = null;
  private nativeModule: NativeModuleInterface | null = null;
  private status: UpdateStatus = "idle";
  private isInitialized = false;
  private operationMutex = new Mutex();
  private backgroundCheckTimer: ReturnType<typeof setInterval> | null = null;
  private appStateSubscription: { remove: () => void } | null = null;
  private lastCheckResult: UpdateCheckResult | null = null;
  private checkResultListeners = new Set<() => void>();
  private currentMessage: { id: string; title: string; body: string } | null = null;
  private messageListeners = new Set<() => void>();
  private cachedNativeConfig: {
    appVersion: string;
    buildNumber: string;
  } | null = null;

  private constructor(config: BundleNudgeConfig, callbacks: BundleNudgeCallbacks = {}) {
    this.config = config;
    this.callbacks = callbacks;
    if (config.debug) setDebugEnabled(true);
    this.storage = new Storage({
      suppressSecurityWarnings: config.suppressStorageSecurityWarnings,
    });

    const { module } = createNativeModuleProxy();
    this.nativeModule = module;
    this.circuitBreaker = new CircuitBreaker();

    this.updater = new Updater({
      storage: this.storage,
      config: this.config,
      nativeModule: module,
      circuitBreaker: this.circuitBreaker,
      onNetworkError: (err) => this.callbacks.onError?.(err),
    });

    this.crashDetector = new CrashDetector(this.storage, {
      verificationWindowMs: this.config.verificationWindowMs,
      crashThreshold: this.config.crashThreshold,
      crashWindowMs: this.config.crashWindowMs,
      onRollback: async () => this.rollbackManager.rollback("crash_detected"),
      onVerified: async () => this.rollbackManager.markUpdateVerified(),
    });

    this.rollbackManager = new RollbackManager({
      storage: this.storage,
      config: this.config,
      nativeModule: module,
      circuitBreaker: this.circuitBreaker,
    });
    this.bundleValidator = createBundleValidator(
      this.storage,
      this.nativeModule,
      config.allowLegacyBundles,
    );
  }

  /**
   * Initialize the BundleNudge SDK. Must be called once before using any other methods.
   * Returns the singleton instance. Subsequent calls return the same instance.
   *
   * @param config - SDK configuration options (appId is required)
   * @param callbacks - Optional lifecycle callbacks (onStatusChange, onError, etc.)
   * @returns The initialized BundleNudge instance
   * @throws If appId is invalid or apiUrl uses HTTP in production
   */
  static async initialize(
    config: BundleNudgeConfig,
    callbacks?: BundleNudgeCallbacks,
  ): Promise<BundleNudge> {
    const appIdErr = validateAppId(config.appId);
    if (appIdErr) throw new Error(`BundleNudge: ${appIdErr}`);
    if (config.apiKey !== undefined) {
      const keyErr = validateApiKey(config.apiKey);
      if (keyErr) throw new Error(`BundleNudge: ${keyErr}`);
    }
    if (config.apiUrl && !isValidApiUrl(config.apiUrl)) {
      throw new Error(
        "BundleNudge: apiUrl must use HTTPS. HTTP is only allowed for localhost/127.0.0.1 during development.",
      );
    }
    if (BundleNudge.instance) return BundleNudge.instance;
    if (BundleNudge.initPromise) return BundleNudge.initPromise;
    BundleNudge.initPromise = (async () => {
      const instance = new BundleNudge(config, callbacks);
      await instance.init();
      BundleNudge.instance = instance;
      BundleNudge.initPromise = null;
      return instance;
    })();
    return BundleNudge.initPromise;
  }

  /**
   * Get the initialized BundleNudge instance.
   * @throws If the SDK has not been initialized via `BundleNudge.initialize()`
   */
  static getInstance(): BundleNudge {
    if (!BundleNudge.instance) {
      throw new Error("BundleNudge: Not initialized. Call BundleNudge.initialize() first.");
    }
    return BundleNudge.instance;
  }

  /** Check whether the SDK has been initialized. */
  static isInitialized(): boolean {
    return BundleNudge.instance !== null;
  }

  private getUpdateContext(): UpdateContext {
    return {
      config: this.config,
      callbacks: this.callbacks,
      updater: this.updater,
      storage: this.storage,
      setStatus: (s) => {
        this.setStatus(s);
      },
      setLastCheckResult: (result) => {
        this.lastCheckResult = result;
        this.checkResultListeners.forEach((fn) => {
          fn();
        });
        void this.processMessage(result);
      },
      restartApp: () => this.restartApp(),
    };
  }

  /**
   * Check for an available OTA update. Returns update info if available, null otherwise.
   * Acquires a mutex to prevent concurrent update operations.
   *
   * @param trigger - What triggered the check: "manual", "init", "foreground", or "background"
   * @returns Update info if an update is available, null if up to date
   */
  async checkForUpdate(trigger: CheckTrigger = "manual"): Promise<UpdateInfo | null> {
    const release = await this.operationMutex.acquire();
    try {
      return await doCheckForUpdate(this.getUpdateContext(), trigger);
    } finally {
      release();
    }
  }
  /**
   * Download and install an OTA update. Streams the bundle to disk,
   * verifies the SHA-256 hash, and applies based on `installMode`.
   *
   * @param update - The update info returned from `checkForUpdate()`
   */
  async downloadAndInstall(update: UpdateInfo): Promise<void> {
    const release = await this.operationMutex.acquire();
    try {
      await doDownloadAndInstall(this.getUpdateContext(), update);
    } finally {
      release();
    }
  }

  /**
   * Check for an update and install it if available (one-step convenience method).
   * Equivalent to calling `checkForUpdate()` then `downloadAndInstall()`.
   *
   * @param trigger - What triggered the sync: "manual", "init", "foreground", or "background"
   */
  async sync(trigger: CheckTrigger = "manual"): Promise<void> {
    logInfo("Sync starting", { trigger });
    try {
      const update = await this.checkForUpdate(trigger);
      if (update) await this.downloadAndInstall(update);
      logInfo("Sync complete", { updated: String(!!update) });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logError("Sync error", { trigger, detail: message });
      throw error;
    }
  }

  /**
   * Notify the SDK that the app has rendered successfully.
   * Call this after your main UI renders. This is one of two conditions
   * (along with health checks) required for update verification.
   * Starts the stability window timer.
   */
  async notifyAppReady(): Promise<void> {
    await clearBundleLoading();
    await this.crashDetector.notifyAppReady();
    await this.nativeModule?.notifyAppReady();
  }

  /** Restart the app to apply a pending update. Only restarts if an update is pending. */
  async restartApp(): Promise<void> {
    await this.nativeModule?.restartApp(true);
  }
  /** Clear all OTA updates, circuit breaker blacklist, and revert to the embedded bundle. */
  async clearUpdates(): Promise<void> {
    this.stopBackgroundChecks();
    await this.circuitBreaker.clear();
    await this.nativeModule?.clearUpdates();
  }
  /** Get the current update status (idle, checking, downloading, installing, etc.). */
  getStatus(): UpdateStatus {
    return this.status;
  }
  /** Get the currently active OTA bundle version, or null if running the embedded bundle. */
  getCurrentVersion(): string | null {
    return this.storage.getCurrentVersion();
  }
  /** Get release info including version, release notes, release date, and whether this is an OTA update. */
  getReleaseInfo(): BundleReleaseInfo {
    return {
      version: this.storage.getCurrentVersion(),
      releaseNotes: this.storage.getReleaseNotes(),
      releasedAt: this.storage.getReleasedAt(),
      isOtaUpdate: this.storage.getCurrentVersion() !== null,
    };
  }
  getLastUpdateCheckResult(): UpdateCheckResult | null {
    return this.lastCheckResult;
  }
  onCheckResultChange(listener: () => void): () => void {
    this.checkResultListeners.add(listener);
    return () => {
      this.checkResultListeners.delete(listener);
    };
  }

  /** Get the current in-app message (null if none or dismissed) */
  getCurrentMessage(): { id: string; title: string; body: string } | null {
    return this.currentMessage;
  }

  /** Subscribe to message changes. Returns unsubscribe function. */
  onMessageChange(listener: () => void): () => void {
    this.messageListeners.add(listener);
    return () => {
      this.messageListeners.delete(listener);
    };
  }

  /** Dismiss the current message. Persists across sessions via AsyncStorage. */
  async dismissMessage(messageId: string): Promise<void> {
    await addDismissedMessage(messageId);
    if (this.currentMessage?.id === messageId) {
      this.currentMessage = null;
      this.notifyMessageListeners();
    }
  }

  /** Check if a rollback to the previous bundle version is available. */
  canRollback(): boolean {
    return this.rollbackManager.canRollback();
  }
  getBundleValidator(): BundleValidator {
    return this.bundleValidator;
  }
  /** Manually trigger a rollback to the previous bundle version. Restarts the app. */
  async rollback(): Promise<void> {
    await this.rollbackManager.rollback("manual");
  }
  /** Track a named event for health monitoring (e.g., "main_screen_loaded"). */
  trackEvent(name: string): void {
    this.healthMonitor?.reportEvent(name);
  }
  /**
   * Track an API endpoint response for health monitoring.
   * @param m - HTTP method (e.g., "GET", "POST")
   * @param u - URL path (e.g., "/api/user")
   * @param s - HTTP status code (e.g., 200)
   */
  trackEndpoint(m: string, u: string, s: number): void {
    this.healthMonitor?.reportEndpoint(m, u, s);
  }
  /** Check if all configured health checks have passed. Returns true if no health checks are configured. */
  isHealthVerified(): boolean {
    return this.healthMonitor?.isFullyVerified() ?? true;
  }

  private async init(): Promise<void> {
    if (this.isInitialized) return;
    await this.storage.initialize();
    await this.circuitBreaker.load();

    if (this.nativeModule) {
      const cfg = await this.nativeModule.getConfiguration();
      this.cachedNativeConfig = {
        appVersion: cfg.appVersion,
        buildNumber: cfg.buildNumber,
      };
    }

    const ctx: InitContext = {
      config: this.config,
      storage: this.storage,
      nativeModule: this.nativeModule,
      crashDetector: this.crashDetector,
      cachedNativeConfig: this.cachedNativeConfig,
    };

    // Check native crash guard FIRST — before any OTA loading
    await this.checkNativeCrashGuard();

    // Sync native metadata → JS: if native applied a pending update on launch,
    // update JS storage so currentVersion is correct for update checks.
    await this.syncNativeMetadata();

    this.versionGuard = createVersionGuard(ctx);
    await this.versionGuard.checkForNativeUpdate();
    await this.validateCurrentBundle();
    if (!this.storage.getAccessToken()) await registerDevice(ctx);
    this.healthMonitor = await initHealthMonitor(ctx);
    await this.crashDetector.checkForCrash();
    this.crashDetector.startVerificationWindow();
    if (this.config.checkOnLaunch !== false)
      void this.sync("init").catch((error: unknown) => {
        const err = error instanceof Error ? error : new Error(String(error));
        this.callbacks.onError?.(err);
      });
    this.isInitialized = true;
    this.startBackgroundChecks();
    if (this.config.checkOnForeground !== false) {
      this.appStateSubscription = AppState.addEventListener("change", this.handleAppStateChange);
    }
  }

  private async syncNativeMetadata(): Promise<void> {
    if (!this.nativeModule) return;
    try {
      const nativeInfo = await this.nativeModule.getCurrentBundleInfo();
      const jsVersion = this.storage.getCurrentVersion();
      const jsPending = this.storage.getMetadata().pendingVersion;

      // Case 1: Native promoted pending → current on launch, sync to JS
      if (nativeInfo?.currentVersion && nativeInfo.currentVersion !== jsVersion) {
        logInfo("Syncing native metadata to JS storage", {
          nativeVersion: nativeInfo.currentVersion,
          jsVersion: jsVersion ?? "null",
        });
        await this.storage.applyPendingUpdate();
        return;
      }

      // Case 2: JS has a pending version but native has no record of it.
      // This happens when a previous build wrote to AsyncStorage but not metadata.json.
      // Clear the stale pending state so the SDK re-downloads properly.
      if (jsPending && !nativeInfo?.currentVersion && !nativeInfo?.pendingVersion) {
        logWarn("Stale pending version in JS storage, clearing", {
          stalePending: jsPending,
        });
        await this.storage.updateMetadata({
          pendingVersion: null,
          pendingVersionHash: null,
          pendingUpdateFlag: false,
          pendingReleaseNotes: null,
          pendingReleasedAt: null,
        });
        return;
      }

      // Case 3: JS has a pending version that differs from current, but native
      // bundleURL() was never called (e.g. DEBUG mode uses Metro dev server).
      // If the pending bundle exists on disk, promote it in JS so version
      // reporting stays accurate.
      if (jsPending && jsVersion !== jsPending) {
        const bundlePath = await this.nativeModule.getBundlePath();
        if (bundlePath) {
          logInfo("Promoting pending update in JS (bundleURL not called)", {
            pendingVersion: jsPending,
            currentVersion: jsVersion ?? "null",
          });
          await this.storage.applyPendingUpdate();
        }
      }
    } catch {
      // Non-fatal — update check will still work, just may re-download once
      logWarn("Failed to sync native metadata");
    }
  }

  private async validateCurrentBundle(): Promise<void> {
    const version = this.storage.getCurrentVersion();
    if (!version) return;
    try {
      const bundlePath = await this.nativeModule?.getBundlePath();
      if (!bundlePath) return;
      const result = await this.bundleValidator.validateBundleDetailed(version, bundlePath);
      if (!result.valid && result.reason === "hash_mismatch") {
        logError("Current bundle failed integrity check on load", {
          version,
          reason: result.reason,
        });
        if (this.rollbackManager.canRollback()) {
          await this.rollbackManager.rollback("crash_detected");
        }
      }
    } catch {
      logWarn("Bundle validation on load skipped due to error");
    }
  }

  private async checkNativeCrashGuard(): Promise<void> {
    const result = await checkForCrashOnStart();
    if (!result.crashed) return;
    logWarn("Native crash detected on previous launch", {
      version: result.version,
      hash: result.hash,
    });
    if (this.rollbackManager.canRollback()) {
      await this.rollbackManager.rollback("native_crash_detected");
    }
  }

  private startBackgroundChecks(): void {
    if (this.backgroundCheckTimer) return;
    const intervalMs = (this.config.backgroundCheckInterval ?? 300) * 1000;
    this.backgroundCheckTimer = setInterval(() => {
      void this.sync("background").catch((error: unknown) => {
        const err = error instanceof Error ? error : new Error(String(error));
        this.callbacks.onError?.(err);
      });
    }, intervalMs);
  }

  private stopBackgroundChecks(): void {
    if (this.backgroundCheckTimer) {
      clearInterval(this.backgroundCheckTimer);
      this.backgroundCheckTimer = null;
    }
    this.appStateSubscription?.remove();
    this.appStateSubscription = null;
  }

  private handleAppStateChange = (nextState: AppStateStatus): void => {
    if (nextState === "active") {
      // Restart background timer if it was lost (e.g. JS runtime recreated)
      if (!this.backgroundCheckTimer) {
        logInfo("Restarting background timer after foreground transition");
        this.startBackgroundChecks();
      }
      void this.sync("foreground").catch((error: unknown) => {
        const err = error instanceof Error ? error : new Error(String(error));
        this.callbacks.onError?.(err);
      });
    }
  };

  private setStatus(status: UpdateStatus): void {
    this.status = status;
    this.callbacks.onStatusChange?.(status);
  }

  private notifyMessageListeners(): void {
    for (const listener of this.messageListeners) {
      try {
        listener();
      } catch {
        /* ignore */
      }
    }
  }

  private async processMessage(result: UpdateCheckResult): Promise<void> {
    const msg = result.message ?? null;
    if (!msg) {
      logInfo("No in-app message from server");
      if (this.currentMessage) {
        this.currentMessage = null;
        this.notifyMessageListeners();
      }
      return;
    }

    logInfo("In-app message received", { id: msg.id, title: msg.title });

    const dismissed = await isDismissed(msg.id);
    if (dismissed) {
      logInfo("In-app message already dismissed", { id: msg.id });
      return;
    }

    this.currentMessage = msg;
    this.notifyMessageListeners();
    logInfo("In-app message active", { id: msg.id });
  }
}
