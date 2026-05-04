import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import { UnauthorizedError } from '@errors/api-errors'
import { createLogger } from '@utils/logger'

const log = createLogger('slack-signature')

const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET

/**
 * Verify Slack request signature (Events API, slash commands, interactivity).
 */
export function verifySlackRequest(req: Request): boolean {
  if (!SLACK_SIGNING_SECRET) {
    log.warn('No SLACK_SIGNING_SECRET configured')
    return false
  }

  const slackSignature = req.headers['x-slack-signature'] as string
  const timestamp = req.headers['x-slack-request-timestamp'] as string

  if (!slackSignature || !timestamp) {
    log.warn(
      { hasSignature: Boolean(slackSignature), hasTimestamp: Boolean(timestamp) },
      'Missing signature or timestamp headers',
    )
    return false
  }

  const currentTime = Math.floor(Date.now() / 1000)
  if (Math.abs(currentTime - parseInt(timestamp)) > 300) {
    log.warn(
      { skewSeconds: Math.abs(currentTime - parseInt(timestamp, 10)) },
      'Request timestamp too old',
    )
    return false
  }

  const rawBody = (req as Request & { rawBody?: string }).rawBody
  if (!rawBody) {
    log.warn('No raw body available for signature verification')
    return false
  }

  const sigBaseString = `v0:${timestamp}:${rawBody}`

  const mySignature =
    'v0=' + crypto.createHmac('sha256', SLACK_SIGNING_SECRET).update(sigBaseString).digest('hex')

  try {
    return crypto.timingSafeEqual(Buffer.from(mySignature), Buffer.from(slackSignature))
  } catch (error) {
    log.warn({ err: error }, 'Signature comparison failed')
    return false
  }
}

export function verifySlackSignature() {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!verifySlackRequest(req)) {
      throw new UnauthorizedError('Invalid Slack signature')
    }
    next()
  }
}

/**
 * Events API: allow unsigned body for URL verification handshake only.
 */
export function verifySlackEventsSignature() {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (req.body?.type === 'url_verification') {
      return next()
    }
    if (!verifySlackRequest(req)) {
      log.warn('Invalid signature')
      throw new UnauthorizedError('Invalid Slack signature')
    }
    next()
  }
}
