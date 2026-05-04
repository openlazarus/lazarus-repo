import type { SDKMessage, SDKUserMessage } from '@anthropic-ai/claude-agent-sdk'
import { createLogger } from '@utils/logger'
import type { TAgentRunRequest } from '../agent-runtime.types'
import type { OpenRouterClient } from './openrouter-client'
import { sumUsage } from './openrouter-client'
import type { HookRunner } from './hook-runner'
import type { McpClientManager } from './mcp-client-manager'
import {
  makeEmitCtx,
  sdkAssistantMessage,
  sdkResult,
  sdkSystemInit,
  sdkUserToolResults,
} from './sdk-message-emitter'
import { loadSkills, renderSkillsBlock } from './skills-loader'
import type { ToolRegistry } from './tool-registry'
import type { TOrMessage, TOrUsage } from './types'

const log = createLogger('openrouter-agent-loop')

const DEFAULT_MODEL = 'anthropic/claude-sonnet-4.5'
const DEFAULT_MAX_TURNS = 25

const MODEL_ALIAS: Record<string, string> = {
  'claude-sonnet-4-5': 'anthropic/claude-sonnet-4.5',
  'claude-sonnet-4-5-20250929': 'anthropic/claude-sonnet-4.5',
  'claude-opus-4-5': 'anthropic/claude-opus-4.5',
  'claude-haiku-4-5': 'anthropic/claude-haiku-4.5',
  sonnet: 'anthropic/claude-sonnet-4.5',
  opus: 'anthropic/claude-opus-4.5',
  haiku: 'anthropic/claude-haiku-4.5',
}

function mapModel(id: string | undefined): string {
  if (!id) return DEFAULT_MODEL
  return MODEL_ALIAS[id] ?? id
}

function extractSystemPrompt(sp: unknown): string {
  if (typeof sp === 'string') return sp
  if (sp && typeof sp === 'object') {
    const obj = sp as { append?: string }
    return obj.append ?? ''
  }
  return ''
}

async function normalizePrompt(
  prompt: string | AsyncIterable<SDKUserMessage>,
): Promise<TOrMessage[]> {
  if (typeof prompt === 'string') {
    return [{ role: 'user', content: prompt }]
  }
  const out: TOrMessage[] = []
  for await (const msg of prompt) {
    const raw = (msg as { message?: { content?: unknown } }).message?.content
    if (typeof raw === 'string') {
      out.push({ role: 'user', content: raw })
    } else if (Array.isArray(raw)) {
      const text = raw
        .map((b: { type: string; text?: string }) => (b.type === 'text' ? (b.text ?? '') : ''))
        .join('\n')
      if (text) out.push({ role: 'user', content: text })
    }
  }
  return out
}

function safeParseJson(arg: string): Record<string, unknown> {
  if (!arg) return {}
  try {
    const parsed = JSON.parse(arg)
    return typeof parsed === 'object' && parsed ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

export interface TRunLoopDeps {
  client: OpenRouterClient
  registry: ToolRegistry
  hookRunner: HookRunner
  mcpManager: McpClientManager
  mcpStatuses: Array<{ name: string; status: string }>
}

export async function* runAgentLoop(
  request: TAgentRunRequest,
  deps: TRunLoopDeps,
): AsyncGenerator<SDKMessage, void, void> {
  const opts = request.options
  const model = mapModel(opts.model)
  const maxTurns = opts.maxTurns ?? DEFAULT_MAX_TURNS
  const signal = opts.abortController?.signal ?? new AbortController().signal
  const emitCtx = makeEmitCtx(model, opts.sessionId ?? request.context?.sessionId ?? undefined)

  const skills = await loadSkills(opts.cwd)
  const skillsBlock = renderSkillsBlock(skills)
  const basePrompt = extractSystemPrompt(opts.systemPrompt)
  const systemPrompt = [skillsBlock, basePrompt].filter(Boolean).join('\n\n')

  const history: TOrMessage[] = []
  if (systemPrompt) history.push({ role: 'system', content: systemPrompt })
  history.push(...(await normalizePrompt(request.prompt)))

  yield sdkSystemInit(emitCtx, {
    tools: deps.registry.names(),
    mcpServers: deps.mcpStatuses,
    skills: skills.map((s) => s.name),
    permissionMode: opts.permissionMode as string | undefined,
    cwd: opts.cwd,
  })

  const tools = deps.registry.toOpenAiTools()
  let usageTotal: TOrUsage | null = null
  const startTs = Date.now()
  let apiMsAccum = 0
  let resultText = ''
  let turns = 0
  let finalSubtype: 'success' | 'error_max_turns' | 'error_during_execution' = 'success'
  let finalErrors: string[] | undefined

  try {
    for (turns = 0; turns < maxTurns; turns++) {
      const apiStart = Date.now()
      const assistant = await deps.client.collectAssistant(
        {
          model,
          messages: history,
          tools: tools.length ? tools : undefined,
          tool_choice: tools.length ? 'auto' : undefined,
          temperature: (opts as { temperature?: number }).temperature,
          max_tokens: (opts as { maxTokens?: number }).maxTokens,
        },
        signal,
      )
      apiMsAccum += Date.now() - apiStart
      usageTotal = sumUsage(usageTotal, assistant.usage)

      const sdkBlocks: Array<
        | { type: 'text'; text: string }
        | { type: 'tool_use'; id: string; name: string; input: unknown }
      > = []
      if (assistant.text) sdkBlocks.push({ type: 'text', text: assistant.text })
      for (const call of assistant.toolCalls) {
        sdkBlocks.push({
          type: 'tool_use',
          id: call.id,
          name: call.name,
          input: safeParseJson(call.arguments),
        })
      }
      yield sdkAssistantMessage(emitCtx, sdkBlocks, assistant.usage)

      history.push({
        role: 'assistant',
        content: assistant.text || null,
        tool_calls: assistant.toolCalls.length
          ? assistant.toolCalls.map((c) => ({
              id: c.id,
              type: 'function',
              function: { name: c.name, arguments: c.arguments || '{}' },
            }))
          : undefined,
      })

      if (assistant.toolCalls.length === 0) {
        resultText = assistant.text
        finalSubtype = 'success'
        return
      }

      const toolResults: Array<{ tool_use_id: string; content: string; is_error?: boolean }> = []
      for (const call of assistant.toolCalls) {
        const input = safeParseJson(call.arguments)
        const decision = await deps.hookRunner.preToolUse(call.name, input, call.id, signal)
        if (decision.decision === 'deny') {
          const reason = decision.reason ?? 'denied'
          toolResults.push({ tool_use_id: call.id, content: reason, is_error: true })
          history.push({ role: 'tool', tool_call_id: call.id, content: reason })
          continue
        }
        const tool = deps.registry.get(call.name)
        if (!tool) {
          const msg = `unknown tool: ${call.name}`
          toolResults.push({ tool_use_id: call.id, content: msg, is_error: true })
          history.push({ role: 'tool', tool_call_id: call.id, content: msg })
          continue
        }
        try {
          const result = await tool.invoke(input)
          toolResults.push({ tool_use_id: call.id, content: result })
          history.push({ role: 'tool', tool_call_id: call.id, content: result })
        } catch (err) {
          const msg = (err as Error).message ?? String(err)
          toolResults.push({ tool_use_id: call.id, content: msg, is_error: true })
          history.push({ role: 'tool', tool_call_id: call.id, content: msg })
        }
      }
      yield sdkUserToolResults(emitCtx, toolResults)
    }

    finalSubtype = 'error_max_turns'
  } catch (err) {
    log.error({ err }, 'agent loop error')
    finalSubtype = 'error_during_execution'
    finalErrors = [(err as Error).message ?? String(err)]
  }

  yield sdkResult(emitCtx, {
    subtype: finalSubtype,
    durationMs: Date.now() - startTs,
    durationApiMs: apiMsAccum,
    numTurns: turns,
    usage: usageTotal,
    resultText,
    errors: finalErrors,
  })
}
