import type {
  ExecutionMetadata,
  ExecutionState,
  ExecutionType,
  RegisterExecutionParams,
  UpdateExecutionParams,
} from '@domains/execution/types/execution.types'

export interface IExecutionCacheService {
  /** Register a new execution in the cache. */
  register(params: RegisterExecutionParams): ExecutionState

  /** Update an existing execution. */
  update(executionId: string, params: UpdateExecutionParams): ExecutionState | null

  /** Mark an execution as completed. */
  complete(
    executionId: string,
    result?: { error?: string; metadata?: Partial<ExecutionMetadata> },
  ): ExecutionState | null

  /** Cancel an execution. */
  cancel(executionId: string, reason?: string): ExecutionState | null

  /** Get a specific execution by ID. */
  get(executionId: string): ExecutionState | undefined

  /** Get all executions. */
  getAll(): ExecutionState[]

  /** Get all running executions. */
  getRunning(): ExecutionState[]

  /** Get executions by agent ID. */
  getByAgent(agentId: string): ExecutionState[]

  /** Get executions by user ID. */
  getByUser(userId: string): ExecutionState[]

  /** Get executions by workspace ID. */
  getByWorkspace(workspaceId: string): ExecutionState[]

  /** Get executions by team ID. */
  getByTeam(teamId: string): ExecutionState[]

  /** Get executions by type. */
  getByType(type: ExecutionType): ExecutionState[]

  /** Check if an agent is currently executing. */
  isAgentExecuting(agentId: string): boolean

  /** Remove an execution from cache. */
  remove(executionId: string): boolean

  /** Clear all executions. */
  clear(): void

  /** Get cache statistics. */
  getStats(): {
    total: number
    running: number
    completed: number
    failed: number
    cancelled: number
    byType: Record<ExecutionType, number>
  }

  /** Stop automatic cleanup. */
  stopCleanup(): void
}
