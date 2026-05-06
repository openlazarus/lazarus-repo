import { Request, Response } from 'express'
import { workspaceApiKeyService } from '@domains/workspace/service/workspace-api-keys.service'
import { v0EnvSyncService } from '@domains/v0/service/v0-env-sync.service'
import { BadRequestError, NotFoundError } from '@errors/api-errors'
import { createLogger } from '@utils/logger'

const log = createLogger('workspace-api-keys-controller')

class WorkspaceApiKeysController {
  async listAll(req: Request, res: Response) {
    const userId = req.user!.id

    const keys = await workspaceApiKeyService.listAllApiKeysForUser(userId)

    return res.json({
      success: true,
      keys,
    })
  }

  async create(req: Request, res: Response) {
    const serverId = req.workspaceId!
    const userId = req.user!.id

    if (!serverId) {
      throw new BadRequestError('Missing required: serverId param')
    }

    const body = req.body

    const apiKey = await workspaceApiKeyService.createApiKey(serverId, userId, {
      name: body.name,
      databases: body.databases,
      operations: body.operations,
      expiresInDays: body.expiresInDays,
    })

    if (body.v0ProjectId) {
      try {
        await v0EnvSyncService.syncApiKeyToV0Project(body.v0ProjectId, serverId, apiKey.key)
      } catch (error) {
        log.error({ err: error }, 'Failed to sync API key to v0 project')
        return res.json({
          success: true,
          apiKey,
          warning:
            'API key created but failed to sync to v0 project. You can manually add it to environment variables.',
          message:
            "API key created successfully. Make sure to copy the key now - you won't be able to see it again!",
        })
      }
    }

    return res.json({
      success: true,
      apiKey,
      message:
        "API key created successfully. Make sure to copy the key now - you won't be able to see it again!",
    })
  }

  async list(req: Request, res: Response) {
    const serverId = req.workspaceId!

    if (!serverId) {
      throw new BadRequestError('Missing required: serverId param')
    }

    const keys = await workspaceApiKeyService.listApiKeys(serverId)

    return res.json({
      success: true,
      keys,
    })
  }

  async get(req: Request, res: Response) {
    const serverId = req.workspaceId!
    const keyId = req.params.keyId!

    if (!serverId) {
      throw new BadRequestError('Missing required: serverId param')
    }

    const key = await workspaceApiKeyService.getApiKey(keyId)

    if (!key) {
      throw new NotFoundError('API key', keyId)
    }

    return res.json({
      success: true,
      key,
    })
  }

  async revoke(req: Request, res: Response) {
    const serverId = req.workspaceId!
    const keyId = req.params.keyId!
    const v0ProjectId = req.query.v0ProjectId as string

    if (!serverId) {
      throw new BadRequestError('Missing required: serverId param')
    }

    const revoked = await workspaceApiKeyService.revokeApiKey(keyId)

    if (!revoked) {
      throw new NotFoundError('API key', keyId)
    }

    if (v0ProjectId) {
      await v0EnvSyncService.removeApiKeyFromV0Project(v0ProjectId)
    }

    return res.json({
      success: true,
      message: 'API key revoked successfully',
    })
  }
}

export const workspaceApiKeysController = new WorkspaceApiKeysController()
