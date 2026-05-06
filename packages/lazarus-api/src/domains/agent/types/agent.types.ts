import type { GuardrailConfig } from '@guardrails/guardrail-tool-mapping'
import type { MCPServerConfig } from '@shared/types/index'
import type { PlatformSource, TriggerType } from '@domains/activity/types/activity.types'
import type { TAgentRuntimeKind } from '@domains/agent/runtime/agent-runtime.types'

/**
 * Index file entry for quick agent listing
 */
export interface AgentIndexEntry {
  id: string
  name: string
  isSystemAgent: boolean
  enabled: boolean
  path: string
  created: string
  updated: string
}

/**
 * Index file structure
 */
export interface AgentIndex {
  version: string
  agents: AgentIndexEntry[]
}

/**
 * Custom tool definition in workspace agent config
 */
export interface CustomTool {
  name: string
  description: string
  inputSchema: Record<string, any>
  handler?: string
}

/**
 * Trigger entry embedded in config.agent.json (file-based triggers snippet)
 */
export interface AgentTriggerConfig {
  id: string
  name?: string
  type: 'scheduled' | 'webhook' | 'email' | 'file_change' | 'whatsapp'
  enabled: boolean
  config: Record<string, any>
  task?: string
}

/**
 * File-based Agent Configuration stored in workspace
 * Each agent is a folder with config.agent.json + personal files
 */
export interface WorkspaceAgentConfig {
  id: string
  name: string
  description: string
  systemPrompt: string
  allowedTools: string[]
  guardrails?: GuardrailConfig[]
  customTools?: CustomTool[]
  enabled: boolean
  runtime?: TAgentRuntimeKind

  modelConfig: {
    model: string
    temperature?: number
    maxTokens?: number
    topP?: number
    stopSequences?: string[]
  }

  mcpServers?: Record<string, MCPServerConfig>
  activeMCPs?: string[]

  personalFiles?: {
    scriptsDir?: string
    promptsDir?: string
    dataDir?: string
  }

  triggers?: AgentTriggerConfig[]

  whatsapp?: {
    enabled: boolean
    autoTriggerOnMessage?: boolean
    restrictToContacts?: boolean
  }

  email?: {
    address: string
    webhookId?: string
    enabled: boolean
    restrictToWorkspaceMembers?: boolean
    allowedExternalEmails?: string[]
  }

  permissionChannel?: {
    enabled: boolean
    platform: 'whatsapp' | 'discord' | 'email' | 'slack'
    phoneNumberId?: string
    targetPhone?: string
    channelId?: string
    targetUserId?: string
    slackChannelId?: string
    slackUserId?: string
    targetEmail?: string
    timeoutMinutes?: number
  }

  metadata: {
    created: string
    updated: string
    author: string
    tags: string[]
    isSystemAgent: boolean
    version?: string
    workspaceId?: string
    userId?: string
  }
}

export type AgentStatus = 'idle' | 'executing' | 'paused' | 'awaiting_approval' | 'error'

export interface AgentStatusMessage {
  type:
    | 'agent:status'
    | 'agent:started'
    | 'agent:stopped'
    | 'agent:progress'
    | 'agent:error'
    | 'connection:established'
  agentId?: string
  status?: AgentStatus
  metadata?: {
    taskId?: string
    title?: string
    description?: string
    workspace?: string
    file?: string
    trigger?: string
    progress?: number
    error?: string
    emailId?: string
    startedAt?: string
  }
  timestamp: string
}

/**
 * Agent metadata for lookup results
 */
export interface AgentMetadata {
  id: string
  name: string
  enabled: boolean
  isSystemAgent: boolean
  email?: {
    address: string
    enabled: boolean
  }
  autoTriggerEmail?: boolean
  workspaceId: string
  userId: string
}

export interface ActivityLoggerParams {
  agentId: string
  agentName: string
  workspaceId?: string
  workflowId?: string
  metadata?: Record<string, any>
  triggeredBy?: TriggerType
  triggerDetails?: any
  originalPrompt?: string
  conversationId?: string
  existingLogId?: string
  platformSource?: PlatformSource
}

/**
 * Context injected into global WhatsApp onboarding tools (from webhook; not user-controlled).
 */
export interface GlobalAgentToolContext {
  authenticatedPhone: string
  profileName?: string
  phoneNumberId: string
  receivedMedia?: {
    buffer: Buffer
    type: string
    mimeType: string
    filename?: string
    caption?: string
    wamid: string
  }
}

/**
 * Result from a platform-specific trigger prompt builder for the trigger manager.
 */
export interface PromptBuildResult {
  prompt: string
  platformSource?: 'email' | 'discord' | 'slack' | 'chat' | 'whatsapp'
  conversationTitle?: string
  executionTitle?: string
  executionDescription?: string
  platformMetadata?: Record<string, any>
  trackerMetadata?: Record<string, any>
  /** Raw inbound user message (subject/body/text/etc.) for activity title. */
  userMessage?: string
}
