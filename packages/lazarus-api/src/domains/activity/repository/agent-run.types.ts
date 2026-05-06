import type { TAgentSpanEvent } from './agent-span.types'

export type TAgentRunStatus = 'executing' | 'completed' | 'failed' | 'cancelled'

export interface TAgentRunRow {
  trace_id: string
  workspace_id: string
  agent_id: string
  session_id: string | null
  runtime: string
  status: TAgentRunStatus
  started_at: string
  ended_at: string | null
  model: string | null
  input_tokens: number
  output_tokens: number
  cost_usd: number
  title: string | null
  triggered_by: string | null
  platform_source: string | null
  attributes: Record<string, unknown>
  events: TAgentSpanEvent[]
}

export interface TAgentRunInsert {
  trace_id: string
  workspace_id: string
  agent_id: string
  session_id?: string | null
  runtime: string
  status: TAgentRunStatus
  started_at: string
  ended_at?: string | null
  model?: string | null
  input_tokens?: number
  output_tokens?: number
  cost_usd?: number
  title?: string | null
  triggered_by?: string | null
  platform_source?: string | null
  attributes?: Record<string, unknown>
  events?: TAgentSpanEvent[]
}

export interface TAgentRunUpdate {
  status?: TAgentRunStatus
  ended_at?: string | null
  input_tokens?: number
  output_tokens?: number
  cost_usd?: number
  title?: string | null
  attributes?: Record<string, unknown>
  events?: TAgentSpanEvent[]
}

export interface TAgentRunListOptions {
  workspaceId: string
  limit?: number
  before?: string
  status?: TAgentRunStatus
}
