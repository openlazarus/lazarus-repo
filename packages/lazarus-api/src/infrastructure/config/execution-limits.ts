/**
 * Execution Limits — Centralized configuration for agent execution concurrency.
 *
 * All values configurable via environment variables.
 */

export interface ExecutionLimitsConfig {
  readonly maxConcurrentExecutions: number
  readonly maxCascadeDepth: number
  readonly maxQueuedItems: number
  readonly askAgentModel: string
  readonly askAgentMaxTokens: number
  readonly mcpMaxOldSpaceMb: number
  readonly memoryCheckIntervalMs: number
  readonly memoryRejectThresholdMb: number
  readonly memoryWarnThresholdMb: number
}

function env(key: string, fallback: string): string {
  return process.env[key] || fallback
}

function envInt(key: string, fallback: number): number {
  return parseInt(process.env[key] || String(fallback), 10)
}

function loadConfig(): ExecutionLimitsConfig {
  return Object.freeze({
    maxConcurrentExecutions: envInt('MAX_CONCURRENT_EXECUTIONS', 8),
    maxCascadeDepth: envInt('MAX_CASCADE_DEPTH', 1),
    maxQueuedItems: envInt('MAX_QUEUED_ITEMS', 50),
    askAgentModel: env('ASK_AGENT_MODEL', 'claude-sonnet-4-20250514'),
    askAgentMaxTokens: envInt('ASK_AGENT_MAX_TOKENS', 4096),
    mcpMaxOldSpaceMb: envInt('MCP_MAX_OLD_SPACE_SIZE_MB', 256),
    memoryCheckIntervalMs: envInt('MEMORY_CHECK_INTERVAL_MS', 30_000),
    memoryRejectThresholdMb: envInt('MEMORY_REJECT_THRESHOLD_MB', 512),
    memoryWarnThresholdMb: envInt('MEMORY_WARN_THRESHOLD_MB', 1024),
  })
}

export const EXECUTION_LIMITS: ExecutionLimitsConfig = loadConfig()
