export interface TAgentSpanEvent {
  name: string
  timestamp: string
  attributes?: Record<string, unknown>
}

export interface TAgentSpanRow {
  span_id: string
  trace_id: string
  parent_span_id: string | null
  name: string
  started_at: string
  ended_at: string | null
  attributes: Record<string, unknown>
  events: TAgentSpanEvent[]
}

export interface TAgentSpanInsert {
  span_id: string
  trace_id: string
  parent_span_id?: string | null
  name: string
  started_at: string
  ended_at?: string | null
  attributes?: Record<string, unknown>
  events?: TAgentSpanEvent[]
}
