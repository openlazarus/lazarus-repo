/**
 * ExecutionAbortRegistry - Maps executionId to AbortController
 *
 * Allows the stop endpoint to abort a running agent execution
 * by signalling the AbortController that the SDK is listening on.
 */

import type { IExecutionAbortRegistry } from './execution-abort-registry.interface'

class ExecutionAbortRegistry implements IExecutionAbortRegistry {
  private controllers = new Map<string, AbortController>()
  private reasons = new Map<string, string>()

  register(executionId: string, controller: AbortController): void {
    this.controllers.set(executionId, controller)
  }

  abort(executionId: string, reason?: string): boolean {
    const controller = this.controllers.get(executionId)
    if (!controller) return false
    const abortReason = reason || 'Cancelled by user'
    this.reasons.set(executionId, abortReason)
    controller.abort(new Error(abortReason))
    this.controllers.delete(executionId)
    return true
  }

  getReason(executionId: string): string | undefined {
    return this.reasons.get(executionId)
  }

  remove(executionId: string): void {
    this.controllers.delete(executionId)
    this.reasons.delete(executionId)
  }
}

export const executionAbortRegistry: IExecutionAbortRegistry = new ExecutionAbortRegistry()
