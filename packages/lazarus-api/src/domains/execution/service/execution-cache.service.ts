/**
 * ExecutionCacheService - Centralized in-memory cache for all agent executions
 *
 * Tracks all currently running agent executions across all types:
 * - Trigger-based executions
 * - Background specialist loops
 * - Manual/API executions
 * - Agent sessions
 *
 * Ensures WebSocket clients receive full state on reconnection.
 */

import { v4 as uuidv4 } from 'uuid'
import { agentStatusService } from '@domains/agent/service/agent-status.service'
import type {
  ExecutionMetadata,
  ExecutionState,
  ExecutionType,
  RegisterExecutionParams,
  UpdateExecutionParams,
} from '@domains/execution/types/execution.types'
import type { IExecutionCacheService } from './execution-cache.service.interface'
import { createLogger } from '@utils/logger'
const log = createLogger('execution-cache')

/**
 * Centralized execution cache service
 */
class ExecutionCacheService implements IExecutionCacheService {
  /** In-memory cache: executionId -> ExecutionState */
  private executions: Map<string, ExecutionState> = new Map()

  /** Cleanup interval (5 minutes) */
  private readonly CLEANUP_INTERVAL_MS = 5 * 60 * 1000

  /** How long to keep completed executions in memory (5 minutes) */
  private readonly COMPLETED_RETENTION_MS = 5 * 60 * 1000

  /** Cleanup timer reference */
  private cleanupTimer?: NodeJS.Timeout

  constructor() {
    // Start automatic cleanup of completed executions
    this.startCleanup()
  }

  /**
   * Register a new execution in the cache
   */
  register(params: RegisterExecutionParams): ExecutionState {
    const now = new Date()
    const executionId = params.id || uuidv4()

    const execution: ExecutionState = {
      id: executionId,
      type: params.type,
      agentId: params.agentId,
      userId: params.userId,
      workspaceId: params.workspaceId,
      teamId: params.teamId,
      status: params.status || 'running',
      startedAt: now,
      lastActivity: now,
      metadata: params.metadata || {},
    }

    this.executions.set(executionId, execution)

    // Broadcast to WebSocket clients via existing AgentStatusService
    this.broadcastExecutionRegistered(execution)

    return execution
  }

  /**
   * Update an existing execution
   */
  update(executionId: string, params: UpdateExecutionParams): ExecutionState | null {
    const execution = this.executions.get(executionId)
    if (!execution) {
      log.warn(`Attempted to update non-existent execution: ${executionId}`)
      return null
    }

    // Update status if provided
    if (params.status) {
      execution.status = params.status
    }

    // Merge metadata if provided
    if (params.metadata) {
      execution.metadata = {
        ...execution.metadata,
        ...params.metadata,
      }
    }

    // Update lastActivity timestamp
    execution.lastActivity = new Date()

    // Broadcast update
    this.broadcastExecutionUpdated(execution)

    return execution
  }

  /**
   * Mark an execution as completed
   */
  complete(
    executionId: string,
    result?: { error?: string; metadata?: Partial<ExecutionMetadata> },
  ): ExecutionState | null {
    const execution = this.executions.get(executionId)
    if (!execution) {
      log.warn(`Attempted to complete non-existent execution: ${executionId}`)
      return null
    }

    const now = new Date()
    execution.status = result?.error ? 'failed' : 'completed'
    execution.completedAt = now
    execution.duration = now.getTime() - execution.startedAt.getTime()
    execution.lastActivity = now

    // Update metadata if provided
    if (result?.metadata) {
      execution.metadata = {
        ...execution.metadata,
        ...result.metadata,
      }
    }

    // Store error if failed
    if (result?.error) {
      execution.metadata.error = result.error
    }

    // Broadcast completion
    this.broadcastExecutionCompleted(execution)

    return execution
  }

  /**
   * Cancel an execution
   */
  cancel(executionId: string, reason?: string): ExecutionState | null {
    const execution = this.executions.get(executionId)
    if (!execution) {
      log.warn(`Attempted to cancel non-existent execution: ${executionId}`)
      return null
    }

    const now = new Date()
    execution.status = 'cancelled'
    execution.completedAt = now
    execution.duration = now.getTime() - execution.startedAt.getTime()
    execution.lastActivity = now

    if (reason) {
      execution.metadata.error = reason
    }

    // Broadcast cancellation
    this.broadcastExecutionCompleted(execution)

    return execution
  }

  /**
   * Get a specific execution by ID
   */
  get(executionId: string): ExecutionState | undefined {
    return this.executions.get(executionId)
  }

  /**
   * Get all executions
   */
  getAll(): ExecutionState[] {
    return Array.from(this.executions.values())
  }

  /**
   * Get all running executions (not completed/failed/cancelled)
   */
  getRunning(): ExecutionState[] {
    return this.getAll().filter((exec) => exec.status === 'running' || exec.status === 'pending')
  }

  /**
   * Get executions by agent ID
   */
  getByAgent(agentId: string): ExecutionState[] {
    return this.getAll().filter((exec) => exec.agentId === agentId)
  }

  /**
   * Get executions by user ID
   */
  getByUser(userId: string): ExecutionState[] {
    return this.getAll().filter((exec) => exec.userId === userId)
  }

  /**
   * Get executions by workspace ID
   */
  getByWorkspace(workspaceId: string): ExecutionState[] {
    return this.getAll().filter((exec) => exec.workspaceId === workspaceId)
  }

  /**
   * Get executions by team ID
   */
  getByTeam(teamId: string): ExecutionState[] {
    return this.getAll().filter((exec) => exec.teamId === teamId)
  }

  /**
   * Get executions by type
   */
  getByType(type: ExecutionType): ExecutionState[] {
    return this.getAll().filter((exec) => exec.type === type)
  }

  /**
   * Check if an agent is currently executing
   */
  isAgentExecuting(agentId: string): boolean {
    return this.getByAgent(agentId).some(
      (exec) => exec.status === 'running' || exec.status === 'pending',
    )
  }

  /**
   * Remove an execution from cache (manual cleanup)
   */
  remove(executionId: string): boolean {
    return this.executions.delete(executionId)
  }

  /**
   * Clear all executions (for testing or reset)
   */
  clear(): void {
    this.executions.clear()
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    total: number
    running: number
    completed: number
    failed: number
    cancelled: number
    byType: Record<ExecutionType, number>
  } {
    const all = this.getAll()
    const stats = {
      total: all.length,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      byType: {
        trigger: 0,
        specialist: 0,
        manual: 0,
        session: 0,
      } as Record<ExecutionType, number>,
    }

    all.forEach((exec) => {
      // Count by status
      if (exec.status === 'running' || exec.status === 'pending') {
        stats.running++
      } else if (exec.status === 'completed') {
        stats.completed++
      } else if (exec.status === 'failed') {
        stats.failed++
      } else if (exec.status === 'cancelled') {
        stats.cancelled++
      }

      // Count by type
      stats.byType[exec.type]++
    })

    return stats
  }

  /**
   * Start automatic cleanup of completed executions
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupCompleted()
    }, this.CLEANUP_INTERVAL_MS)
  }

  /**
   * Stop automatic cleanup (for testing or shutdown)
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
    }
  }

  /**
   * Clean up completed executions older than retention period
   */
  private cleanupCompleted(): void {
    const now = Date.now()
    const cutoff = now - this.COMPLETED_RETENTION_MS

    let removed = 0

    for (const [id, execution] of this.executions.entries()) {
      // Only cleanup completed/failed/cancelled executions
      if (
        (execution.status === 'completed' ||
          execution.status === 'failed' ||
          execution.status === 'cancelled') &&
        execution.completedAt &&
        execution.completedAt.getTime() < cutoff
      ) {
        this.executions.delete(id)
        removed++
      }
    }

    if (removed > 0) {
      log.info(`Cleaned up ${removed} completed execution(s)`)
    }
  }

  /**
   * Broadcast execution registered to WebSocket clients
   */
  private broadcastExecutionRegistered(execution: ExecutionState): void {
    // Use existing AgentStatusService for backward compatibility
    agentStatusService.broadcastAgentStarted(execution.agentId, {
      taskId: execution.id,
      title: execution.metadata.title || `${execution.type} execution`,
      description: execution.metadata.description,
      workspace: execution.workspaceId,
      trigger: execution.metadata.triggerId,
      emailId: execution.metadata.emailId,
      startedAt: execution.startedAt.toISOString(),
    })
  }

  /**
   * Broadcast execution updated to WebSocket clients
   */
  private broadcastExecutionUpdated(execution: ExecutionState): void {
    agentStatusService.broadcastAgentProgress(execution.agentId, {
      taskId: execution.id,
      title: execution.metadata.title || `${execution.type} execution`,
      description: execution.metadata.description,
      workspace: execution.workspaceId,
      trigger: execution.metadata.triggerId,
      emailId: execution.metadata.emailId,
      progress: execution.metadata.progress,
    })
  }

  /**
   * Broadcast execution completed to WebSocket clients
   */
  private broadcastExecutionCompleted(execution: ExecutionState): void {
    if (execution.status === 'failed') {
      agentStatusService.broadcastAgentError(
        execution.agentId,
        execution.metadata.error || 'Execution failed',
      )
    } else {
      agentStatusService.broadcastAgentStopped(execution.agentId)
    }
  }
}

// Singleton instance
export const executionCacheService: IExecutionCacheService = new ExecutionCacheService()
