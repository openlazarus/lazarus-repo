import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk'
import {
  ROOT_CONTEXT,
  SpanKind,
  SpanStatusCode,
  context,
  trace,
  type Span,
} from '@opentelemetry/api'
import { getAgentTracer } from './otel'
import type { IAgentRuntime } from '@domains/agent/runtime/agent-runtime.interface'
import type {
  TAgentRunRequest,
  TAgentRuntimeMessage,
} from '@domains/agent/runtime/agent-runtime.types'
import { eventBus } from '@realtime/events/event-bus'
import { generateQuickTitle } from '@domains/conversation/service/conversation-title.service'
import { createLogger } from '@utils/logger'
import { SPAN_ATTRS, SPAN_EVENTS, SPAN_NAMES } from './constants'
import { registerRunSpan, unregisterRunSpan } from './run-span-registry'
import { reportUsage } from '@shared/services/usage-reporter'

const log = createLogger('runtime-tracer')

interface ContentBlock {
  type: string
  id?: string
  name?: string
  input?: unknown
  text?: string
  thinking?: string
  tool_use_id?: string
  content?: unknown
  is_error?: boolean
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value) ?? ''
  } catch {
    return ''
  }
}

export class RuntimeTracer implements IAgentRuntime {
  constructor(private readonly inner: IAgentRuntime) {}

  run(request: TAgentRunRequest): AsyncIterable<TAgentRuntimeMessage> {
    const inner = this.inner
    const ctx = request.context
    const tracer = getAgentTracer()

    return (async function* (): AsyncGenerator<TAgentRuntimeMessage, void, void> {
      if (!ctx?.workspaceId || !ctx?.agentId) {
        log.warn(
          { hasCtx: !!ctx, workspaceId: ctx?.workspaceId, agentId: ctx?.agentId },
          'RuntimeTracer: no ctx — skipping span',
        )
        for await (const msg of inner.run(request)) yield msg
        return
      }

      log.info(
        {
          workspaceId: ctx.workspaceId,
          agentId: ctx.agentId,
          runtime: ctx.runtime,
          tracerCtor: tracer.constructor?.name,
        },
        'RuntimeTracer: starting agent.run span',
      )

      // Detach from any ambient HTTP/middleware parent context (e.g. Sentry's
      // auto-instrumentation creates a non-recording parent span). Using ROOT_CONTEXT
      // ensures our ParentBased sampler delegates to the root sampler (AlwaysOn)
      // so the span actually records and our processor's onStart fires.
      const runSpan = tracer.startSpan(
        SPAN_NAMES.agentRun,
        {
          kind: SpanKind.INTERNAL,
          attributes: {
            [SPAN_ATTRS.workspaceId]: ctx.workspaceId,
            [SPAN_ATTRS.agentId]: ctx.agentId,
            [SPAN_ATTRS.sessionId]: ctx.sessionId ?? '',
            [SPAN_ATTRS.executionId]: ctx.executionId ?? '',
            [SPAN_ATTRS.runtime]: ctx.runtime ?? 'claude-sdk',
            [SPAN_ATTRS.title]: ctx.title ?? '',
            [SPAN_ATTRS.triggeredBy]: ctx.triggeredBy ?? '',
            [SPAN_ATTRS.platformSource]: ctx.platformSource ?? '',
            [SPAN_ATTRS.genAiSystem]: 'anthropic',
            [SPAN_ATTRS.genAiRequestModel]: request.options.model ?? '',
          },
        },
        ROOT_CONTEXT,
      )

      log.info(
        {
          spanCtor: runSpan.constructor?.name,
          isRecording: runSpan.isRecording?.(),
        },
        'RuntimeTracer: span created',
      )
      const runCtx = trace.setSpan(context.active(), runSpan)
      const toolSpans = new Map<string, Span>()
      const activityId = runSpan.spanContext().traceId
      const workspaceIdStr = ctx.workspaceId

      if (ctx.executionId) {
        registerRunSpan(ctx.executionId, workspaceIdStr, runSpan)
      }
      let finalStatus: 'completed' | 'failed' | 'cancelled' = 'completed'
      let messageSeq = 0

      const emitConversationMessage = (
        eventName: string,
        attrs: Record<string, string | number | boolean>,
        conversationRole: 'user' | 'assistant' | 'system' | 'tool',
        content: string,
        extra?: Record<string, unknown>,
      ): void => {
        runSpan.addEvent(eventName, attrs)
        eventBus.emit('activity:message-added', {
          workspaceId: workspaceIdStr,
          activityId,
          message: {
            id: `${activityId}:live:${messageSeq++}`,
            role: conversationRole,
            content,
            timestamp: new Date(),
            ...(extra ?? {}),
          },
        })
      }

      let firstUserText: string | null = null
      if (ctx.userPrompt) {
        firstUserText = ctx.userPrompt
        emitConversationMessage(
          SPAN_EVENTS.userMessage,
          { text: ctx.userPrompt },
          'user',
          ctx.userPrompt,
        )
      }

      const captureFirstUserText = (role: string, text: string) => {
        if (firstUserText === null && role === 'user' && text.trim().length > 0) {
          firstUserText = text
        }
      }

      try {
        for await (const message of inner.run(request)) {
          try {
            handleMessage(
              message,
              runSpan,
              toolSpans,
              tracer,
              runCtx,
              (eventName, attrs, role, content, extra) => {
                captureFirstUserText(role, content)
                emitConversationMessage(eventName, attrs, role, content, extra)
              },
            )
            if ((message as SDKMessage).type === 'result') {
              const m = message as SDKMessage & {
                subtype?: string
                total_cost_usd?: number
                usage?: {
                  input_tokens?: number
                  output_tokens?: number
                  cache_read_input_tokens?: number
                  cache_creation_input_tokens?: number
                }
              }
              if (m.usage) {
                runSpan.setAttribute(SPAN_ATTRS.genAiUsageInputTokens, m.usage.input_tokens ?? 0)
                runSpan.setAttribute(SPAN_ATTRS.genAiUsageOutputTokens, m.usage.output_tokens ?? 0)
                if (typeof m.usage.cache_read_input_tokens === 'number') {
                  runSpan.setAttribute(
                    SPAN_ATTRS.genAiUsageCacheReadTokens,
                    m.usage.cache_read_input_tokens,
                  )
                }
                if (typeof m.usage.cache_creation_input_tokens === 'number') {
                  runSpan.setAttribute(
                    SPAN_ATTRS.genAiUsageCacheCreateTokens,
                    m.usage.cache_creation_input_tokens,
                  )
                }

                const inputTokens = m.usage.input_tokens ?? 0
                const outputTokens = m.usage.output_tokens ?? 0
                const totalTokens = inputTokens + outputTokens
                if (totalTokens > 0) {
                  reportUsage({
                    workspaceId: workspaceIdStr,
                    type: 'llm_tokens',
                    value: totalTokens,
                    inputTokens,
                    outputTokens,
                    cacheReadTokens: m.usage.cache_read_input_tokens ?? 0,
                    cacheWriteTokens: m.usage.cache_creation_input_tokens ?? 0,
                    platformSource: ctx.platformSource ?? undefined,
                  })
                }
              }
              if (typeof m.total_cost_usd === 'number') {
                runSpan.setAttribute(SPAN_ATTRS.costUsd, m.total_cost_usd)
              }
              if (m.subtype && m.subtype !== 'success') {
                finalStatus = 'failed'
                runSpan.setStatus({ code: SpanStatusCode.ERROR, message: m.subtype })
                runSpan.setAttribute('lazarus.final_status', 'failed')
              }
            }
          } catch (err) {
            log.error({ err }, 'tracer handleMessage threw; continuing')
          }
          yield message
        }
      } catch (err) {
        finalStatus = 'failed'
        runSpan.recordException(err as Error)
        runSpan.setStatus({ code: SpanStatusCode.ERROR })
        runSpan.setAttribute('lazarus.final_status', 'failed')
        throw err
      } finally {
        for (const span of toolSpans.values()) {
          span.end()
        }
        if (finalStatus === 'completed') {
          runSpan.setAttribute('lazarus.final_status', 'completed')
        }
        if (firstUserText && !ctx.title) {
          runSpan.setAttribute(SPAN_ATTRS.title, generateQuickTitle(firstUserText))
        }
        runSpan.end()
        if (ctx.executionId) unregisterRunSpan(ctx.executionId)
      }
    })()
  }
}

type TEmitConversationMessage = (
  eventName: string,
  attrs: Record<string, string | number | boolean>,
  role: 'user' | 'assistant' | 'system' | 'tool',
  content: string,
  extra?: Record<string, unknown>,
) => void

function handleMessage(
  message: SDKMessage,
  runSpan: Span,
  toolSpans: Map<string, Span>,
  tracer: ReturnType<typeof trace.getTracer>,
  runCtx: ReturnType<typeof context.active>,
  emit: TEmitConversationMessage,
): void {
  const m = message as SDKMessage & {
    message?: { content?: ContentBlock[]; usage?: Record<string, number> }
    tool_name?: string
    subtype?: string
  }

  if (m.type === 'system') {
    emit(
      SPAN_EVENTS.systemInit,
      { subtype: m.subtype ?? '' },
      'system',
      `System: ${m.subtype ?? 'init'}`,
    )
    return
  }

  if (m.type === 'assistant') {
    const content = m.message?.content ?? []
    for (const block of content) {
      if (block.type === 'text') {
        emit(SPAN_EVENTS.assistantText, { text: block.text ?? '' }, 'assistant', block.text ?? '')
      } else if (block.type === 'thinking') {
        emit(
          SPAN_EVENTS.assistantThinking,
          { thinking: block.thinking ?? '' },
          'assistant',
          block.thinking ?? '',
          { isThinking: true },
        )
      } else if (block.type === 'tool_use' && block.id && block.name) {
        const span = tracer.startSpan(
          SPAN_NAMES.toolCall,
          {
            kind: SpanKind.INTERNAL,
            attributes: {
              [SPAN_ATTRS.genAiToolName]: block.name,
              [SPAN_ATTRS.toolUseId]: block.id,
              [SPAN_ATTRS.toolInput]: safeJson(block.input),
            },
          },
          runCtx,
        )
        toolSpans.set(block.id, span)
        emit('tool.use', { tool_name: block.name, tool_use_id: block.id }, 'tool', '', {
          toolName: block.name,
          toolInput: block.input,
        })
      }
    }
    return
  }

  if (m.type === 'user') {
    const rawContent = m.message?.content
    if (typeof rawContent === 'string' && rawContent.length > 0) {
      emit(SPAN_EVENTS.userMessage, { text: rawContent }, 'user', rawContent)
      return
    }
    const content = Array.isArray(rawContent) ? rawContent : []
    for (const block of content) {
      if (block.type === 'text' && typeof block.text === 'string') {
        emit(SPAN_EVENTS.userMessage, { text: block.text }, 'user', block.text)
      } else if (block.type === 'tool_result' && block.tool_use_id) {
        const span = toolSpans.get(block.tool_use_id)
        if (span) {
          span.setAttribute(SPAN_ATTRS.toolOutput, safeJson(block.content))
          span.setAttribute(SPAN_ATTRS.toolIsError, !!block.is_error)
          if (block.is_error) {
            span.setStatus({ code: SpanStatusCode.ERROR })
          }
          span.end()
          toolSpans.delete(block.tool_use_id)
        }
      }
    }
    return
  }

  if (m.type === 'tool_progress') {
    runSpan.addEvent(SPAN_EVENTS.toolProgress, {
      tool_name: m.tool_name ?? '',
    })
  }
}
