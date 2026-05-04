import { SpanKind, SpanStatusCode } from '@opentelemetry/api'
import { getRedis } from '@infrastructure/redis/redis.client'
import { createLogger } from '@utils/logger'
import { getAgentTracer } from '@observability/otel'
import { SPAN_ATTRS, SPAN_NAMES } from '@observability/constants'

const log = createLogger('credits-guard')
const CREDITS_KEY_PREFIX = 'credits:'

export const INSUFFICIENT_CREDITS_MESSAGE =
  'Insufficient credits. Top up to continue using the assistant.'

/**
 * Low-level credits check. Returns true if the workspace is allowed to execute.
 * Fail-open on Redis errors or missing configuration.
 *
 * The instance performs a dumb `> 0` check. The threshold/policy logic (what
 * counts as "insufficient") lives entirely in the orchestrator, which writes
 * `0` to the key when the workspace should be blocked, or the actual remaining
 * credit balance when it should be allowed.
 *
 * Emits a `credits.check` OTel span so every check is observable.
 */
export const checkCredits = async (workspaceId: string, channel = 'unknown'): Promise<boolean> => {
  const span = getAgentTracer().startSpan(SPAN_NAMES.creditsCheck, {
    kind: SpanKind.INTERNAL,
    attributes: {
      [SPAN_ATTRS.workspaceId]: workspaceId,
      [SPAN_ATTRS.creditsChannel]: channel,
    },
  })

  try {
    const allowed = await readCredits(workspaceId)
    span.setAttribute(SPAN_ATTRS.creditsAllowed, allowed)
    if (!allowed) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: 'insufficient_credits' })
      log.info({ workspaceId, channel }, 'Blocked — insufficient credits')
    }
    return allowed
  } finally {
    span.end()
  }
}

/**
 * High-level guard for non-HTTP channels (Slack/Discord/WhatsApp/Email/scheduled).
 * Checks credits; if insufficient, invokes the channel-specific notification
 * (swallowing notification errors so a failed reply doesn't throw upstream).
 *
 * HTTP middleware should NOT use this — it should use `checkCredits` directly
 * and throw `PaymentRequiredError` so the global error handler returns a 402.
 */
export const creditsGuard = async (
  workspaceId: string,
  onInsufficient: () => Promise<void>,
  channel = 'unknown',
): Promise<{ allowed: boolean }> => {
  const allowed = await checkCredits(workspaceId, channel)
  if (allowed) return { allowed: true }

  try {
    await onInsufficient()
  } catch (err) {
    log.warn({ err, workspaceId, channel }, 'Failed to notify user of insufficient credits')
  }
  return { allowed: false }
}

const readCredits = async (workspaceId: string): Promise<boolean> => {
  const redis = getRedis()
  if (!redis) return true
  try {
    const raw = await redis.get(`${CREDITS_KEY_PREFIX}${workspaceId}`)
    if (raw === null) return true
    const credits = parseInt(raw, 10)
    return !Number.isFinite(credits) || credits > 0
  } catch (err) {
    log.warn({ err, workspaceId }, 'Credits check failed — fail-open')
    return true
  }
}
