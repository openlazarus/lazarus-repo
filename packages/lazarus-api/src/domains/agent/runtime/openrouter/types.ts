export interface TOrChatRequest {
  model: string
  messages: TOrMessage[]
  tools?: TOrToolDef[]
  tool_choice?: 'auto' | 'none' | 'required'
  temperature?: number
  max_tokens?: number
  top_p?: number
  stop?: string[]
  stream?: boolean
  usage?: { include: true }
}

export type TOrMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string | TOrContentPart[] }
  | {
      role: 'assistant'
      content: string | null
      tool_calls?: TOrToolCall[]
    }
  | { role: 'tool'; tool_call_id: string; content: string }

export type TOrContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

export interface TOrToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

export interface TOrToolDef {
  type: 'function'
  function: {
    name: string
    description?: string
    parameters: Record<string, unknown>
  }
}

export interface TOrStreamChunk {
  id?: string
  choices?: Array<{
    delta?: {
      role?: string
      content?: string | null
      tool_calls?: Array<{
        index: number
        id?: string
        type?: 'function'
        function?: { name?: string; arguments?: string }
      }>
    }
    finish_reason?: string | null
    index?: number
  }>
  usage?: TOrUsage | null
}

export interface TOrUsage {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
  cost?: number
  prompt_tokens_details?: { cached_tokens?: number }
}

export interface TOrAssistantAggregate {
  id: string
  text: string
  toolCalls: Array<{ id: string; name: string; arguments: string }>
  finishReason: string | null
  usage: TOrUsage | null
}
