/**
 * Background Process Configuration
 *
 * Configuration constants for the unified background process system
 * Can be overridden via environment variables
 */

import { createLogger } from '@utils/logger'

const log = createLogger('background-config')

/**
 * Parse environment variable as number with fallback
 */
function parseEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key]
  if (!value) return defaultValue
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? defaultValue : parsed
}

/**
 * Parse environment variable as boolean with fallback
 */
function parseEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key]
  if (!value) return defaultValue
  return value.toLowerCase() === 'true' || value === '1'
}

/**
 * Background process configuration
 */
export const BACKGROUND_CONFIG = {
  // ============================================
  // Trigger Configuration
  // ============================================

  /**
   * Whether to reload triggers on error
   * Default: true
   * Env: TRIGGER_RELOAD_ON_ERROR
   */
  TRIGGER_RELOAD_ON_ERROR: parseEnvBoolean('TRIGGER_RELOAD_ON_ERROR', true),

  // ============================================
  // Email Trigger Polling (Backup to Webhook)
  // ============================================

  /**
   * Whether to enable email trigger polling (backup to webhook)
   * Default: true
   * Env: EMAIL_TRIGGER_POLLING_ENABLED
   */
  EMAIL_TRIGGER_POLLING_ENABLED: parseEnvBoolean('EMAIL_TRIGGER_POLLING_ENABLED', true),

  /**
   * How often to poll for email triggers (in milliseconds)
   * Default: 5 minutes
   * Env: EMAIL_TRIGGER_POLLING_INTERVAL_MS
   */
  EMAIL_TRIGGER_POLLING_INTERVAL_MS: parseEnvNumber(
    'EMAIL_TRIGGER_POLLING_INTERVAL_MS',
    5 * 60 * 1000,
  ),

  // ============================================
  // Cleanup Configuration
  // ============================================

  /**
   * How often to run cleanup tasks (in milliseconds)
   * Default: 15 minutes
   * Env: CLEANUP_INTERVAL_MS
   */
  CLEANUP_INTERVAL_MS: parseEnvNumber('CLEANUP_INTERVAL_MS', 15 * 60 * 1000),

  /**
   * How long to retain completed executions before cleanup (in milliseconds)
   * Default: 5 minutes
   * Env: COMPLETED_EXECUTION_RETENTION_MS
   */
  COMPLETED_EXECUTION_RETENTION_MS: parseEnvNumber(
    'COMPLETED_EXECUTION_RETENTION_MS',
    5 * 60 * 1000,
  ),

  // ============================================
  // Health Monitoring Configuration
  // ============================================

  /**
   * How often to perform health checks (in milliseconds)
   * Default: 1 minute
   * Env: HEALTH_CHECK_INTERVAL_MS
   */
  HEALTH_CHECK_INTERVAL_MS: parseEnvNumber('HEALTH_CHECK_INTERVAL_MS', 60 * 1000),

  /**
   * Warn if task hasn't completed in this time (in milliseconds)
   * Default: 5 minutes
   * Env: TASK_TIMEOUT_WARNING_MS
   */
  TASK_TIMEOUT_WARNING_MS: parseEnvNumber('TASK_TIMEOUT_WARNING_MS', 5 * 60 * 1000),

  /**
   * Maximum number of consecutive failures before marking workspace as failed
   * Default: 3
   * Env: MAX_CONSECUTIVE_FAILURES
   */
  MAX_CONSECUTIVE_FAILURES: parseEnvNumber('MAX_CONSECUTIVE_FAILURES', 3),

  // ============================================
  // Graceful Shutdown Configuration
  // ============================================

  /**
   * How long to wait for tasks to complete during shutdown (in milliseconds)
   * Default: 10 seconds
   * Env: SHUTDOWN_TIMEOUT_MS
   */
  SHUTDOWN_TIMEOUT_MS: parseEnvNumber('SHUTDOWN_TIMEOUT_MS', 10 * 1000),

  // ============================================
  // Feature Flags
  // ============================================

  /**
   * Enable/disable entire background process system
   * Default: true
   * Env: ENABLE_BACKGROUND_PROCESSES
   */
  ENABLE_BACKGROUND_PROCESSES: parseEnvBoolean('ENABLE_BACKGROUND_PROCESSES', true),

  /**
   * Enable/disable trigger initialization
   * Default: true
   * Env: ENABLE_TRIGGER_INITIALIZATION
   */
  ENABLE_TRIGGER_INITIALIZATION: parseEnvBoolean('ENABLE_TRIGGER_INITIALIZATION', true),
}

/**
 * Log configuration on startup
 */
export function logConfig(): void {
  log.info(
    {
      backgroundProcesses: BACKGROUND_CONFIG.ENABLE_BACKGROUND_PROCESSES,
      triggerInitialization: BACKGROUND_CONFIG.ENABLE_TRIGGER_INITIALIZATION,
      emailTriggerPolling: BACKGROUND_CONFIG.EMAIL_TRIGGER_POLLING_ENABLED,
    },
    'Configuration loaded',
  )
}
