import type { PersistedTask } from '@domains/execution/repository/queue-persistence'
import type {
  ExecutionQueueStats,
  ExecutionSlotRequest,
  QueueResult,
} from '@domains/execution/types/execution.types'

export interface IExecutionQueue {
  /** Check if an agent is already running or queued. */
  isAgentActive(agentId: string): boolean

  /** Quick pre-check: can a new task be accepted right now? */
  canAccept(agentId: string): boolean

  /** Execute a function within a queue slot with guaranteed release. */
  withSlot<T>(request: ExecutionSlotRequest, fn: () => Promise<T>): Promise<QueueResult<T>>

  /** Recover persisted tasks from a previous crash. */
  recoverPersistedTasks(): Promise<PersistedTask[]>

  /** Get queue stats for health endpoint or debugging. */
  getStats(): ExecutionQueueStats
}
