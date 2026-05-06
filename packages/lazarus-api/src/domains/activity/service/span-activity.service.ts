import type {
  ActivityIndexEntry,
  IActivityService,
} from '@domains/activity/service/activity.service.interface'
import {
  agentRunRepository,
  agentSpanRepository,
  type TAgentRunRow,
  type TAgentRunStatus,
} from '@domains/activity/repository'
import type {
  ActivityLog,
  ActivityLogFilter,
  ConversationMessage,
  ExecutionStatus,
  FileChange,
  MemorySummary,
} from '@domains/activity/types/activity.types'
import { createLogger } from '@utils/logger'
import { buildActivityLog } from './span-to-activity.translator'

const log = createLogger('span-activity-service')

function indexEntryFromRun(run: TAgentRunRow): ActivityIndexEntry {
  const events = run.events ?? []
  const conversationCount = events.filter(
    (e) =>
      e.name === 'user.message' ||
      e.name === 'assistant.text' ||
      e.name === 'assistant.thinking' ||
      e.name === 'system.init',
  ).length
  const filesModifiedCount = events.filter((e) => e.name === 'file.change').length
  return {
    id: run.trace_id,
    title: run.title ?? 'Agent execution',
    timestamp: run.started_at,
    type: 'agent',
    actorId: run.agent_id,
    actorName: run.agent_id,
    actorType: 'agent',
    changeCount: 0,
    memoryCellCount: 0,
    appCount: 0,
    status: (run.status as ExecutionStatus) ?? 'completed',
    triggeredBy: run.triggered_by ?? undefined,
    conversationCount,
    filesModifiedCount,
    platformSource: run.platform_source ?? undefined,
    conversationTitle: run.title ?? undefined,
    tokenCount: run.input_tokens + run.output_tokens,
    estimatedCost: Number(run.cost_usd),
  }
}

function applyFilter(run: TAgentRunRow, filter?: ActivityLogFilter): boolean {
  if (!filter) return true
  if (filter.search && filter.search.length > 0) {
    const hay = `${run.title ?? ''} ${run.agent_id}`.toLowerCase()
    if (!hay.includes(filter.search.toLowerCase())) return false
  }
  if (filter.actors && filter.actors.length > 0 && !filter.actors.includes(run.agent_id)) {
    return false
  }
  if (filter.executionStatus && filter.executionStatus.length > 0) {
    if (!filter.executionStatus.includes(run.status as ExecutionStatus)) return false
  }
  if (filter.triggeredBy && filter.triggeredBy.length > 0) {
    if (!run.triggered_by || !filter.triggeredBy.includes(run.triggered_by as never)) return false
  }
  if (filter.dateRange) {
    const ts = new Date(run.started_at).getTime()
    if (ts < filter.dateRange.start.getTime() || ts > filter.dateRange.end.getTime()) return false
  }
  return true
}

async function loadFullLog(run: TAgentRunRow): Promise<ActivityLog> {
  const spans = await agentSpanRepository.listByTrace(run.trace_id)
  return buildActivityLog({ run, spans })
}

export class SpanActivityService implements IActivityService {
  async getActivityLog(workspaceId: string, logId: string): Promise<ActivityLog | null> {
    const run = await agentRunRepository.getByTraceId(logId)
    if (!run || run.workspace_id !== workspaceId) return null
    return loadFullLog(run)
  }

  async getContributionData(workspaceId: string, year: number): Promise<Record<string, number>> {
    const from = new Date(Date.UTC(year, 0, 1)).toISOString()
    const to = new Date(Date.UTC(year + 1, 0, 1)).toISOString()
    const buckets = await agentRunRepository.countByDay(workspaceId, from, to)
    const out: Record<string, number> = {}
    for (const b of buckets) out[b.day] = b.count
    return out
  }

  async listActivityLogs(
    workspaceId: string,
    options?: { limit?: number; offset?: number; filter?: ActivityLogFilter },
  ): Promise<{
    logs: ActivityLog[]
    total: number
    offset: number
    limit?: number
    hasMore: boolean
  }> {
    const limit = options?.limit ?? 50
    const offset = options?.offset ?? 0
    // Pull a generous window, then filter and paginate in memory.
    const all = await agentRunRepository.list({
      workspaceId,
      limit: Math.min(500, limit + offset + 100),
    })
    const filtered = all.filter((r) => applyFilter(r, options?.filter))
    const page = filtered.slice(offset, offset + limit)
    const logs = await Promise.all(page.map(loadFullLog))
    return {
      logs,
      total: filtered.length,
      offset,
      limit,
      hasMore: offset + logs.length < filtered.length,
    }
  }

  async listActivityLogsSummary(
    workspaceId: string,
    options?: { limit?: number; offset?: number; filter?: ActivityLogFilter },
  ): Promise<{
    summaries: ActivityIndexEntry[]
    total: number
    offset: number
    limit?: number
    hasMore: boolean
  }> {
    const limit = options?.limit ?? 50
    const offset = options?.offset ?? 0
    const all = await agentRunRepository.list({
      workspaceId,
      limit: Math.min(500, limit + offset + 100),
    })
    const filtered = all.filter((r) => applyFilter(r, options?.filter))
    const page = filtered.slice(offset, offset + limit)
    return {
      summaries: page.map(indexEntryFromRun),
      total: filtered.length,
      offset,
      limit,
      hasMore: offset + page.length < filtered.length,
    }
  }

  async getWorkflowActivityLogs(_workspaceId: string, _workflowId: string): Promise<ActivityLog[]> {
    // Workflow association is not yet modeled on agent_runs.
    return []
  }

  async getActivityLogsByStatus(
    workspaceId: string,
    status: ExecutionStatus,
  ): Promise<ActivityLog[]> {
    const runs = await agentRunRepository.list({
      workspaceId,
      status: status as TAgentRunStatus,
      limit: 200,
    })
    return Promise.all(runs.map(loadFullLog))
  }

  async getExecutingLogs(workspaceId: string): Promise<ActivityLog[]> {
    return this.getActivityLogsByStatus(workspaceId, 'executing')
  }

  async findActivityLogBySessionId(
    workspaceId: string,
    sessionId: string,
  ): Promise<ActivityLog | null> {
    const runs = await agentRunRepository.list({ workspaceId, limit: 200 })
    const run = runs.find((r) => r.session_id === sessionId)
    if (!run) return null
    return loadFullLog(run)
  }

  // --- Write methods: no-ops. Spans are the source of truth. ---

  async saveActivityLog(activityLog: ActivityLog): Promise<string> {
    log.debug({ logId: activityLog.id }, 'saveActivityLog called on SpanActivityService (no-op)')
    return activityLog.id
  }

  async updateActivityLog(
    workspaceId: string,
    logId: string,
    updates: Partial<ActivityLog>,
  ): Promise<boolean> {
    // Only status transitions are honored — other fields are owned by spans.
    if (updates.status) {
      const run = await agentRunRepository.getByTraceId(logId)
      if (!run || run.workspace_id !== workspaceId) return false
      await agentRunRepository.update(logId, {
        status: updates.status as TAgentRunStatus,
        ended_at: new Date().toISOString(),
      })
      return true
    }
    return true
  }

  async appendConversationMessage(
    _workspaceId: string,
    _logId: string,
    _message: ConversationMessage,
  ): Promise<boolean> {
    return true
  }

  async appendFileChange(
    _workspaceId: string,
    _logId: string,
    _fileChange: FileChange,
  ): Promise<boolean> {
    return true
  }

  async updateExecutionStatus(
    workspaceId: string,
    logId: string,
    status: ExecutionStatus,
  ): Promise<boolean> {
    const run = await agentRunRepository.getByTraceId(logId)
    if (!run || run.workspace_id !== workspaceId) return false
    await agentRunRepository.update(logId, {
      status: status as TAgentRunStatus,
      ended_at: new Date().toISOString(),
    })
    return true
  }

  async deleteActivityLog(workspaceId: string, logId: string): Promise<boolean> {
    const run = await agentRunRepository.getByTraceId(logId)
    if (!run || run.workspace_id !== workspaceId) return false
    await agentRunRepository.update(logId, { status: 'cancelled' })
    return true
  }

  async saveMemorySummary(memorySummary: MemorySummary): Promise<string> {
    log.debug({ id: memorySummary.id }, 'saveMemorySummary called on SpanActivityService (no-op)')
    return memorySummary.id
  }
}
