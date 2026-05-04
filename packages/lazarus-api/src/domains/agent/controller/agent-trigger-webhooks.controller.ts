import { Request, Response } from 'express'
import * as crypto from 'crypto'
import * as path from 'path'
import * as fs from 'fs/promises'
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  UnauthorizedError,
} from '@errors/api-errors'
import { createLogger } from '@utils/logger'
import { AgentTriggerManager } from '@domains/agent/service/triggers/trigger-manager'
import { executionQueue } from '@domains/execution/service/execution-queue'

const logger = createLogger('agent-trigger-webhooks')

const STORAGE_BASE = process.env.STORAGE_BASE || '/mnt/sdc/storage'
const triggerManager = new AgentTriggerManager()

const recentWebhooks = new Map<string, number>()
const DEDUP_WINDOW_MS = 30_000

function buildDedupKey(workspaceId: string, agentId: string, triggerId: string, body: any): string {
  const stableId =
    body?.data?.id ||
    body?.issue?.id ||
    body?.pull_request?.id ||
    body?.id ||
    body?.event_id ||
    null
  if (stableId) {
    return `${workspaceId}:${agentId}:${triggerId}:${stableId}`
  }
  const hash = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex').slice(0, 16)
  return `${workspaceId}:${agentId}:${triggerId}:${hash}`
}

function pruneExpiredDedup(): void {
  const now = Date.now()
  for (const [key, expiry] of recentWebhooks) {
    if (now >= expiry) recentWebhooks.delete(key)
  }
}

function verifySignature(secret: string, rawBody: string, signatureHeader: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')

  const provided = signatureHeader.startsWith('sha256=')
    ? signatureHeader.slice(7)
    : signatureHeader

  if (provided.length !== expected.length) return false

  return crypto.timingSafeEqual(Buffer.from(provided, 'hex'), Buffer.from(expected, 'hex'))
}

async function loadTriggerFromDisk(
  workspaceId: string,
  agentId: string,
  triggerId: string,
): Promise<any> {
  const triggerPath = path.join(
    STORAGE_BASE,
    'workspaces',
    workspaceId,
    '.agents',
    agentId,
    'triggers',
    `${triggerId}.json`,
  )

  try {
    const content = await fs.readFile(triggerPath, 'utf-8')
    return JSON.parse(content)
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      throw new NotFoundError('Trigger', triggerId)
    }
    throw err
  }
}

function validateTrigger(triggerData: any, triggerId: string): void {
  if (triggerData.type !== 'webhook') {
    throw new BadRequestError(
      'Invalid trigger type',
      `Trigger "${triggerId}" is type "${triggerData.type}", not "webhook"`,
    )
  }

  if (!triggerData.enabled) {
    throw new ForbiddenError('Trigger disabled', `Trigger "${triggerId}" is currently disabled`)
  }
}

function verifyRequestSignature(triggerData: any, req: Request): void {
  const secret = triggerData.config?.secret
  if (!secret) return

  const headerName = (triggerData.config?.signatureHeader || 'x-webhook-signature').toLowerCase()
  const signatureHeader = req.headers[headerName] as string | undefined
  if (!signatureHeader) {
    throw new UnauthorizedError(
      'Missing signature',
      `"${headerName}" header is required when trigger has a secret configured`,
    )
  }

  const rawBody = (req as Request & { rawBody?: string }).rawBody
  if (!rawBody) {
    throw new BadRequestError(
      'Raw body unavailable',
      'Could not read raw request body for signature verification',
    )
  }

  if (!verifySignature(secret, rawBody, signatureHeader)) {
    throw new UnauthorizedError('Invalid signature', 'HMAC-SHA256 signature verification failed')
  }
}

function buildFullTrigger(triggerData: any, workspaceId: string, agentId: string) {
  return {
    ...triggerData,
    agentId,
    workspaceId,
    userId: triggerData.userId,
    name: triggerData.name || 'Webhook trigger',
  }
}

function buildPayload(body: any) {
  return {
    source: 'webhook',
    event: body?.event || 'webhook_received',
    body: body || {},
    receivedAt: new Date().toISOString(),
  }
}

class AgentTriggerWebhooksController {
  async handleWebhook(req: Request, res: Response) {
    const workspaceId = req.workspaceId!
    const agentId = req.params.agentId!
    const triggerId = req.params.triggerId!

    logger.info({ workspaceId, agentId, triggerId, body: req.body }, 'Webhook trigger received')

    const triggerData = await loadTriggerFromDisk(workspaceId, agentId, triggerId)
    validateTrigger(triggerData, triggerId)
    verifyRequestSignature(triggerData, req)

    pruneExpiredDedup()
    const dedupKey = buildDedupKey(workspaceId, agentId, triggerId, req.body)

    if (recentWebhooks.has(dedupKey)) {
      logger.info({ workspaceId, agentId, triggerId, dedupKey }, 'Duplicate webhook suppressed')
      res.json({ ok: true, deduplicated: true })
      return
    }

    recentWebhooks.set(dedupKey, Date.now() + DEDUP_WINDOW_MS)

    if (!executionQueue.canAccept(agentId)) {
      const stats = executionQueue.getStats()
      logger.warn({ workspaceId, agentId, triggerId, ...stats }, 'Queue full, returning 503')
      res.status(503).json({ ok: false, error: 'Queue full', retryAfter: 30 })
      return
    }

    const fullTrigger = buildFullTrigger(triggerData, workspaceId, agentId)
    const payload = buildPayload(req.body)

    logger.info({ triggerId, agentId, workspaceId }, 'Accepting webhook, executing in background')
    res.json({ ok: true, accepted: true })

    triggerManager
      .executeAgentTrigger(fullTrigger, payload, undefined)
      .then((execution) => {
        if (execution.status === 'failed') {
          logger.warn(
            { triggerId, executionId: execution.id, error: execution.error },
            'Background webhook execution failed',
          )
        } else {
          logger.info(
            { triggerId, executionId: execution.id },
            'Background webhook execution completed',
          )
        }
      })
      .catch((err) => {
        logger.error({ triggerId, agentId, workspaceId, err }, 'Background webhook execution threw')
      })
  }
}

export const agentTriggerWebhooksController = new AgentTriggerWebhooksController()
