/**
 * Toast Service for Antigravity Plugin
 */

import type { PluginClient } from "../types";
import { isTruthyFlag } from "../logging-utils";
import { createLogger } from "../logger";

const log = createLogger("toast");

export type ToastVariant = "info" | "warning" | "success" | "error";

export interface ToastOptions {
  message: string;
  variant: ToastVariant;
  title?: string;
  /** 
   * If true, ignore quiet_mode setting. 
   * Useful for critical errors or successful auth.
   */
  force?: boolean;
  /**
   * Optional abort signal to prevent showing toast if operation was cancelled.
   */
  signal?: AbortSignal;
}

let _client: PluginClient | null = null;
let _quietMode = false;
let _toastScope: "all" | "root_only" = "all";
let _isChildSession = false;

/**
 * Initialize the toast service with the plugin client and config.
 */
export function initToastService(
  client: PluginClient, 
  config: { quiet_mode: boolean; toast_scope?: "all" | "root_only" },
  isChildSession: boolean = false
): void {
  _client = client;
  _quietMode = config.quiet_mode;
  _toastScope = config.toast_scope ?? "all";
  _isChildSession = isChildSession;
}

/**
 * Update the quiet mode setting.
 */
export function setQuietMode(quiet: boolean): void {
  _quietMode = quiet;
}

/**
 * Update the child session status.
 */
export function setChildSession(isChild: boolean): void {
  _isChildSession = isChild;
}

/**
 * Show a toast notification to the user.
 * 
 * @param options - Toast message and options
 */
export async function showToast(options: ToastOptions | string, variant: ToastVariant = "info"): Promise<void> {
  const opts: ToastOptions = typeof options === "string" ? { message: options, variant } : options;
  
  // Log to debug always
  log.debug("show-toast", { ...opts, quietMode: _quietMode, toastScope: _toastScope, isChildSession: _isChildSession });

  if (!_client) {
    return;
  }

  if (_quietMode && !opts.force) {
    return;
  }

  // Filter toasts for child sessions when toast_scope is "root_only"
  if (_toastScope === "root_only" && _isChildSession && !opts.force) {
    log.debug("toast-suppressed-child-session", { message: opts.message, variant: opts.variant });
    return;
  }

  if (opts.signal?.aborted) {
    return;
  }

  try {
    await _client.tui.showToast({
      body: {
        title: opts.title,
        message: opts.message,
        variant: opts.variant,
      },
    });
  } catch (error) {
    // Silently ignore TUI errors
    log.debug("toast-failed", { error: String(error) });
  }
}

/**
 * Predefined toast helpers
 */
export const toast = {
  info: (message: string, options?: Partial<ToastOptions>) => showToast({ message, variant: "info", ...options }),
  warn: (message: string, options?: Partial<ToastOptions>) => showToast({ message, variant: "warning", ...options }),
  error: (message: string, options?: Partial<ToastOptions>) => showToast({ message, variant: "error", ...options }),
  success: (message: string, options?: Partial<ToastOptions>) => showToast({ message, variant: "success", ...options }),
};
