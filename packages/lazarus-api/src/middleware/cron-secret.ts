import { Request, Response, NextFunction } from 'express'
import { UnauthorizedError } from '@errors/api-errors'

export function requireCronSecret() {
  return (req: Request, _res: Response, next: NextFunction) => {
    const expectedSecret = process.env.CRON_SECRET
    if (expectedSecret) {
      const cronSecret = req.headers['x-cron-secret'] as string
      if (cronSecret !== expectedSecret) {
        throw new UnauthorizedError('Invalid cron secret')
      }
    }
    next()
  }
}
