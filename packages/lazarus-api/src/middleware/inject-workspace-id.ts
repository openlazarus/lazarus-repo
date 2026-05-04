import { Request, Response, NextFunction } from 'express'

export const injectWorkspaceId = (req: Request, _res: Response, next: NextFunction): void => {
  if (process.env.WORKSPACE_ID) req.workspaceId = process.env.WORKSPACE_ID
  next()
}
