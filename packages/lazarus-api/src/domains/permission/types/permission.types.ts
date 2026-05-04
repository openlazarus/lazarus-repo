import type { Response } from 'express'

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface RiskAssessment {
  level: RiskLevel
  factors: string[]
  autoApprove: boolean
  autoDeny: boolean
  description: string
}

export interface PendingPermission {
  requestId: string
  channelKey: string // e.g. "whatsapp:{workspaceId}:{agentId}:{senderPhone}"
  platform: string
  toolName: string
  resolve: (approved: boolean) => void
  timeout: NodeJS.Timeout | null
  createdAt: number
  persistent: boolean // true = stored in DB, no timeout
}

export interface RegisterPersistentParams {
  requestId: string
  workspaceId: string
  agentId: string
  agentName: string
  executionId: string
  toolName: string
  toolInput: Record<string, unknown>
  description: string
  riskLevel: string
  activityTrace: unknown[] | null
  resolve: (approved: boolean) => void
}

export interface PendingRequest {
  resolve: (approved: boolean) => void
  timeout: NodeJS.Timeout
  requestId: string
  toolName: string
  startTime: Date
}

export interface PendingAskUserRequest {
  resolve: (answers: Record<string, string> | null) => void
  timeout: NodeJS.Timeout
  requestId: string
  startTime: Date
}

export interface ChatSession {
  res: Response
  userId: string
  teamId: string
  sessionId: string // Claude Code SDK session ID - single source of truth
  startTime: Date
  pendingRequests: Map<string, PendingRequest>
  pendingAskUserRequests: Map<string, PendingAskUserRequest>
}

export interface ChannelContext {
  platform: 'whatsapp' | 'discord' | 'email' | 'slack'
  // WhatsApp
  phoneNumberId?: string // Agent's Kapso phone number ID
  senderPhone?: string // User's phone number
  // Discord (future)
  channelId?: string
  guildId?: string
  discordUserId?: string
  // Email (future)
  senderEmail?: string
  agentEmail?: string
  // Slack (future)
  slackChannelId?: string
  slackUserId?: string
  slackTeamId?: string
}

export interface ChannelPermissionRequest {
  requestId: string
  toolName: string
  parameters: Record<string, unknown>
  description: string // Human-readable from generateHumanReadableDescription()
  riskLevel: string
  agentId: string
  workspaceId: string
}

export interface ChannelPermissionProvider {
  requestPermission(
    request: ChannelPermissionRequest,
    context: ChannelContext,
    timeoutMs: number,
  ): Promise<boolean>
  cleanup(requestId: string): void
}

export interface PermissionChannelConfig {
  enabled: boolean
  platform: 'whatsapp' | 'discord' | 'email' | 'slack'
  // WhatsApp-specific
  phoneNumberId?: string
  targetPhone?: string
  // Discord-specific (future)
  channelId?: string
  targetUserId?: string
  // Slack-specific (future)
  slackChannelId?: string
  slackUserId?: string
  // Email-specific (future)
  targetEmail?: string
  // General
  timeoutMinutes?: number // Default: 5
}

export interface ChannelPermissionBundle {
  provider: ChannelPermissionProvider
  context: ChannelContext
}
