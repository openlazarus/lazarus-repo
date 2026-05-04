import { z } from 'zod'
import { MAX_TURNS } from '@infrastructure/config/max-turns'

export const ChatRequestSchema = z.object({
  message: z.string(),
  workspaceId: z.string().optional(),
  agentId: z.string().optional(),
  mcpServers: z.array(z.string()).optional(),
  systemPrompt: z.string().optional(),
  maxTurns: z.number().default(MAX_TURNS.chat),
  temperature: z.number().min(0).max(1).optional(),
  streamResponse: z.boolean().default(true),
  requirePermissions: z.boolean().default(true),
  resumeSessionId: z.string().optional(),
})

export type ChatRequest = z.infer<typeof ChatRequestSchema>

export interface ChatEvent {
  type:
    | 'assistant'
    | 'user'
    | 'tool_use'
    | 'tool_result'
    | 'context'
    | 'error'
    | 'done'
    | 'thinking'
    | 'planning'
    | 'status'
    | 'progress'
    | 'unknown'
    | 'permission_request'
    | 'permission_resolved'
    | 'permission_timeout'
    | 'conversation_info'
    | 'ask_user_question'
    | 'ask_user_question_resolved'
    | 'billing_update'
  content?: string
  tool?: {
    name: string
    parameters: any
    result?: any
  }
  requestId?: string
  sessionId?: string
  toolName?: string
  parameters?: any
  riskLevel?: string
  riskDisplay?: string
  description?: string
  factors?: string[]
  message?: string
  allowed?: boolean
  toolUseId?: string
  approved?: boolean
  reason?: string
  metadata?: {
    partial?: boolean
    toolId?: string
    offset?: number
    totalLength?: number
    isPartial?: boolean
    usage?: any
    totalCost?: number
    code?: string
    raw?: boolean
    eventCount?: number
    workspaceId?: string
    agentId?: string
    path?: string
    [key: string]: any
  }
  timestamp: string
}
