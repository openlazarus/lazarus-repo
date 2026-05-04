import type { Options, SDKMessage, SDKUserMessage } from '@anthropic-ai/claude-agent-sdk'

export type TAgentRuntimeKind = 'claude-sdk' | 'openrouter'

export interface TAgentRunContext {
  workspaceId: string
  agentId: string
  sessionId?: string | null
  executionId?: string | null
  runtime?: TAgentRuntimeKind
  title?: string | null
  triggeredBy?: string | null
  platformSource?: string | null
  userPrompt?: string | null
}

export interface TAgentRunRequest {
  prompt: string | AsyncIterable<SDKUserMessage>
  options: Options
  context?: TAgentRunContext
}

export type TAgentRuntimeMessage = SDKMessage
