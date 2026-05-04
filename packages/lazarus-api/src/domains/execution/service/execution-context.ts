/**
 * Execution Context — AsyncLocalStorage-based context for concurrent agent executions.
 *
 * Problem: Multiple agent executions run concurrently in the same Node.js process.
 *          They all mutated `process.env` to pass AGENT_ID, WORKSPACE_ID, etc.
 *          to in-process MCP tool servers. When two executions overlapped, the second
 *          overwrote the first's env vars, causing silent failures or cross-contamination.
 *
 * Solution: Each execution runs inside an AsyncLocalStorage context. Tool servers call
 *           `getExecutionContext()` which reads from the current async context first,
 *           falling back to `process.env` for backwards compatibility (chat routes, etc.).
 */

import { AsyncLocalStorage } from 'async_hooks'

import type { ExecutionContextData } from '@domains/execution/types/execution.types'

const asyncLocalStorage = new AsyncLocalStorage<ExecutionContextData>()

/**
 * Run a function within an execution context.
 * All async code inside `fn` (including tool server handlers) will see this context.
 */
export function runInExecutionContext<T>(ctx: ExecutionContextData, fn: () => T): T {
  return asyncLocalStorage.run(ctx, fn)
}

/**
 * Get the current execution context.
 * Returns AsyncLocalStorage context if available, otherwise falls back to process.env.
 * This makes adoption incremental — existing code that still sets process.env will work.
 */
export function getExecutionContext(): ExecutionContextData {
  const store = asyncLocalStorage.getStore()
  if (store) {
    return store
  }

  // Fallback to process.env for backwards compatibility (e.g., chat routes, standalone
  // MCP subprocesses spawned by the agent executor). Prefer LAZARUS_* names — those are
  // what workspace-agent-executor injects into subprocess env — then fall back to the
  // unprefixed names used by older chat code paths.
  return {
    agentId: process.env.LAZARUS_AGENT_ID || process.env.AGENT_ID || '',
    workspaceId: process.env.LAZARUS_WORKSPACE_ID || process.env.WORKSPACE_ID || '',
    userId: process.env.LAZARUS_USER_ID || process.env.USER_ID || '',
    workspacePath: process.env.LAZARUS_WORKSPACE_PATH || process.env.WORKSPACE_PATH || '',
    browserExecutionTs: process.env.BROWSER_EXECUTION_TS,
  }
}
