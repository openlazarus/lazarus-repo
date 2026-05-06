import type {
  ActivityLog,
  ActivityLogFilter,
  MemorySummary,
  ConversationMessage,
  FileChange,
  ExecutionStatus,
} from '@domains/activity/types/activity.types'

export interface ActivityIndexEntry {
  id: string
  title: string
  timestamp: string
  type: string
  actorId: string
  actorName: string
  actorType: string
  workflowId?: string
  changeCount: number
  memoryCellCount: number
  appCount: number
  status?: ExecutionStatus
  triggeredBy?: string
  conversationCount?: number
  filesModifiedCount?: number
  platformSource?: string
  conversationTitle?: string
  totalDuration?: number
  toolCallCount?: number
  messageCount?: number
  tokenCount?: number
  estimatedCost?: number
}

export interface IActivityService {
  /** Save an activity log to storage. */
  saveActivityLog(activityLog: ActivityLog): Promise<string>

  /** Get a single activity log by ID. */
  getActivityLog(workspaceId: string, logId: string): Promise<ActivityLog | null>

  /** Get daily activity counts for a given year. */
  getContributionData(workspaceId: string, year: number): Promise<Record<string, number>>

  /** List activity logs with filtering and pagination. */
  listActivityLogs(
    workspaceId: string,
    options?: {
      limit?: number
      offset?: number
      filter?: ActivityLogFilter
    },
  ): Promise<{
    logs: ActivityLog[]
    total: number
    offset: number
    limit?: number
    hasMore: boolean
  }>

  /** List activity log summaries (index only, no full log loading). */
  listActivityLogsSummary(
    workspaceId: string,
    options?: {
      limit?: number
      offset?: number
      filter?: ActivityLogFilter
    },
  ): Promise<{
    summaries: ActivityIndexEntry[]
    total: number
    offset: number
    limit?: number
    hasMore: boolean
  }>

  /** Save a memory summary and create its corresponding activity log. */
  saveMemorySummary(memorySummary: MemorySummary): Promise<string>

  /** Delete an activity log. */
  deleteActivityLog(workspaceId: string, logId: string): Promise<boolean>

  /** Get activity logs for a specific workflow. */
  getWorkflowActivityLogs(workspaceId: string, workflowId: string): Promise<ActivityLog[]>

  /** Update an existing activity log with partial data. */
  updateActivityLog(
    workspaceId: string,
    logId: string,
    updates: Partial<ActivityLog>,
  ): Promise<boolean>

  /** Append a conversation message to an existing activity log. */
  appendConversationMessage(
    workspaceId: string,
    logId: string,
    message: ConversationMessage,
  ): Promise<boolean>

  /** Append a file change to an existing activity log. */
  appendFileChange(workspaceId: string, logId: string, fileChange: FileChange): Promise<boolean>

  /** Update the execution status of an activity log. */
  updateExecutionStatus(
    workspaceId: string,
    logId: string,
    status: ExecutionStatus,
  ): Promise<boolean>

  /** Get activity logs filtered by execution status. */
  getActivityLogsByStatus(workspaceId: string, status: ExecutionStatus): Promise<ActivityLog[]>

  /** Get all currently executing activity logs for a workspace. */
  getExecutingLogs(workspaceId: string): Promise<ActivityLog[]>

  /** Find an activity log by session ID. */
  findActivityLogBySessionId(workspaceId: string, sessionId: string): Promise<ActivityLog | null>
}
