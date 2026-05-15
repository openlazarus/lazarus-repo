import { SpanKind, SpanStatusCode } from '@opentelemetry/api'
import { createLogger } from '@utils/logger'
import { getAgentTracer } from '@observability/otel'
import { SPAN_ATTRS, SPAN_NAMES } from '@observability/constants'

const log = createLogger('credits-guard')
const HTTP_TIMEOUT_MS = 3000

export const INSUFFICIENT_CREDITS_MESSAGE =
  'Insufficient credits. Top up to continue using the assistant.'

/**
 * Returns true if the workspace is allowed to execute. The decision is made by
 * the orchestrator against Supabase truth — this VM has no billing logic.
 * Fail-open on HTTP/network errors so a momentary orchestrator outage doesn't
 * block every workspace.
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
    const allowed = await askOrchestrator(workspaceId)
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

const askOrchestrator = async (workspaceId: string): Promise<boolean> => {
  const url = process.env.ORCHESTRATOR_URL
  if (!url) return true

  const secret = process.env.INTERNAL_API_SECRET
  if (!secret) {
    log.warn({ workspaceId }, 'ORCHESTRATOR_URL set but INTERNAL_API_SECRET missing — fail-open')
    return true
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS)
  try {
    const res = await fetch(`${url}/api/internal/credits/check`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-internal-secret': secret },
      body: JSON.stringify({ workspaceId }),
      signal: controller.signal,
    })
    if (!res.ok) return failOpen(workspaceId, `HTTP ${res.status}`)
    const data = (await res.json()) as { allowed?: boolean }
    return data.allowed ?? true
  } catch (err) {
    return failOpen(workspaceId, err)
  } finally {
    clearTimeout(timer)
  }
}

const failOpen = (workspaceId: string, err: unknown): boolean => {
  log.warn({ workspaceId, err }, 'Credits check failed — fail-open')
  return true
}
