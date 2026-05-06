import { Request, Response, NextFunction } from 'express'
import { workspaceApiKeyService } from '@domains/workspace/service/workspace-api-keys.service'
import { createLogger } from '@utils/logger'

const log = createLogger('api-key-auth')

/**
 * Rate limiting map: key = API key ID, value = array of request timestamps
 */
const rateLimitMap = new Map<string, number[]>()

/**
 * Rate limit configuration
 */
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100 // 100 requests per minute per key

/**
 * Clean up old rate limit entries every 5 minutes
 */
setInterval(
  () => {
    const now = Date.now()
    for (const [keyId, timestamps] of rateLimitMap.entries()) {
      const recentTimestamps = timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS)
      if (recentTimestamps.length === 0) {
        rateLimitMap.delete(keyId)
      } else {
        rateLimitMap.set(keyId, recentTimestamps)
      }
    }
  },
  5 * 60 * 1000,
)

/**
 * Check if API key has exceeded rate limit
 */
function checkRateLimit(keyId: string, maxRequests: number = RATE_LIMIT_MAX_REQUESTS): boolean {
  const now = Date.now()
  const timestamps = rateLimitMap.get(keyId) || []

  // Filter out old timestamps
  const recentTimestamps = timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS)

  // Check if rate limit exceeded
  if (recentTimestamps.length >= maxRequests) {
    return false // Rate limit exceeded
  }

  // Add current timestamp
  recentTimestamps.push(now)
  rateLimitMap.set(keyId, recentTimestamps)

  return true // Within rate limit
}

/**
 * Middleware to authenticate requests using API keys
 *
 * Expects:
 * - Authorization header with Bearer token: "Bearer lzrs_xxxxx"
 * - Optional: workspace/server ID in URL params
 *
 * Attaches to request:
 * - req.apiKey: The validated API key metadata
 * - req.workspaceContext: Workspace context (serverId)
 */
export async function apiKeyAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Extract Authorization header
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header. Expected: Bearer <api-key>',
      })
      return
    }

    const apiKeyValue = authHeader.substring(7) // Remove 'Bearer '

    // Validate the API key using Supabase
    const apiKey = await workspaceApiKeyService.validateApiKey(apiKeyValue)

    if (!apiKey) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired API key',
      })
      return
    }

    // Check rate limit (use custom rate limit from key or default)
    const rateLimit = apiKey.rateLimit || RATE_LIMIT_MAX_REQUESTS
    if (!checkRateLimit(apiKey.id, rateLimit)) {
      res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Maximum ${rateLimit} requests per minute per API key.`,
      })
      return
    }

    // Check database permissions if database name is in the URL
    const dbName = req.params.dbName
    if (dbName) {
      const hasAccess =
        apiKey.permissions.databases.includes('*') || apiKey.permissions.databases.includes(dbName)

      if (!hasAccess) {
        res.status(403).json({
          error: 'Forbidden',
          message: `API key does not have permission to access database: ${dbName}`,
        })
        return
      }
    }

    // Check operation permissions based on HTTP method
    const method = req.method.toUpperCase()
    let requiredOperation: 'read' | 'write' | 'delete' | null = null

    if (method === 'GET') {
      requiredOperation = 'read'
    } else if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      requiredOperation = 'write'
    } else if (method === 'DELETE') {
      requiredOperation = 'delete'
    }

    if (requiredOperation && !apiKey.permissions.operations.includes(requiredOperation)) {
      res.status(403).json({
        error: 'Forbidden',
        message: `API key does not have '${requiredOperation}' permission`,
      })
      return
    }

    // Attach API key and workspace context to request
    req.apiKey = apiKey
    req.workspaceContext = {
      workspaceId: apiKey.workspaceId || '',
      userId: apiKey.createdBy || '',
      scope: 'team',
    }

    // Proceed to next middleware
    next()
  } catch (error) {
    log.error({ err: error }, 'API key authentication error')
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to authenticate API key',
    })
  }
}
