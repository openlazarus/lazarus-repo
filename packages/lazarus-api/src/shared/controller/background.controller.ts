import { Request, Response } from 'express'
import { backgroundProcessManager } from '@background/manager'
import { BadRequestError } from '@errors/api-errors'

class BackgroundController {
  async getHealth(_req: Request, res: Response) {
    const health = backgroundProcessManager.getHealth()
    res.json(health)
  }

  async getStats(_req: Request, res: Response) {
    const stats = backgroundProcessManager.getStats()
    res.json(stats)
  }

  async reloadWorkspace(req: Request, res: Response) {
    const workspaceId = req.params.workspaceId!

    await backgroundProcessManager.reloadWorkspace(workspaceId)

    res.json({
      success: true,
      message: `Workspace ${workspaceId} reloaded successfully`,
    })
  }

  async loadWorkspace(req: Request, res: Response) {
    const workspaceId = req.params.workspaceId!
    const { userId } = req.body

    if (!userId) {
      throw new BadRequestError('Missing required field: userId')
    }

    await backgroundProcessManager.loadWorkspace(workspaceId, userId)

    return res.json({
      success: true,
      message: `Workspace ${workspaceId} loaded successfully`,
    })
  }

  async unloadWorkspace(req: Request, res: Response) {
    const workspaceId = req.params.workspaceId!

    await backgroundProcessManager.unloadWorkspace(workspaceId)

    res.json({
      success: true,
      message: `Workspace ${workspaceId} unloaded successfully`,
    })
  }
}

export const backgroundController = new BackgroundController()
