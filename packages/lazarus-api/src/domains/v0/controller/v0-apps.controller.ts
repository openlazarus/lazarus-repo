import { Request, Response } from 'express'
import { v0AppsService } from '@domains/v0/service/v0-apps.service'
import { v0TokenService } from '@domains/v0/service/v0-token.service'
import { BadRequestError, NotFoundError } from '@errors/api-errors'

class V0AppsController {
  async setupDeployment(req: Request, res: Response) {
    const serverId = req.workspaceId!
    const userId = req.user!.id

    if (!serverId) {
      throw new BadRequestError('Missing required: serverId param')
    }

    const body = req.body

    const app = await v0AppsService.setupDeployment(userId, serverId, body.appId, {
      deploymentUrl: body.deploymentUrl,
      projectId: body.projectId,
      deploymentPlatform: body.deploymentPlatform,
    })

    if (!app) {
      throw new NotFoundError('V0 app')
    }

    return res.json({
      success: true,
      app,
      message: 'Deployment configured successfully. API key synced to V0 project.',
    })
  }

  async regenerateApiKey(req: Request, res: Response) {
    const serverId = req.workspaceId!
    const { appId } = req.body
    const userId = req.user!.id

    if (!serverId) {
      throw new BadRequestError('Missing required: serverId param')
    }

    const app = await v0AppsService.regenerateApiKey(userId, serverId, appId)

    if (!app) {
      throw new NotFoundError('V0 app')
    }

    return res.json({
      success: true,
      app,
      message: 'API key regenerated and synced to V0 project successfully',
    })
  }

  async generateToken(req: Request, res: Response) {
    const serverId = req.workspaceId!
    const { appId } = req.body
    const userId = req.user!.id

    if (!serverId) {
      throw new BadRequestError('Missing required: serverId param')
    }

    const app = await v0AppsService.getApp(userId, serverId, appId)

    if (!app) {
      throw new NotFoundError('V0 app')
    }

    if (!app.deploymentUrl) {
      throw new BadRequestError(
        'App has no deployment URL configured',
        'Please set up deployment first',
      )
    }

    const { token, expiresAt } = v0TokenService.generateToken(userId, serverId, app.projectId ?? '')

    const separator = app.deploymentUrl.includes('?') ? '&' : '?'
    const appUrl = `${app.deploymentUrl}${separator}lazarus_token=${token}`

    return res.json({
      success: true,
      token,
      appUrl,
      expiresAt,
      message: 'Token generated successfully. Valid for 5 minutes.',
    })
  }
}

export const v0AppsController = new V0AppsController()
