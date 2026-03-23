/**
 * Configuration module for opencode-antigravity-auth plugin.
 * 
 * @example
 * ```typescript
 * import { loadConfig, type AntigravityConfig } from "./index.ts"
 * 
 * const config = loadConfig(directory)
 * if (config.session_recovery) {
 *   // Enable session recovery
 * }
 * ```
 */

export {
  AntigravityConfigSchema,
  SignatureCacheConfigSchema,
  DEFAULT_CONFIG,
  type AntigravityConfig,
  type SignatureCacheConfig,
} from "./schema.ts"

export {
  loadConfig,
  getUserConfigPath,
  getProjectConfigPath,
  getDefaultLogsDir,
  configExists,
  initRuntimeConfig,
  getKeepThinking,
  wasConfigCreated,
} from "./loader.ts"
