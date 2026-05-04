import { randomUUID } from 'crypto'
import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk'
import type { TOrUsage } from './types'

interface TEmitCtx {
  sessionId: string
  model: string
}

export function makeEmitCtx(model: string, sessionId?: string): TEmitCtx {
  return { sessionId: sessionId ?? randomUUID(), model }
}

export function sdkSystemInit(
  ctx: TEmitCtx,
  opts: {
    tools: string[]
    mcpServers: Array<{ name: string; status: string }>
    skills: string[]
    permissionMode?: string
    cwd?: string
  },
): SDKMessage {
  return {
    type: 'system',
    subtype: 'init',
    apiKeySource: 'other',
    claude_code_version: 'openrouter',
    cwd: opts.cwd ?? process.cwd(),
    tools: opts.tools,
    mcp_servers: opts.mcpServers,
    model: ctx.model,
    permissionMode: (opts.permissionMode ?? 'default') as never,
    slash_commands: [],
    output_style: 'default',
    skills: opts.skills,
    plugins: [],
    uuid: randomUUID() as never,
    session_id: ctx.sessionId,
  } as unknown as SDKMessage
}

export function sdkAssistantMessage(
  ctx: TEmitCtx,
  content: Array<
    { type: 'text'; text: string } | { type: 'tool_use'; id: string; name: string; input: unknown }
  >,
  usage: TOrUsage | null,
): SDKMessage {
  return {
    type: 'assistant',
    uuid: randomUUID() as never,
    session_id: ctx.sessionId,
    parent_tool_use_id: null,
    message: {
      id: randomUUID(),
      type: 'message',
      role: 'assistant',
      model: ctx.model,
      content,
      stop_reason: null,
      stop_sequence: null,
      usage: {
        input_tokens: usage?.prompt_tokens ?? 0,
        output_tokens: usage?.completion_tokens ?? 0,
        cache_read_input_tokens: usage?.prompt_tokens_details?.cached_tokens ?? 0,
        cache_creation_input_tokens: 0,
      },
    } as never,
  } as unknown as SDKMessage
}

export function sdkUserToolResults(
  ctx: TEmitCtx,
  results: Array<{ tool_use_id: string; content: string; is_error?: boolean }>,
): SDKMessage {
  return {
    type: 'user',
    uuid: randomUUID() as never,
    session_id: ctx.sessionId,
    parent_tool_use_id: null,
    message: {
      role: 'user',
      content: results.map((r) => ({
        type: 'tool_result',
        tool_use_id: r.tool_use_id,
        content: r.content,
        is_error: !!r.is_error,
      })),
    } as never,
  } as unknown as SDKMessage
}

export function sdkResult(
  ctx: TEmitCtx,
  opts: {
    subtype: 'success' | 'error_max_turns' | 'error_during_execution'
    durationMs: number
    durationApiMs: number
    numTurns: number
    usage: TOrUsage | null
    resultText?: string
    errors?: string[]
  },
): SDKMessage {
  const isSuccess = opts.subtype === 'success'
  const base = {
    type: 'result' as const,
    subtype: opts.subtype,
    duration_ms: opts.durationMs,
    duration_api_ms: opts.durationApiMs,
    is_error: !isSuccess,
    num_turns: opts.numTurns,
    stop_reason: null,
    total_cost_usd: opts.usage?.cost ?? 0,
    usage: {
      input_tokens: opts.usage?.prompt_tokens ?? 0,
      output_tokens: opts.usage?.completion_tokens ?? 0,
      cache_read_input_tokens: opts.usage?.prompt_tokens_details?.cached_tokens ?? 0,
      cache_creation_input_tokens: 0,
    },
    modelUsage: {},
    permission_denials: [],
    uuid: randomUUID(),
    session_id: ctx.sessionId,
  }
  if (isSuccess) {
    return { ...base, result: opts.resultText ?? '' } as unknown as SDKMessage
  }
  return { ...base, errors: opts.errors ?? [] } as unknown as SDKMessage
}
