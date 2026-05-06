import type { RequestHandler } from 'express'
import { checkCredits, INSUFFICIENT_CREDITS_MESSAGE } from '@shared/services/credits-guard'
import { PaymentRequiredError } from '@errors/api-errors'

export const creditsMiddleware: RequestHandler = async (req, _res, next) => {
  const workspaceId = process.env.WORKSPACE_ID
  if (!workspaceId) return next()

  const allowed = await checkCredits(workspaceId, `http:${req.method} ${req.baseUrl}${req.path}`)
  if (!allowed) {
    throw new PaymentRequiredError('insufficient_credits', INSUFFICIENT_CREDITS_MESSAGE)
  }
  next()
}
