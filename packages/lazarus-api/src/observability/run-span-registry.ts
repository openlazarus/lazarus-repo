import type { Span } from '@opentelemetry/api'
import { eventBus } from '@realtime/events/event-bus'
import { createLogger } from '@utils/logger'
import { SPAN_EVENTS } from './constants'

const log = createLogger('run-span-registry')

interface RegistryEntry {
  span: Span
  workspaceId: string
}

const byExecutionId = new Map<string, RegistryEntry>()

export function registerRunSpan(executionId: string, workspaceId: string, span: Span): void {
  if (!executionId) return
  byExecutionId.set(executionId, { span, workspaceId })
}

export function unregisterRunSpan(executionId: string): void {
  if (!executionId) return
  byExecutionId.delete(executionId)
}

function getEntry(executionId: string): RegistryEntry | null {
  if (!executionId) return null
  return byExecutionId.get(executionId) ?? null
}

export interface TFileChangeRecord {
  path: string
  action: 'created' | 'modified' | 'deleted'
  linesAdded?: number
  linesRemoved?: number
  contentPreview?: string
}

export function recordFileChangeOnRun(executionId: string, change: TFileChangeRecord): void {
  const entry = getEntry(executionId)
  if (!entry) return
  const now = new Date()
  entry.span.addEvent('file.change', {
    path: change.path,
    action: change.action,
    lines_added: change.linesAdded ?? 0,
    lines_removed: change.linesRemoved ?? 0,
    ...(change.contentPreview ? { content_preview: change.contentPreview } : {}),
  })
  eventBus.emit('activity:file-changed', {
    workspaceId: entry.workspaceId,
    activityId: entry.span.spanContext().traceId,
    fileChange: { ...change, timestamp: now },
  })
}

export interface TApprovalRecord {
  requestId: string
  toolName: string
  riskLevel?: string
  description?: string
}

export function recordApprovalRequestedOnRun(executionId: string, approval: TApprovalRecord): void {
  const entry = getEntry(executionId)
  if (!entry) return
  entry.span.addEvent(SPAN_EVENTS.approvalRequested, {
    request_id: approval.requestId,
    tool_name: approval.toolName,
    risk_level: approval.riskLevel ?? '',
    description: approval.description ?? '',
  })
  log.debug({ executionId, requestId: approval.requestId }, 'approval.requested span event')
}

export function recordApprovalResolvedOnRun(
  executionId: string,
  requestId: string,
  approved: boolean,
  source: string,
): void {
  const entry = getEntry(executionId)
  if (!entry) return
  entry.span.addEvent(SPAN_EVENTS.approvalResolved, {
    request_id: requestId,
    approved,
    source,
  })
}
