import type { Context } from '@opentelemetry/api'
import type { ReadableSpan, Span, SpanProcessor } from '@opentelemetry/sdk-trace-node'
import {
  agentRunRepository,
  agentSpanRepository,
  type TAgentRunInsert,
  type TAgentRunStatus,
  type TAgentRunUpdate,
  type TAgentSpanEvent,
  type TAgentSpanInsert,
} from '@domains/activity/repository'
import { eventBus } from '@realtime/events/event-bus'
import { createLogger } from '@utils/logger'
import { SPAN_ATTRS, SPAN_NAMES } from './constants'

const log = createLogger('activity-store-span-processor')

function hrTimeToIso(hrTime: [number, number]): string {
  const ms = hrTime[0] * 1000 + hrTime[1] / 1e6
  return new Date(ms).toISOString()
}

function attrString(span: ReadableSpan, key: string): string | null {
  const v = span.attributes[key]
  return typeof v === 'string' ? v : null
}

function attrNumber(span: ReadableSpan, key: string): number {
  const v = span.attributes[key]
  return typeof v === 'number' ? v : 0
}

function spanAttributesAsJson(span: ReadableSpan): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(span.attributes)) {
    out[k] = v as unknown
  }
  return out
}

function spanEventsAsJson(span: ReadableSpan): TAgentSpanEvent[] {
  return span.events.map((e) => ({
    name: e.name,
    timestamp: hrTimeToIso(e.time),
    attributes: (e.attributes ?? {}) as Record<string, unknown>,
  }))
}

function statusFromSpan(span: ReadableSpan): TAgentRunStatus {
  const explicit = attrString(span, 'lazarus.final_status') as TAgentRunStatus | null
  if (explicit === 'completed' || explicit === 'failed' || explicit === 'cancelled') {
    return explicit
  }
  return span.status.code === 2 ? 'failed' : 'completed'
}

export class ActivityStoreSpanProcessor implements SpanProcessor {
  // Per-trace gate: child span writes await this so they never race the parent insert.
  private readonly runReady = new Map<string, Promise<void>>()

  onStart(span: Span, _parentContext: Context): void {
    log.info({ name: span.name }, 'ActivityStoreSpanProcessor.onStart fired')
    if (span.name !== SPAN_NAMES.agentRun) return
    const readable = span as unknown as ReadableSpan
    const ctx = span.spanContext()

    const workspaceId = attrString(readable, SPAN_ATTRS.workspaceId)
    const agentId = attrString(readable, SPAN_ATTRS.agentId)
    if (!workspaceId || !agentId) {
      log.warn({ traceId: ctx.traceId }, 'agent.run missing workspace_id/agent_id attrs; skipping')
      return
    }
    log.info(
      { traceId: ctx.traceId, workspaceId, agentId },
      'ActivityStoreSpanProcessor: upserting agent_runs row',
    )

    const row: TAgentRunInsert = {
      trace_id: ctx.traceId,
      workspace_id: workspaceId,
      agent_id: agentId,
      session_id: attrString(readable, SPAN_ATTRS.sessionId),
      runtime: attrString(readable, SPAN_ATTRS.runtime) ?? 'claude-sdk',
      status: 'executing',
      started_at: hrTimeToIso(readable.startTime),
      model: attrString(readable, SPAN_ATTRS.genAiRequestModel),
      title: attrString(readable, SPAN_ATTRS.title),
      triggered_by: attrString(readable, SPAN_ATTRS.triggeredBy),
      platform_source: attrString(readable, SPAN_ATTRS.platformSource),
      attributes: spanAttributesAsJson(readable),
    }

    this.runReady.set(
      ctx.traceId,
      agentRunRepository.upsert(row).catch((err) => {
        log.error({ err, traceId: ctx.traceId }, 'onStart upsert failed')
      }),
    )

    eventBus.emit('activity:new', {
      workspaceId,
      activityId: ctx.traceId,
      activityType: 'agent',
      actorName: agentId,
      title: row.title ?? 'Agent execution',
    })
    eventBus.emit('activity:status-changed', {
      workspaceId,
      activityId: ctx.traceId,
      status: 'executing',
    })
  }

  onEnd(span: ReadableSpan): void {
    const ctx = span.spanContext()
    if (span.name === SPAN_NAMES.creditsCheck) {
      // credits.check runs before agent.run; persisting it would FK-fail.
      return
    }
    if (span.name === SPAN_NAMES.agentRun) {
      const status = statusFromSpan(span)
      const patch: TAgentRunUpdate = {
        status,
        ended_at: hrTimeToIso(span.endTime),
        input_tokens: attrNumber(span, SPAN_ATTRS.genAiUsageInputTokens),
        output_tokens: attrNumber(span, SPAN_ATTRS.genAiUsageOutputTokens),
        cost_usd: attrNumber(span, SPAN_ATTRS.costUsd),
        title: attrString(span, SPAN_ATTRS.title),
        attributes: spanAttributesAsJson(span),
        events: spanEventsAsJson(span),
      }
      const workspaceId = attrString(span, SPAN_ATTRS.workspaceId) ?? ''
      const ready = this.runReady.get(ctx.traceId) ?? Promise.resolve()
      void ready
        .then(() => agentRunRepository.update(ctx.traceId, patch))
        .catch((err) => log.error({ err, traceId: ctx.traceId }, 'onEnd update failed'))
        .finally(() => {
          setTimeout(() => this.runReady.delete(ctx.traceId), 30_000)
        })

      if (workspaceId) {
        eventBus.emit('activity:status-changed', {
          workspaceId,
          activityId: ctx.traceId,
          status,
        })
        eventBus.emit('activity:logged', {
          workspaceId,
          activityId: ctx.traceId,
          activityLog: { id: ctx.traceId, status, title: patch.title },
        })
      }
      return
    }

    const row: TAgentSpanInsert = {
      span_id: ctx.spanId,
      trace_id: ctx.traceId,
      parent_span_id: span.parentSpanContext?.spanId ?? null,
      name: span.name,
      started_at: hrTimeToIso(span.startTime),
      ended_at: hrTimeToIso(span.endTime),
      attributes: spanAttributesAsJson(span),
      events: spanEventsAsJson(span),
    }

    const ready = this.runReady.get(ctx.traceId) ?? Promise.resolve()
    void ready
      .then(() => agentSpanRepository.upsertMany([row]))
      .catch((err) => log.error({ err, spanId: ctx.spanId }, 'onEnd span upsert failed'))
  }

  async shutdown(): Promise<void> {}
  async forceFlush(): Promise<void> {
    await Promise.all(this.runReady.values())
  }
}
