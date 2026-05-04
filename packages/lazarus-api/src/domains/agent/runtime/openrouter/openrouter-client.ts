import { createLogger } from '@utils/logger'
import type { TOrAssistantAggregate, TOrChatRequest, TOrStreamChunk, TOrUsage } from './types'

const log = createLogger('openrouter-client')

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

export class OpenRouterClient {
  constructor(
    private readonly apiKey: string,
    private readonly referer = process.env.OPENROUTER_REFERER ?? 'http://localhost',
    private readonly title = process.env.OPENROUTER_APP_TITLE ?? 'Lazarus',
  ) {}

  static fromEnv(): OpenRouterClient | null {
    const key = process.env.OPENROUTER_API_KEY
    if (!key) return null
    return new OpenRouterClient(key)
  }

  async *chatStream(
    req: TOrChatRequest,
    signal?: AbortSignal,
  ): AsyncGenerator<TOrStreamChunk, void, void> {
    const body = JSON.stringify({ ...req, stream: true, usage: { include: true } })
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': this.referer,
        'X-Title': this.title,
      },
      body,
      signal,
    })

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '')
      throw new Error(`OpenRouter HTTP ${res.status}: ${text}`)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let idx: number
        while ((idx = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, idx).trim()
          buffer = buffer.slice(idx + 1)
          if (!line || line.startsWith(':')) continue
          if (!line.startsWith('data:')) continue
          const data = line.slice(5).trim()
          if (data === '[DONE]') return
          try {
            yield JSON.parse(data) as TOrStreamChunk
          } catch (err) {
            log.warn({ err, data }, 'failed to parse OpenRouter SSE chunk')
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  async collectAssistant(
    req: TOrChatRequest,
    signal?: AbortSignal,
  ): Promise<TOrAssistantAggregate> {
    const agg: TOrAssistantAggregate = {
      id: '',
      text: '',
      toolCalls: [],
      finishReason: null,
      usage: null,
    }
    const toolBuf = new Map<number, { id: string; name: string; arguments: string }>()

    for await (const chunk of this.chatStream(req, signal)) {
      if (chunk.id) agg.id = chunk.id
      if (chunk.usage) agg.usage = chunk.usage
      const choice = chunk.choices?.[0]
      if (!choice) continue
      const delta = choice.delta ?? {}
      if (typeof delta.content === 'string') agg.text += delta.content
      if (Array.isArray(delta.tool_calls)) {
        for (const tc of delta.tool_calls) {
          const cur = toolBuf.get(tc.index) ?? { id: '', name: '', arguments: '' }
          if (tc.id) cur.id = tc.id
          if (tc.function?.name) cur.name = tc.function.name
          if (tc.function?.arguments) cur.arguments += tc.function.arguments
          toolBuf.set(tc.index, cur)
        }
      }
      if (choice.finish_reason) agg.finishReason = choice.finish_reason
    }

    agg.toolCalls = [...toolBuf.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, v]) => v)
      .filter((c) => c.id && c.name)

    return agg
  }
}

export function sumUsage(a: TOrUsage | null, b: TOrUsage | null): TOrUsage {
  return {
    prompt_tokens: (a?.prompt_tokens ?? 0) + (b?.prompt_tokens ?? 0),
    completion_tokens: (a?.completion_tokens ?? 0) + (b?.completion_tokens ?? 0),
    total_tokens: (a?.total_tokens ?? 0) + (b?.total_tokens ?? 0),
    cost: (a?.cost ?? 0) + (b?.cost ?? 0),
    prompt_tokens_details: {
      cached_tokens:
        (a?.prompt_tokens_details?.cached_tokens ?? 0) +
        (b?.prompt_tokens_details?.cached_tokens ?? 0),
    },
  }
}
