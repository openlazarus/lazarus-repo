import { Request, Response, NextFunction } from 'express'
import { createLogger } from '@utils/logger'

const log = createLogger('internal-only')

const LOCALHOST_ADDRESSES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1'])

/**
 * Middleware that restricts an endpoint to localhost (internal) requests only.
 * Use this for endpoints that should never be called from external clients,
 * such as agent-to-agent triggers and webhook callbacks.
 */
export function requireInternal() {
  return (req: Request, res: Response, next: NextFunction) => {
    const remoteAddr = req.ip || req.socket?.remoteAddress || ''
    if (!LOCALHOST_ADDRESSES.has(remoteAddr)) {
      log.warn(
        { remoteAddr, path: req.path, method: req.method },
        'Blocked external request to internal-only endpoint',
      )
      return res
        .status(403)
        .json({ success: false, error: 'This endpoint is only accessible internally' })
    }
    return next()
  }
}
