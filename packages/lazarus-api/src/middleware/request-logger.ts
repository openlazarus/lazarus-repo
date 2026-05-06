import { Request } from 'express'
import pinoHttp from 'pino-http'
import logger from '@utils/logger'

/**
 * HTTP request logging with user and workspace context when present.
 */
export function requestLogger() {
  return pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => (req as Request).url === '/health',
    },
    customProps: (req) => {
      const r = req as Request
      const props: Record<string, unknown> = {}
      if (r.user) {
        props.userId = r.user.id
        props.userEmail = r.user.email
      }
      if (r.workspace) {
        props.workspaceId = r.workspace.id
      }
      return props
    },
  })
}
