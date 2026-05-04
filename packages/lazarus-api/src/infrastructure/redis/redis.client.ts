import IORedis, { type Redis } from 'ioredis'
import { createLogger } from '@utils/logger'

const log = createLogger('redis-client')

let client: Redis | null = null
let attempted = false

export const getRedis = (): Redis | null => {
  if (attempted) return client
  attempted = true

  const url = process.env.ORCHESTRATOR_REDIS_URL
  if (!url) return null

  try {
    client = new IORedis(url, {
      maxRetriesPerRequest: 2,
      connectTimeout: 3000,
      lazyConnect: false,
      enableReadyCheck: true,
    })
    client.on('error', (err) => log.warn({ err: err.message }, 'Redis error'))
    return client
  } catch (err) {
    log.warn({ err }, 'Failed to build Redis client; running without credits/usage')
    return null
  }
}
