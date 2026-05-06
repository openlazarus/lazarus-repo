export interface IExecutionAbortRegistry {
  /** Register an AbortController for an execution. */
  register(executionId: string, controller: AbortController): void

  /** Abort an execution by ID; returns true if found and aborted. */
  abort(executionId: string, reason?: string): boolean

  /** Get the abort reason for an execution. */
  getReason(executionId: string): string | undefined

  /** Remove an execution from the registry. */
  remove(executionId: string): void
}
