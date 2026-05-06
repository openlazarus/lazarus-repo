/**
 * ExecutionCache - Centralized in-memory cache for all agent executions
 *
 * Migrated from src/services/execution/execution-cache.service.ts
 * Now integrated with the unified realtime EventBus architecture
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
import { createLogger } from '@utils/logger'
import {
  ExecutionState,
  ExecutionType,
  ExecutionMetadata,
  RegisterExecutionParams,
  UpdateExecutionParams,
  ExecutionTracker,
} from '@realtime/types'
import { eventBus } from '@realtime/events/event-bus'
import { getActivityService } from '@domains/activity/service/activity.service'
import { workspaceRepository } from '@domains/workspace/repository/workspace.repository'

const log = createLogger('execution-cache')

/**
 * ExecutionCache class
 */
export class ExecutionCache {
  /** In-memory cache: executionId -> ExecutionState */
  private executions: Map<string, ExecutionState> = new Map()

  /** Cleanup interval (5 minutes) */
  private readonly CLEANUP_INTERVAL_MS = 5 * 60 * 1000

  /** How long to keep completed executions in memory (5 minutes) */
  private readonly COMPLETED_RETENTION_MS = 5 * 60 * 1000

  /** Max time a running execution can be idle before being force-failed (30 minutes) */
  private readonly STALE_RUNNING_TIMEOUT_MS = 30 * 60 * 1000

  /** Cleanup timer reference */
  private cleanupTimer?: NodeJS.Timeout

  constructor() {
    // Start automatic cleanup of completed executions
    this.startCleanup()
    // Recover stale "executing" activity logs from disk (fire-and-forget)
    this.recoverStaleActivityLogs().catch((err) =>
      log.error({ err }, 'Failed to recover stale activity logs'),
    )
    log.info('Initialized')
  }

  /**
   * Register a new execution in the cache
   * Returns an ExecutionTracker for fluent API usage
   */
  register(params: RegisterExecutionParams): ExecutionTracker {
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

    // Emit event to EventBus (broadcasters will listen and send WebSocket messages)
    eventBus.emit('execution:registered', { execution })

    log.info(
      { executionId, type: execution.type, agentId: execution.agentId },
      'Registered execution',
    )

    // Return fluent API tracker
    return this.createTracker(executionId)
  }

  /**
   * Update an existing execution
   */
  update(executionId: string, params: UpdateExecutionParams): ExecutionState | null {
    const execution = this.executions.get(executionId)
    if (!execution) {
      log.warn({ executionId }, 'Attempted to update non-existent execution')
      return null
    }

    const previousStatus = execution.status

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

    // Emit update event
    eventBus.emit('execution:updated', {
      executionId,
      execution,
      changes: {
        status: params.status,
        metadata: params.metadata,
      },
    })

    // Emit state-changed event if status changed
    if (params.status && params.status !== previousStatus) {
      eventBus.emit('execution:state-changed', {
        executionId,
        previousStatus,
        newStatus: params.status,
        execution,
      })
    }

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
      log.warn({ executionId }, 'Attempted to complete non-existent execution')
      return null
    }

    const now = new Date()
    const previousStatus = execution.status
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

    // Emit appropriate event
    if (result?.error) {
      eventBus.emit('execution:failed', {
        executionId,
        execution,
        error: result.error,
      })
    } else {
      eventBus.emit('execution:completed', {
        executionId,
        execution,
        duration: execution.duration,
        success: true,
      })
    }

    // Emit state-changed event
    eventBus.emit('execution:state-changed', {
      executionId,
      previousStatus,
      newStatus: execution.status,
      execution,
    })

    log.info(
      {
        executionId,
        status: execution.status,
        durationMs: execution.duration,
      },
      'Execution completed',
    )

    return execution
  }

  /**
   * Cancel an execution
   */
  cancel(executionId: string, reason?: string): ExecutionState | null {
    const execution = this.executions.get(executionId)
    if (!execution) {
      log.warn({ executionId }, 'Attempted to cancel non-existent execution')
      return null
    }

    const now = new Date()
    const previousStatus = execution.status
    execution.status = 'cancelled'
    execution.completedAt = now
    execution.duration = now.getTime() - execution.startedAt.getTime()
    execution.lastActivity = now

    if (reason) {
      execution.metadata.error = reason
    }

    // Emit cancelled event
    eventBus.emit('execution:cancelled', {
      executionId,
      execution,
      reason,
    })

    // Emit state-changed event
    eventBus.emit('execution:state-changed', {
      executionId,
      previousStatus,
      newStatus: 'cancelled',
      execution,
    })

    log.info({ executionId, reason: reason ?? null }, 'Execution cancelled')

    return execution
  }

  /**
   * Get a specific execution by ID
   */
  get(executionId: string): ExecutionState | undefined {
    return this.executions.get(executionId)
  }

  /**
   * Get a tracker handle for an existing execution (without re-registering)
   */
  getTracker(executionId: string): ExecutionTracker {
    return this.createTracker(executionId)
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
    log.info('Cleared all executions')
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
   * Create a fluent API tracker for an execution
   */
  private createTracker(executionId: string): ExecutionTracker {
    return {
      getState: () => {
        const state = this.get(executionId)
        if (!state) {
          throw new Error(`Execution ${executionId} not found`)
        }
        return state
      },

      progress: (percent: number, description?: string) => {
        this.update(executionId, {
          metadata: {
            progress: Math.min(100, Math.max(0, percent)),
            ...(description ? { description } : {}),
          },
        })
        return this.createTracker(executionId)
      },

      update: (metadata: Partial<ExecutionMetadata>) => {
        this.update(executionId, { metadata })
        return this.createTracker(executionId)
      },

      complete: (metadata?: Partial<ExecutionMetadata>) => {
        this.complete(executionId, { metadata })
        return this.createTracker(executionId)
      },

      fail: (error: string, metadata?: Partial<ExecutionMetadata>) => {
        this.complete(executionId, { error, metadata })
        return this.createTracker(executionId)
      },

      cancel: (reason?: string) => {
        this.cancel(executionId, reason)
        return this.createTracker(executionId)
      },
    }
  }

  /**
   * Recover stale "executing" activity logs on startup.
   * These are logs that got stuck because the process restarted or the execution died
   * without a clean completion. Marks anything older than 30 minutes as failed.
   */
  private async recoverStaleActivityLogs(): Promise<void> {
    const activityService = getActivityService()

    // Get all active workspaces
    const workspaceIds = await workspaceRepository.getActiveWorkspaceIds()

    if (workspaceIds.length === 0) {
      log.info('No active workspaces found for stale log recovery')
      return
    }

    const workspaces = workspaceIds.map((id) => ({ id }))

    let totalRecovered = 0

    for (const workspace of workspaces) {
      try {
        const executingLogs = await activityService.getExecutingLogs(workspace.id)
        if (executingLogs.length === 0) continue

        for (const activityLog of executingLogs) {
          const logAge = Date.now() - new Date(activityLog.timestamp).getTime()
          if (logAge > this.STALE_RUNNING_TIMEOUT_MS) {
            await activityService.updateActivityLog(workspace.id, activityLog.id, {
              status: 'failed',
              metadata: {
                ...activityLog.metadata,
                error: 'Execution interrupted (process restart or unrecoverable hang)',
              },
            })
            totalRecovered++
            log.info(
              {
                activityLogId: activityLog.id,
                workspaceId: workspace.id,
                ageMinutes: Math.round(logAge / 60000),
              },
              'Recovered stale activity log',
            )
          }
        }
      } catch (err) {
        log.error({ err, workspaceId: workspace.id }, 'Error recovering stale logs for workspace')
      }
    }

    if (totalRecovered > 0) {
      log.info({ totalRecovered }, 'Recovered stale activity logs on startup')
    } else {
      log.info('No stale activity logs found on startup')
    }
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
   * and force-fail stale running executions
   */
  private cleanupCompleted(): void {
    const now = Date.now()
    const completedCutoff = now - this.COMPLETED_RETENTION_MS
    const staleCutoff = now - this.STALE_RUNNING_TIMEOUT_MS

    let removed = 0
    let forceFailed = 0

    for (const [id, execution] of this.executions.entries()) {
      // Cleanup completed/failed/cancelled executions older than retention period
      if (
        (execution.status === 'completed' ||
          execution.status === 'failed' ||
          execution.status === 'cancelled') &&
        execution.completedAt &&
        execution.completedAt.getTime() < completedCutoff
      ) {
        this.executions.delete(id)
        removed++
        continue
      }

      // Force-fail running/pending executions with no activity for STALE_RUNNING_TIMEOUT_MS
      // Note: awaiting_approval status is intentionally excluded — those wait for user approval
      if (
        (execution.status === 'running' || execution.status === 'pending') &&
        execution.lastActivity.getTime() < staleCutoff
      ) {
        const staleDurationMin = Math.round((now - execution.lastActivity.getTime()) / 60000)
        log.warn(
          {
            executionId: id,
            agentId: execution.agentId,
            staleDurationMinutes: staleDurationMin,
            startedAt: execution.startedAt.toISOString(),
          },
          'Force-failing stale execution',
        )

        execution.status = 'failed'
        execution.completedAt = new Date()
        execution.duration = now - execution.startedAt.getTime()
        execution.metadata.error = `Execution timed out: no activity for ${staleDurationMin} minutes`

        // Emit events so WebSocket clients are notified
        eventBus.emit('execution:failed', {
          executionId: id,
          execution,
          error: execution.metadata.error,
        })
        eventBus.emit('execution:state-changed', {
          executionId: id,
          previousStatus: 'running',
          newStatus: 'failed',
          execution,
        })

        // Also update the on-disk activity log if one exists
        if (execution.metadata.logId && execution.workspaceId) {
          try {
            const activityService = getActivityService()
            activityService
              .updateExecutionStatus(
                execution.workspaceId,
                execution.metadata.logId as string,
                'failed',
              )
              .catch((err) =>
                log.error(
                  { err, logId: execution.metadata.logId },
                  'Failed to update disk activity log',
                ),
              )
          } catch (err) {
            log.error({ err }, 'Failed to get activity service for disk update')
          }
        }

        forceFailed++
      }
    }

    if (removed > 0 || forceFailed > 0) {
      log.info(
        {
          removedCompleted: removed,
          forceFailedStale: forceFailed,
          totalInCache: this.executions.size,
        },
        'Cleanup',
      )
    }
  }

  /**
   * Shutdown the execution cache
   */
  shutdown(): void {
    log.info('Shutting down')
    this.stopCleanup()
    log.info('Shutdown complete')
  }
}

// Export singleton instance
export const executionCache = new ExecutionCache()
