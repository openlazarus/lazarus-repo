/**
 * Background Process System Types
 *
 * Shared interfaces and types for the unified background process system
 */

/**
 * Health status for background processes
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy'

/**
 * Background process health information
 */
export interface BackgroundProcessHealth {
  status: HealthStatus
  activeWorkspaces: number
  activeTasks: number
  lastHealthCheck: string
  issues: string[]
}

/**
 * Background process statistics
 */
export interface BackgroundProcessStats {
  workspaces: {
    total: number
    active: number
    failed: number
  }
  triggers: {
    scheduled: number
    email: number
    total: number
  }
  uptime: number
}

/**
 * Workspace state tracking
 */
export interface WorkspaceState {
  workspaceId: string
  agentIds: string[]
  loadedAt: string
  status: 'active' | 'failed' | 'unloaded'
  errorCount: number
  lastError?: string
}

/**
 * Task information
 */
export interface TaskInfo {
  id: string
  type: 'interval' | 'timeout'
  workspaceId: string
  description: string
  createdAt: string
}

/**
 * Trigger initialization result
 */
export interface TriggerInitResult {
  agentId: string
  scheduledTriggers: number
  emailTriggers: number
  error?: string
}
