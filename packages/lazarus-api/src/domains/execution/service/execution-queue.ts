/**
 * Execution Queue — Global concurrency limiter for background agent executions.
 *
 * Only webhook and scheduled triggers go through this queue. Interactive channels
 * (chat, email, Discord, Slack, WhatsApp) and in-process calls (ask_agent,
 * delegate_task) bypass it entirely.
 *
 * Patterns used:
 * - Resource Acquisition (withSlot) — guarantees slot release even on error
 * - Per-agent deduplication — prevents duplicate concurrent runs
 * - FIFO queue — tasks wait in order
 * - Max queue size — returns 'queue_full' when limit reached (caller returns 503)
 * - Disk persistence — queued tasks survive crashes (via QueuePersistence)
 */

import { EXECUTION_LIMITS } from '@infrastructure/config/execution-limits'
import { queuePersistence, PersistedTask } from '@domains/execution/repository/queue-persistence'
import type {
  ExecutionQueueStats,
  ExecutionSlotRequest,
  QueueResult,
} from '@domains/execution/types/execution.types'
import type { IExecutionQueue } from './execution-queue.interface'
import { createLogger } from '@utils/logger'
const log = createLogger('execution-queue')

// ── Internal types ──────────────────────────────────────────────────

interface RunningSlot {
  agentId: string
  workspaceId: string
  startedAt: number
}

interface PendingEntry {
  request: ExecutionSlotRequest
  resolve: (release: () => void) => void
  enqueuedAt: number
}

// ── Queue implementation ────────────────────────────────────────────

class ExecutionQueue implements IExecutionQueue {
  private readonly running = new Map<string, RunningSlot>()
  private readonly pending: PendingEntry[] = []
  private totalProcessed = 0
  private totalSkippedDedup = 0
  private totalQueueFull = 0
  private totalRecovered = 0

  private get maxConcurrent(): number {
    return EXECUTION_LIMITS.maxConcurrentExecutions
  }

  private get maxQueued(): number {
    return EXECUTION_LIMITS.maxQueuedItems
  }

  /**
   * Check if an agent is already running or queued.
   */
  isAgentActive(agentId: string): boolean {
    for (const slot of this.running.values()) {
      if (slot.agentId === agentId) return true
    }
    return this.pending.some((p) => p.request.agentId === agentId)
  }

  /**
   * Quick pre-check: can a new task be accepted right now?
   * Returns false if the queue is at capacity (caller should return 503).
   */
  canAccept(agentId: string): boolean {
    if (this.isAgentActive(agentId)) return true // will be deduped, not rejected
    return this.running.size < this.maxConcurrent || this.pending.length < this.maxQueued
  }

  /**
   * Execute a function within a queue slot. Guarantees the slot is released
   * on both success and error. Returns a discriminated union so callers
   * can distinguish "skipped (dedup)", "queue_full", or "executed".
   */
  async withSlot<T>(request: ExecutionSlotRequest, fn: () => Promise<T>): Promise<QueueResult<T>> {
    // Dedup: skip if agent already running or queued
    if (this.isAgentActive(request.agentId)) {
      this.totalSkippedDedup++
      this.log(
        `Dedup skip for agent ${request.agentId} (already active). Skipped total: ${this.totalSkippedDedup}`,
      )
      await queuePersistence.remove(request.executionId).catch(() => {})
      return { status: 'skipped', reason: 'agent_already_active' }
    }

    // Queue full check: if no slots available and queue is at capacity
    if (this.running.size >= this.maxConcurrent && this.pending.length >= this.maxQueued) {
      this.totalQueueFull++
      this.log(
        `Queue full (${this.pending.length}/${this.maxQueued} queued, ${this.running.size}/${this.maxConcurrent} running). Rejecting agent ${request.agentId}`,
      )
      await queuePersistence.remove(request.executionId).catch(() => {})
      return { status: 'queue_full' }
    }

    const release = await this.acquire(request)
    await queuePersistence.updateState(request.executionId, 'running').catch(() => {})
    try {
      const value = await fn()
      return { status: 'executed', value }
    } finally {
      release()
      await queuePersistence.remove(request.executionId).catch(() => {})
    }
  }

  /**
   * Recover persisted tasks from a previous crash.
   * Returns the list of recovered tasks so the caller can re-trigger them.
   */
  async recoverPersistedTasks(): Promise<PersistedTask[]> {
    const tasks = await queuePersistence.recover()
    if (tasks.length === 0) return []

    this.totalRecovered = tasks.length
    this.log(`Recovered ${tasks.length} persisted tasks from previous run`)

    for (const task of tasks) {
      await queuePersistence.remove(task.executionId).catch(() => {})
    }

    return tasks
  }

  /**
   * Get queue stats for /health endpoint or debugging.
   */
  getStats(): ExecutionQueueStats {
    return {
      running: this.running.size,
      queued: this.pending.length,
      maxConcurrent: this.maxConcurrent,
      maxQueued: this.maxQueued,
      totalProcessed: this.totalProcessed,
      totalSkippedDedup: this.totalSkippedDedup,
      totalQueueFull: this.totalQueueFull,
      totalRecovered: this.totalRecovered,
      activeAgents: [...this.running.values()].map((s) => s.agentId),
    }
  }

  // ── Private ─────────────────────────────────────────────────────

  private async acquire(request: ExecutionSlotRequest): Promise<() => void> {
    const { executionId, agentId, workspaceId } = request

    if (this.running.size < this.maxConcurrent) {
      return this.occupy(executionId, agentId, workspaceId)
    }

    this.log(
      `Queueing agent ${agentId} (${this.running.size}/${this.maxConcurrent} running, ${this.pending.length} queued)`,
    )

    return new Promise<() => void>((resolve) => {
      this.pending.push({
        request,
        resolve: (releaseFn) => resolve(releaseFn),
        enqueuedAt: Date.now(),
      })
    })
  }

  private occupy(executionId: string, agentId: string, workspaceId: string): () => void {
    this.running.set(executionId, { agentId, workspaceId, startedAt: Date.now() })
    this.totalProcessed++
    this.log(
      `Slot acquired for agent ${agentId} (${this.running.size}/${this.maxConcurrent} running, ${this.pending.length} queued)`,
    )
    return () => this.release(executionId)
  }

  private release(executionId: string): void {
    const slot = this.running.get(executionId)
    this.running.delete(executionId)

    if (slot) {
      const seconds = Math.round((Date.now() - slot.startedAt) / 1000)
      this.log(
        `Slot released for agent ${slot.agentId} after ${seconds}s (${this.running.size}/${this.maxConcurrent} running, ${this.pending.length} queued)`,
      )
    }

    this.promoteNext()
  }

  private promoteNext(): void {
    if (this.pending.length === 0 || this.running.size >= this.maxConcurrent) return

    const next = this.pending.shift()!
    const { executionId, agentId, workspaceId } = next.request
    const releaseFn = this.occupy(executionId, agentId, workspaceId)
    next.resolve(releaseFn)
  }

  private log(message: string): void {
    log.info(`${message}`)
  }
}

/** Global singleton */
export const executionQueue: IExecutionQueue = new ExecutionQueue()
