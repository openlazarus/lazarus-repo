import { getRedis } from '@infrastructure/redis/redis.client'
import { createLogger } from '@utils/logger'

const log = createLogger('usage-reporter')
const USAGE_STREAM_KEY = 'usage:events'

export type UsageEventType = 'llm_tokens' | 'tool_call' | 'message'

export type UsageEventInput = {
  workspaceId: string
  type: UsageEventType
  value: number
  inputTokens?: number
  outputTokens?: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
  platformSource?: string
}

export const reportUsage = (event: UsageEventInput): void => {
  const redis = getRedis()
  if (!redis || event.value <= 0) return

  const fields: string[] = [
    'workspaceId',
    event.workspaceId,
    'type',
    event.type,
    'value',
    String(event.value),
    'timestamp',
    new Date().toISOString(),
  ]
  if (event.inputTokens !== undefined) fields.push('inputTokens', String(event.inputTokens))
  if (event.outputTokens !== undefined) fields.push('outputTokens', String(event.outputTokens))
  if (event.cacheReadTokens !== undefined)
    fields.push('cacheReadTokens', String(event.cacheReadTokens))
  if (event.cacheWriteTokens !== undefined)
    fields.push('cacheWriteTokens', String(event.cacheWriteTokens))
  if (event.platformSource) fields.push('platformSource', event.platformSource)

  redis
    .xadd(USAGE_STREAM_KEY, '*', ...fields)
    .catch((err) => log.warn({ err, event }, 'Failed to report usage event'))
}
