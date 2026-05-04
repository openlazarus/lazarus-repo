import { Request, Response, NextFunction } from 'express'
import { ApiError } from '@errors/api-errors'
import { createLogger } from '@utils/logger'

const log = createLogger('error-handler')

/**
 * Centralized error handler middleware
 * Handles custom ApiError instances and generic errors
 */
export function errorHandler(error: Error, _req: Request, res: Response, next: NextFunction): void {
  // If response already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(error)
  }

  // Handle custom API errors
  if (error instanceof ApiError) {
    res.status(error.statusCode).json(error.toJSON())
    return
  }

  // Handle ENOENT (file not found)
  if ('code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
    res.status(404).json({
      error: 'File or directory not found',
      type: 'NotFoundError',
    })
    return
  }

  // Handle EACCES (permission denied)
  if ('code' in error && (error as NodeJS.ErrnoException).code === 'EACCES') {
    res.status(403).json({
      error: 'Permission denied',
      type: 'ForbiddenError',
    })
    return
  }

  // Handle generic errors
  log.error({ err: error }, 'Unhandled error')
  res.status(500).json({
    error: 'Internal server error',
    type: 'InternalServerError',
    ...(process.env.NODE_ENV === 'development' && { message: error.message }),
  })
}

/**
 * Async error wrapper for route handlers
 * Catches async errors and passes them to the error handler middleware
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void | Response>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
