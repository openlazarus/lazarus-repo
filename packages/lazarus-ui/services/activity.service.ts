/**
 * Activity API service for fetching activity logs from the backend.
 * Uses workspace-scoped endpoints with authentication.
 */

import { getWorkspaceBaseUrl } from '@/hooks/data/use-workspace-api'
import { apiClient } from '@/lib/api-client'

const wsHeaders = (workspaceId: string) => ({ 'x-workspace-id': workspaceId })
const wsUrl = (workspaceId: string, path: string) =>
  `${getWorkspaceBaseUrl(workspaceId)}${path}`

export interface Actor {
  id: string
  type: 'user' | 'agent' | 'system' | 'automation' | 'experiment'
  name: string
  agentModel?: string
  agentPurpose?: string
  email?: string
  avatar?: string
}

export interface MemoryCellChange {
  id: string
  name: string
  changeType: string
}

export interface AppUsage {
  id: string
  name: string
  type: string
  action: string
  parameters?: Record<string, any>
  result?: {
    status: 'success' | 'failure' | 'partial'
    message?: string
    data?: any
  }
  duration?: number
}

export interface Change {
  type: string
  description: string
  intent?: string
  before?: any
  after?: any
}

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  estimatedCost?: number
  model?: string
}

export interface ExecutionContext {
  triggeredBy: 'user' | 'email' | 'webhook' | 'schedule' | 'manual'
  triggerDetails?: any
  originalPrompt?: string
  conversationId?: string
}

export interface FileChange {
  path: string
  action: 'created' | 'modified' | 'deleted'
  timestamp: Date | string
  linesAdded?: number
  linesRemoved?: number
}

export interface ConversationMessage {
  id: string
  role: 'assistant' | 'user' | 'system' | 'tool'
  content: string
  timestamp: Date | string
  toolName?: string
  toolInput?: any
  toolResult?: any
  isThinking?: boolean
}

export interface ActivityLog {
  id: string
  title: string
  timestamp: Date
  actor: Actor
  type: 'system' | 'memory' | 'agent' | 'user' | 'experiment'
  changes: Change[]
  workspaceId?: string
  memoryCells?: MemoryCellChange[]
  apps?: AppUsage[]
  systemLog?: string
  memoryLog?: string
  metadata?: Record<string, any>
  workflowId?: string
  // Execution tracking fields
  status?: 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled'
  conversation?: ConversationMessage[]
  tokenUsage?: TokenUsage
  executionContext?: ExecutionContext
  filesModified?: FileChange[]
  // Platform integration fields
  platformSource?: 'discord' | 'slack' | 'email' | 'chat'
  conversationTitle?: string
  platformMetadata?: {
    channelId?: string
    channelName?: string
    threadId?: string
    guildId?: string
    guildName?: string
    userName?: string
    userId?: string
  }
}

export interface ActivityLogFilter {
  search?: string
  actors?: string[]
  actorTypes?: string[]
  types?: string[]
}

export interface ListActivityLogsParams {
  workspaceId: string
  userId: string
  limit?: number
  offset?: number
  filter?: ActivityLogFilter
}

export interface ListActivityLogsResponse {
  success: boolean
  logs: ActivityLog[]
  total: number
  offset: number
  limit?: number
  hasMore: boolean
}

export interface GetActivityLogResponse {
  success: boolean
  log: ActivityLog
}

class ActivityService {
  /**
   * List activity logs with filtering and pagination
   * READ-ONLY: Frontend can only read logs, not create or delete them
   */
  async listActivityLogs(
    params: ListActivityLogsParams,
  ): Promise<ListActivityLogsResponse> {
    const { workspaceId, userId, limit, offset, filter } = params

    const queryParams = new URLSearchParams({
      userId,
    })

    if (limit !== undefined) queryParams.append('limit', limit.toString())
    if (offset !== undefined) queryParams.append('offset', offset.toString())
    if (filter?.search) queryParams.append('search', filter.search)
    if (filter?.actors) queryParams.append('actors', filter.actors.join(','))
    if (filter?.actorTypes)
      queryParams.append('actorTypes', filter.actorTypes.join(','))
    if (filter?.types) queryParams.append('types', filter.types.join(','))

    const response = await apiClient.get(
      wsUrl(workspaceId, `/api/workspaces/activity?${queryParams}`),
      { headers: wsHeaders(workspaceId) },
    )

    const data = response.data

    // Convert timestamp strings to Date objects
    return {
      ...data,
      logs: data.logs.map((log: any) => ({
        ...log,
        timestamp: new Date(log.timestamp),
      })),
    }
  }

  /**
   * Get a single activity log by ID
   * READ-ONLY: Frontend can only read logs
   */
  async getActivityLog(
    workspaceId: string,
    logId: string,
    userId: string,
  ): Promise<ActivityLog> {
    const queryParams = new URLSearchParams({ userId })
    const response = await apiClient.get<GetActivityLogResponse>(
      wsUrl(workspaceId, `/api/workspaces/activity/${logId}?${queryParams}`),
      { headers: wsHeaders(workspaceId) },
    )

    const data = response.data

    // Convert timestamp string to Date object
    return {
      ...data.log,
      timestamp: new Date(data.log.timestamp),
    }
  }

  /**
   * Get daily activity counts for the contribution graph
   */
  async getContributionData(
    workspaceId: string,
    year: number,
  ): Promise<Record<string, number>> {
    const response = await apiClient.get<{
      success: boolean
      counts: Record<string, number>
    }>(
      wsUrl(workspaceId, `/api/workspaces/activity/contributions?year=${year}`),
      { headers: wsHeaders(workspaceId) },
    )

    return response.data.counts
  }

  /**
   * Get activity logs for a specific workflow
   * READ-ONLY: Frontend can only read logs
   */
  async getWorkflowActivityLogs(
    workspaceId: string,
    workflowId: string,
    userId: string,
  ): Promise<ActivityLog[]> {
    const queryParams = new URLSearchParams({ userId })
    const response = await apiClient.get<{ logs: any[] }>(
      wsUrl(
        workspaceId,
        `/api/workspaces/activity/workflow/${workflowId}?${queryParams}`,
      ),
      { headers: wsHeaders(workspaceId) },
    )

    const data = response.data

    // Convert timestamp strings to Date objects
    return data.logs.map((log: any) => ({
      ...log,
      timestamp: new Date(log.timestamp),
    }))
  }
}

// Export singleton instance
export const activityService = new ActivityService()
