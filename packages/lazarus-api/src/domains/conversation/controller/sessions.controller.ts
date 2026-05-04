import { Request, Response } from 'express'
import { sessionManager } from '@domains/conversation/service/session-manager'
import { BadRequestError, NotFoundError } from '@errors/api-errors'

class SessionsController {
  async create(req: Request, res: Response) {
    const body = req.body

    const userId = body.userId || req.user!.id
    const workspaceId = body.workspaceId || req.workspaceId

    if (!workspaceId) {
      throw new BadRequestError(
        'Workspace ID is required. Provide it in the request body or x-workspace-id header.',
      )
    }

    const sessionId = await sessionManager.createSession({
      ...body,
      userId,
      workspaceId,
    })

    const session = await sessionManager.getSession(sessionId, userId, workspaceId)
    res.json({ sessionId, session })
  }

  async list(req: Request, res: Response) {
    const { workspaceId, userId } = req.query

    const effectiveUserId = (userId || req.user!.id) as string
    const effectiveWorkspaceId = (workspaceId || req.workspaceId) as string

    let sessions: Awaited<ReturnType<typeof sessionManager.listWorkspaceSessions>> = []
    if (effectiveWorkspaceId) {
      sessions = await sessionManager.listWorkspaceSessions(effectiveWorkspaceId, effectiveUserId)
    } else if (effectiveUserId) {
      sessions = await sessionManager.listUserSessions(effectiveUserId, effectiveWorkspaceId)
    } else {
      sessions = []
    }

    res.json({ sessions })
  }

  async get(req: Request, res: Response) {
    const sessionId = req.params.sessionId!
    const userId = req.user!.id
    const workspaceId = req.workspaceId as string

    const session = await sessionManager.getSession(sessionId, userId, workspaceId)

    if (!session) {
      throw new NotFoundError('Session', sessionId)
    }

    res.json({ session })
  }

  async update(req: Request, res: Response) {
    const sessionId = req.params.sessionId!
    const updates = req.body
    const userId = req.user!.id
    const workspaceId = req.workspaceId as string

    await sessionManager.updateSessionMetadata(sessionId, updates)

    const session = await sessionManager.getSession(sessionId, userId, workspaceId)

    res.json({ session })
  }

  async appendMessage(req: Request, res: Response) {
    const sessionId = req.params.sessionId!
    const message = req.body
    const userId = req.user!.id
    const workspaceId = req.workspaceId as string

    await sessionManager.appendMessage(
      sessionId,
      {
        ...message,
        timestamp: new Date().toISOString(),
      },
      userId,
      workspaceId,
    )

    res.json({ success: true })
  }

  async getTranscript(req: Request, res: Response) {
    const sessionId = req.params.sessionId!
    const userId = req.user!.id
    const workspaceId = req.workspaceId as string

    const transcript = await sessionManager.getTranscript(sessionId, userId, workspaceId)

    res.json({ transcript })
  }

  async complete(req: Request, res: Response) {
    const sessionId = req.params.sessionId!
    const userId = req.user!.id
    const workspaceId = req.workspaceId as string

    await sessionManager.completeSession(sessionId, userId, workspaceId)

    res.json({ success: true })
  }

  async interrupt(req: Request, res: Response) {
    const sessionId = req.params.sessionId!
    const userId = req.user!.id
    const workspaceId = req.workspaceId as string

    await sessionManager.interruptSession(sessionId, userId, workspaceId)

    res.json({ success: true })
  }

  async delete(req: Request, res: Response) {
    const sessionId = req.params.sessionId!
    const userId = req.user!.id
    const workspaceId = req.workspaceId as string

    await sessionManager.deleteSession(sessionId, userId, workspaceId)

    res.json({ success: true })
  }

  async export(req: Request, res: Response) {
    const sessionId = req.params.sessionId!
    const userId = req.user!.id
    const workspaceId = req.workspaceId as string

    const sessionData = await sessionManager.exportSession(sessionId, userId, workspaceId)

    if (!sessionData) {
      throw new NotFoundError('Session', sessionId)
    }

    res.json(sessionData)
  }

  async import(req: Request, res: Response) {
    const sessionId = await sessionManager.importSession(req.body)
    const session = await sessionManager.getSession(sessionId)

    res.json({ sessionId, session })
  }

  async cleanup(req: Request, res: Response) {
    const { daysToKeep = 30 } = req.body
    const deletedCount = await sessionManager.cleanupOldSessions(daysToKeep)

    res.json({ deletedCount })
  }
}

export const sessionsController = new SessionsController()
