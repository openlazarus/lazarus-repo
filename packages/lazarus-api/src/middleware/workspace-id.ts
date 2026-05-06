import type { Request, Response, NextFunction } from 'express'
import { BadRequestError } from '@errors/api-errors'

function readWorkspaceIdHeader(req: Request): string | undefined {
  const raw = req.headers['x-workspace-id']
  if (raw == null) return undefined
  const value = Array.isArray(raw) ? raw[0] : raw
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

/**
 * Reads `x-workspace-id` and sets `req.workspaceId` when present.
 * Does not fail when the header is missing.
 */
export function extractWorkspaceId() {
  return (req: Request, _res: Response, next: NextFunction) => {
    const workspaceId = readWorkspaceIdHeader(req)
    if (workspaceId) {
      req.workspaceId = workspaceId
    }
    next()
  }
}

/**
 * Requires `x-workspace-id` and sets `req.workspaceId`.
 * Throws BadRequestError when the header is missing.
 */
export function requireWorkspaceId() {
  return (req: Request, _res: Response, next: NextFunction) => {
    const workspaceId = readWorkspaceIdHeader(req)
    if (!workspaceId) {
      throw new BadRequestError('Missing x-workspace-id')
    }
    req.workspaceId = workspaceId
    next()
  }
}
