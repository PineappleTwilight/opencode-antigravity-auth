/**
 * Toast Service for Antigravity Plugin
 */

import type { PluginClient } from "../types.ts"
import { isTruthyFlag } from "../logging-utils.ts"
import { createLogger } from "../logger.ts"

const log = createLogger("toast")

export type ToastVariant = "info" | "warning" | "success" | "error"
export type ToastVerbosity = "minimal" | "normal" | "verbose"

export interface ToastOptions {
  message: string
  variant: ToastVariant
  title?: string
  /** 
   * If true, ignore quiet_mode setting. 
   * Useful for critical errors or successful auth.
   */
  force?: boolean
  /**
   * Optional abort signal to prevent showing toast if operation was cancelled.
   */
  signal?: AbortSignal
  /**
   * Minimum verbosity level required to show this toast.
   * - minimal: shown always (errors)
   * - normal: shown in normal and verbose (account switches)
   * - verbose: shown only in verbose (retries)
   */
  verbosity?: ToastVerbosity
  /**
   * Optional debounce period in milliseconds.
   */
  debounceMs?: number
  /**
   * Optional key for debouncing. Defaults to the message if not provided.
   */
  debounceKey?: string
}

let _client: PluginClient | null = null
let _quietMode = false
let _toastScope: "all" | "root_only" = "all"
let _toastVerbosity: ToastVerbosity = "normal"
let _isChildSession = false

/**
 * Internal map to track last shown timestamps per message/key for debouncing.
 */
const _toastCooldowns = new Map<string, number>()
const MAX_TOAST_COOLDOWN_ENTRIES = 100

/**
 * Cleanup old toast cooldown entries if it grows too large.
 */
function cleanupToastCooldowns(): void {
  if (_toastCooldowns.size > MAX_TOAST_COOLDOWN_ENTRIES) {
    // Basic cleanup: remove everything older than 1 minute
    const now = Date.now()
    for (const [key, time] of _toastCooldowns) {
      if (now - time > 60000) {
        _toastCooldowns.delete(key)
      }
    }
  }
}

/**
 * Initialize the toast service with the plugin client and config.
 */
export function initToastService(
  client: PluginClient, 
  config: { quiet_mode: boolean; toast_scope?: "all" | "root_only"; toast_verbosity?: ToastVerbosity },
  isChildSession: boolean = false
): void {
  _client = client
  _quietMode = config.quiet_mode
  _toastScope = config.toast_scope ?? "all"
  _toastVerbosity = config.toast_verbosity ?? "normal"
  _isChildSession = isChildSession
}

/**
 * Update the quiet mode setting.
 */
export function setQuietMode(quiet: boolean): void {
  _quietMode = quiet
}

/**
 * Update the toast verbosity setting.
 */
export function setToastVerbosity(verbosity: ToastVerbosity): void {
  _toastVerbosity = verbosity
}

/**
 * Update the child session status.
 */
export function setChildSession(isChild: boolean): void {
  _isChildSession = isChild
}

/**
 * Show a toast notification to the user.
 * 
 * @param options - Toast message and options
 */
export async function showToast(options: ToastOptions | string, variant: ToastVariant = "info"): Promise<void> {
  const opts: ToastOptions = typeof options === "string" ? { message: options, variant } : options
  
  // Log to debug always
  log.debug("show-toast", { ...opts, quietMode: _quietMode, toastScope: _toastScope, toastVerbosity: _toastVerbosity, isChildSession: _isChildSession })

  if (!_client) {
    return
  }

  // Handle verbosity
  if (!opts.force) {
    // If quiet_mode is true, effectively minimal
    const effectiveVerbosity = _quietMode ? "minimal" : _toastVerbosity
    
    // Assign default verbosity based on variant if not provided
    // - error, warning: minimal (always show unless forced/scope-filtered)
    // - info, success: normal (hidden in minimal)
    const toastVerbosity = opts.verbosity ?? (
      (opts.variant === "error" || opts.variant === "warning") ? "minimal" : "normal"
    )
    
    const verbosityMap: Record<ToastVerbosity, number> = {
      minimal: 0,
      normal: 1,
      verbose: 2
    }
    
    if (verbosityMap[toastVerbosity] > verbosityMap[effectiveVerbosity]) {
      log.debug("toast-suppressed-verbosity", { message: opts.message, toastVerbosity, effectiveVerbosity })
      return
    }
  }

  // Filter toasts for child sessions when toast_scope is "root_only"
  if (_toastScope === "root_only" && _isChildSession && !opts.force) {
    log.debug("toast-suppressed-child-session", { message: opts.message, variant: opts.variant })
    return
  }

  if (opts.signal?.aborted) {
    return
  }

  // Handle debouncing
  if (opts.debounceMs !== undefined) {
    cleanupToastCooldowns()
    const debounceKey = opts.debounceKey ?? opts.message
    const now = Date.now()
    const lastShown = _toastCooldowns.get(debounceKey) ?? 0

    if (now - lastShown < opts.debounceMs) {
      log.debug("toast-suppressed-debounce", { message: opts.message, debounceKey, debounceMs: opts.debounceMs })
      return
    }

    _toastCooldowns.set(debounceKey, now)
  }

  try {
    await _client.tui.showToast({
      body: {
        title: opts.title,
        message: opts.message,
        variant: opts.variant,
      },
    })
  } catch (error) {
    // Silently ignore TUI errors
    log.debug("toast-failed", { error: String(error) })
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
}
