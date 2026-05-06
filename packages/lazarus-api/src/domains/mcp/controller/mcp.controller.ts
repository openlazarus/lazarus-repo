import { Request, Response } from 'express'
import { EnhancedMCPConfigManager } from '@infrastructure/config/mcp-enhanced'
import {
  getPendingState,
  removePendingState,
  exchangeCodeForTokens,
} from '@domains/mcp/service/mcp-oauth-direct.service'
import { mcpOAuthService } from '@domains/mcp/service/mcp-oauth.service'
import { NotFoundError, BadRequestError } from '@errors/api-errors'
import { createLogger } from '@utils/logger'
const log = createLogger('mcp')

const mpcManager = new EnhancedMCPConfigManager()
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

class McpController {
  async listServers(req: Request, res: Response) {
    const { search, category, status } = req.query
    const servers = await mpcManager.listServers({
      search: search as string,
      category: category as string,
      status: status as 'enabled' | 'disabled',
    })
    res.json(servers)
  }

  async enableServer(req: Request, res: Response) {
    const serverName = req.params.serverName!
    const success = await mpcManager.enableServer(serverName)
    if (!success) {
      throw new NotFoundError('Server', serverName)
    }
    res.json({ status: 'success', message: `Server '${serverName}' enabled` })
  }

  async disableServer(req: Request, res: Response) {
    const serverName = req.params.serverName!
    const success = await mpcManager.disableServer(serverName)
    if (!success) {
      throw new NotFoundError('Server', serverName)
    }
    res.json({ status: 'success', message: `Server '${serverName}' disabled` })
  }

  async addServer(req: Request, res: Response) {
    const serverName = req.params.serverName!
    const serverConfig = req.body
    const success = await mpcManager.addServer(serverName, serverConfig)
    if (!success) {
      throw new BadRequestError('Failed to add server')
    }
    res.json({ status: 'success', message: `Server '${serverName}' added` })
  }

  async removeServer(req: Request, res: Response) {
    const serverName = req.params.serverName!
    const success = await mpcManager.removeServer(serverName)
    if (!success) {
      throw new NotFoundError('Server', serverName)
    }
    res.json({ status: 'success', message: `Server '${serverName}' removed` })
  }

  async updateServerEnv(req: Request, res: Response) {
    const serverName = req.params.serverName!
    const { env } = req.body
    const success = await mpcManager.updateServerEnv(serverName, env)
    if (!success) {
      throw new NotFoundError('Server', serverName)
    }
    res.json({ status: 'success', message: `Environment variables updated for '${serverName}'` })
  }

  async getConfig(req: Request, res: Response) {
    const maskSensitive = req.query.maskSensitive !== 'false'
    const config = await mpcManager.getEnabledServers(maskSensitive)
    res.json(config)
  }

  async getPresets(_req: Request, res: Response) {
    const presetsRecord = mpcManager.getPresets()
    const presets = Object.entries(presetsRecord)
      .map(([id, preset]) => ({ ...preset, id }))
      .sort((a, b) => a.name.localeCompare(b.name))
    res.json({ presets })
  }

  async getCategories(_req: Request, res: Response) {
    const categories = mpcManager.getCategories()
    res.json(categories)
  }

  async validateServer(req: Request, res: Response) {
    const serverConfig = req.body
    const validation = mpcManager.validateServerConfig(serverConfig)
    res.json(validation)
  }

  async getServerStatus(req: Request, res: Response) {
    const serverName = req.params.serverName!
    const testConnection = req.query.testConnection === 'true'
    const status = await mpcManager.checkServerStatus(serverName)

    if (testConnection && status.ready) {
      const connectionResult = await mpcManager.testServerConnection(serverName)
      res.json({ ...status, connection: connectionResult })
    } else {
      res.json(status)
    }
  }

  async testConnection(req: Request, res: Response) {
    const serverName = req.params.serverName!
    const result = await mpcManager.testServerConnection(serverName)
    res.json(result)
  }

  async addFromPreset(req: Request, res: Response) {
    const { presetId, envValues, customName } = req.body
    const result = await mpcManager.addServerFromPreset(presetId, envValues, customName)

    if (!result.success) {
      throw new BadRequestError(result.error || 'Failed to add server from preset')
    }
    res.json({ status: 'success', message: `Server added from preset '${presetId}'` })
  }

  async oauthCallback(req: Request, res: Response) {
    const { code, state, error, error_description } = req.query

    if (error) {
      const desc = (error_description || error) as string
      return res.redirect(
        `${FRONTEND_URL}/oauth/callback?status=error&message=${encodeURIComponent(desc)}`,
      )
    }

    if (!state || typeof state !== 'string') {
      return res.redirect(
        `${FRONTEND_URL}/oauth/callback?status=error&message=${encodeURIComponent('Missing state parameter. This link may have expired.')}`,
      )
    }

    if (!code || typeof code !== 'string') {
      return res.redirect(
        `${FRONTEND_URL}/oauth/callback?status=error&message=${encodeURIComponent('Missing authorization code.')}`,
      )
    }

    const pendingState = getPendingState(state)
    if (!pendingState) {
      return res.redirect(
        `${FRONTEND_URL}/oauth/callback?status=error&message=${encodeURIComponent('Authorization session expired. Please try again from the dashboard.')}`,
      )
    }

    try {
      await exchangeCodeForTokens(pendingState, code)
      await mcpOAuthService.markAuthorized(pendingState.workspacePath, pendingState.serverName)
      removePendingState(state)

      return res.redirect(
        `${FRONTEND_URL}/oauth/callback?status=success&server=${encodeURIComponent(pendingState.serverName)}`,
      )
    } catch (err) {
      log.error({ err: err }, 'Token exchange error')

      await mcpOAuthService.updateServerOAuthState(
        pendingState.workspacePath,
        pendingState.serverName,
        {
          status: 'error',
          error: err instanceof Error ? err.message : 'Token exchange failed',
        },
      )

      removePendingState(state)

      return res.redirect(
        `${FRONTEND_URL}/oauth/callback?status=error&server=${encodeURIComponent(pendingState.serverName)}&message=${encodeURIComponent('Failed to complete authorization. Please try again.')}`,
      )
    }
  }
}

export const mcpController = new McpController()
