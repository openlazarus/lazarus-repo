import type { RequestHandler } from 'express'
import { UnauthorizedError } from '@errors/api-errors'

export const instanceAuth: RequestHandler = (req, _res, next) => {
  const secret = req.headers['x-internal-secret']
  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
    throw new UnauthorizedError('Invalid internal secret')
  }
  next()
}
