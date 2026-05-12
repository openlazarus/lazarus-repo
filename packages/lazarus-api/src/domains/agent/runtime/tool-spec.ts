/**
 * Neutral in-process tool specification — provider-agnostic shape.
 *
 * Today most in-process tools are authored with `@anthropic-ai/claude-agent-sdk`'s
 * `createSdkMcpServer` + `tool()` helpers (see `src/tools/mcp-tool-server-factory.ts`).
 * When OpenAI is added, tools must be authored as `TToolSpec` so each runtime can
 * adapt them to its native form:
 *   - ClaudeAgentSdkRuntime → wraps as `createSdkMcpServer({ tools: [...] })`
 *   - OpenAiRuntime         → emits as `{ type: 'function', function: {...} }` for chat.completions
 *
 * Migration path (not done in this commit):
 *   1. Convert each tool factory to return `TToolSpec[]`.
 *   2. Each runtime adapter consumes those specs.
 *   3. The Claude runtime keeps its current behaviour 1:1 via the adapter.
 */

import type { ZodTypeAny, z } from 'zod'

export type TToolContext = {
  workspaceId: string
  agentId: string
  userId: string
  workspacePath: string
  executionId: string
}

export type TToolSpec<Schema extends ZodTypeAny = ZodTypeAny, Output = unknown> = {
  /** Tool name as exposed to the model. */
  name: string
  /** Human-readable description shown to the model. */
  description: string
  /** Zod schema for tool input — used for validation AND for JSON Schema generation per runtime. */
  inputSchema: Schema
  /** Handler invoked when the model calls this tool. */
  handler: (input: z.infer<Schema>, ctx: TToolContext) => Promise<Output>
}
