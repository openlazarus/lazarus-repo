import type { TAgentRunRow, TAgentSpanEvent, TAgentSpanRow } from '@domains/activity/repository'
import type {
  Actor,
  ActivityLog,
  AppUsage,
  ConversationMessage,
  ExecutionContext,
  ExecutionStatus,
  FileChange,
  PlatformSource,
  TokenUsage,
  TriggerType,
} from '@domains/activity/types/activity.types'

const TOOL_CALL_SPAN = 'agent.tool_call'
const FILE_CHANGE_EVENT = 'file.change'

function safeParse<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string' || raw.length === 0) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function attr<T>(attrs: Record<string, unknown> | undefined, key: string, fallback: T): T {
  if (!attrs) return fallback
  const v = attrs[key]
  return (v === undefined ? fallback : v) as T
}

function toDate(iso: string | null | undefined): Date {
  return iso ? new Date(iso) : new Date(0)
}

export function buildActor(run: TAgentRunRow): Actor {
  return {
    id: run.agent_id,
    type: 'agent',
    name: run.agent_id,
  }
}

function eventToConversationMessage(
  run: TAgentRunRow,
  event: TAgentSpanEvent,
  idx: number,
): ConversationMessage | null {
  const ts = toDate(event.timestamp)
  const base = { id: `${run.trace_id}:evt:${idx}`, timestamp: ts }
  switch (event.name) {
    case 'user.message':
      return { ...base, role: 'user', content: attr(event.attributes, 'text', '') }
    case 'assistant.text':
      return { ...base, role: 'assistant', content: attr(event.attributes, 'text', '') }
    case 'assistant.thinking':
      return {
        ...base,
        role: 'assistant',
        content: attr(event.attributes, 'thinking', ''),
        isThinking: true,
      }
    case 'system.init':
      return {
        ...base,
        role: 'system',
        content: `System: ${attr(event.attributes, 'subtype', 'init')}`,
      }
    default:
      return null
  }
}

function toolCallSpanToMessages(span: TAgentSpanRow): {
  toolUseMessage: ConversationMessage
  app: AppUsage
} {
  const attrs = span.attributes ?? {}
  const name = attr(attrs, 'gen_ai.tool.name', 'unknown-tool')
  const toolInput = safeParse<unknown>(attrs['lazarus.tool_input'], null)
  const toolOutput = safeParse<unknown>(attrs['lazarus.tool_output'], null)
  const isError = !!attrs['lazarus.tool_is_error']
  const startedAt = toDate(span.started_at)
  const endedAt = span.ended_at ? toDate(span.ended_at) : null
  const duration = endedAt ? endedAt.getTime() - startedAt.getTime() : undefined

  const toolUseMessage: ConversationMessage = {
    id: `${span.span_id}:tool_use`,
    role: 'tool',
    content: '',
    timestamp: startedAt,
    toolName: name,
    toolInput: toolInput ?? undefined,
    toolResult: toolOutput ?? undefined,
  }

  const app: AppUsage = {
    id: span.span_id,
    name,
    type: 'function',
    action: 'tool_use',
    parameters: (toolInput as Record<string, unknown> | null) ?? undefined,
    result: {
      status: isError ? 'failure' : 'success',
      data: toolOutput ?? undefined,
    },
    duration,
  }

  return { toolUseMessage, app }
}

function fileChangeEventToFileChange(event: TAgentSpanEvent): FileChange | null {
  const a = event.attributes ?? {}
  const path = attr<string>(a, 'path', '')
  if (!path) return null
  const action = attr<'created' | 'modified' | 'deleted'>(a, 'action', 'modified')
  return {
    path,
    action,
    timestamp: toDate(event.timestamp),
    linesAdded: typeof a.lines_added === 'number' ? (a.lines_added as number) : undefined,
    linesRemoved: typeof a.lines_removed === 'number' ? (a.lines_removed as number) : undefined,
    contentPreview:
      typeof a.content_preview === 'string' ? (a.content_preview as string) : undefined,
  }
}

export interface BuildActivityLogInput {
  run: TAgentRunRow
  spans?: TAgentSpanRow[]
}

export function buildActivityLog({ run, spans = [] }: BuildActivityLogInput): ActivityLog {
  const actor = buildActor(run)
  const timestamp = toDate(run.started_at)
  const conversation: ConversationMessage[] = []
  const apps: AppUsage[] = []
  const filesModified: FileChange[] = []

  const events = run.events ?? []
  events.forEach((e, idx) => {
    const msg = eventToConversationMessage(run, e, idx)
    if (msg) conversation.push(msg)
    if (e.name === FILE_CHANGE_EVENT) {
      const fc = fileChangeEventToFileChange(e)
      if (fc) filesModified.push(fc)
    }
  })

  for (const span of spans) {
    if (span.name !== TOOL_CALL_SPAN) continue
    const { toolUseMessage, app } = toolCallSpanToMessages(span)
    conversation.push(toolUseMessage)
    apps.push(app)
  }

  conversation.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

  const tokenUsage: TokenUsage = {
    inputTokens: run.input_tokens,
    outputTokens: run.output_tokens,
    totalTokens: run.input_tokens + run.output_tokens,
    estimatedCost: Number(run.cost_usd),
    model: run.model ?? undefined,
  }

  const originalPromptEvent = events.find((e) => e.name === 'user.message')
  const executionContext: ExecutionContext = {
    triggeredBy: (run.triggered_by as TriggerType) || 'manual',
    originalPrompt: originalPromptEvent
      ? attr(originalPromptEvent.attributes, 'text', '')
      : undefined,
    conversationId: run.session_id ?? undefined,
  }

  return {
    id: run.trace_id,
    title: run.title ?? 'Agent execution',
    timestamp,
    actor,
    type: 'agent',
    changes: [],
    workspaceId: run.workspace_id,
    apps,
    metadata: {
      sessionId: run.session_id ?? undefined,
      ...(run.attributes ?? {}),
    },
    status: (run.status as ExecutionStatus) ?? 'completed',
    conversation,
    filesModified,
    tokenUsage,
    executionContext,
    platformSource: (run.platform_source as PlatformSource) ?? undefined,
    conversationTitle: run.title ?? undefined,
  }
}

export interface TActivityLogSummary {
  id: string
  title: string
  timestamp: Date
  status: ExecutionStatus
  triggeredBy?: TriggerType
  platformSource?: PlatformSource
  conversationCount: number
  filesModifiedCount: number
  tokenCount: number
  estimatedCost: number
  agentId: string
}

export function buildActivityLogSummary(run: TAgentRunRow): TActivityLogSummary {
  const events = run.events ?? []
  const conversationCount = events.filter(
    (e) =>
      e.name === 'user.message' ||
      e.name === 'assistant.text' ||
      e.name === 'assistant.thinking' ||
      e.name === 'system.init',
  ).length
  const filesModifiedCount = events.filter((e) => e.name === FILE_CHANGE_EVENT).length

  return {
    id: run.trace_id,
    title: run.title ?? 'Agent execution',
    timestamp: toDate(run.started_at),
    status: (run.status as ExecutionStatus) ?? 'completed',
    triggeredBy: (run.triggered_by as TriggerType) || undefined,
    platformSource: (run.platform_source as PlatformSource) || undefined,
    conversationCount,
    filesModifiedCount,
    tokenCount: run.input_tokens + run.output_tokens,
    estimatedCost: Number(run.cost_usd),
    agentId: run.agent_id,
  }
}
