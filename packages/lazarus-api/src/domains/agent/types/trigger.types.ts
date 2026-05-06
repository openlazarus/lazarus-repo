/**
 * Agent Triggering System Types
 * Handles scheduled and external triggers for agent execution
 */

export interface AgentTrigger {
  id: string
  agentId: string
  workspaceId: string
  userId: string
  type: 'scheduled' | 'external' | 'email' | 'webhook' | 'file_change' | 'whatsapp'
  enabled: boolean
  name: string
  description?: string

  // Trigger configuration
  config:
    | ScheduledTriggerConfig
    | ExternalTriggerConfig
    | EmailTriggerConfig
    | WebhookTriggerConfig
    | FileChangeTriggerConfig
    | WhatsAppTriggerConfig

  // Execution parameters
  task?: string // Optional task description to add to agent prompt
  context?: Record<string, any>
  maxTurns?: number

  // Metadata
  createdAt: string
  updatedAt: string
  lastTriggered?: string
  triggerCount: number

  // Status
  status: 'active' | 'paused' | 'error' | 'completed'
  lastError?: string
}

export interface ScheduledTriggerConfig {
  type: 'scheduled'
  schedule: {
    type: 'cron' | 'interval' | 'once'
    expression: string // Cron expression or interval (e.g., "0 9 * * 1-5", "5m", "2024-12-25T10:00:00Z")
    timezone?: string // Timezone for cron (default: UTC)
  }
  maxRuns?: number // Maximum number of executions (optional)
  endDate?: string // Stop triggering after this date
}

export interface ExternalTriggerConfig {
  type: 'external'
  source: {
    type: 'api' | 'mcp_tool' | 'file_output' | 'database_change' | 'webhook'
    endpoint?: string // For API/webhook sources
    toolName?: string // For MCP tool outputs
    filePath?: string // For file monitoring
    query?: string // For database monitoring
    filter?: Record<string, any> // Additional filtering criteria
  }
  authentication?: {
    type: 'bearer' | 'api_key' | 'basic'
    credentials: Record<string, string>
  }
}

export interface EmailTriggerConfig {
  type: 'email'
  conditions: {
    from?: string[] // Trigger when email from these agents
    subject?: string[] // Trigger when subject contains these keywords
    priority?: ('high' | 'urgent')[] // Trigger on high/urgent emails
    keywords?: string[] // Trigger when body contains these keywords
  }
  autoReply?: {
    enabled: boolean
    template: string // Reply template with variables
  }
}

export interface WebhookTriggerConfig {
  type: 'webhook'
  secret?: string // HMAC-SHA256 secret for signature verification
  signatureHeader?: string // Header name containing the signature (default: x-webhook-signature)
  allowedIps?: string[] // Optional IP allowlist
}

export interface FileChangeTriggerConfig {
  type: 'file_change'
  monitoring: {
    paths: string[] // File/directory paths to monitor
    events: ('created' | 'modified' | 'deleted')[]
    patterns?: string[] // File name patterns (glob)
    ignorePatterns?: string[] // Patterns to ignore
  }
  debounce?: number // Milliseconds to wait before triggering
}

export interface WhatsAppTriggerConfig {
  type: 'whatsapp'
  conditions: {
    fromNumbers?: string[] // Phone number patterns to match
    containsKeywords?: string[] // Trigger when message contains these keywords
    messageTypes?: (
      | 'text'
      | 'image'
      | 'document'
      | 'audio'
      | 'video'
      | 'location'
      | 'contacts'
      | 'sticker'
    )[]
  }
  autoReply?: {
    enabled: boolean
    template: string // Reply template with variables
  }
}

export interface TriggerExecution {
  id: string
  triggerId: string
  agentId: string
  sessionId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  startedAt: string
  completedAt?: string
  duration?: number // Execution time in milliseconds
  result?: any
  error?: string
  triggerData?: any // Data that caused the trigger
  logs: TriggerLog[]
}

export interface TriggerLog {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  data?: any
}

export interface TriggerSchedule {
  triggerId: string
  nextRun: string
  recurring: boolean
  active: boolean
}

export interface ExternalTriggerPayload {
  triggerId: string
  source: string
  data: any
  timestamp: string
  signature?: string // For webhook validation
}
