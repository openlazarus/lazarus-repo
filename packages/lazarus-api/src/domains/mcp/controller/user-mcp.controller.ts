import { Request, Response } from 'express'
import { z } from 'zod'
import { mcpConfigManager } from '@domains/mcp/service/mcp-config-manager'
import { WorkspaceManager } from '@domains/workspace/service/workspace-manager'
import {
  ApiError,
  BadRequestError,
  NotFoundError,
  InternalServerError,
  ValidationError,
} from '@errors/api-errors'
import { createLogger } from '@utils/logger'
const log = createLogger('user-mcp')

const workspaceManager = new WorkspaceManager()

class UserMcpController {
  async getTemplates(req: Request, res: Response) {
    try {
      const userId = req.user!.id

      const templates = await mcpConfigManager.getUserMCPTemplates(userId)

      return res.json({ templates })
    } catch (error) {
      log.error({ err: error }, 'Error getting user MCP templates')
      throw new InternalServerError('Failed to get MCP templates')
    }
  }

  async initializeTemplates(req: Request, res: Response) {
    try {
      const userId = req.user!.id

      await mcpConfigManager.initializeUserTemplates(userId)

      return res.json({ success: true })
    } catch (error) {
      log.error({ err: error }, 'Error initializing MCP templates')
      throw new InternalServerError('Failed to initialize MCP templates')
    }
  }

  async addTemplate(req: Request, res: Response) {
    try {
      const userId = req.user!.id
      const templateName = req.params.templateName!

      const config = req.body

      await mcpConfigManager.addUserMCPTemplate(userId, templateName, config)

      return res.json({ success: true })
    } catch (error) {
      if (error instanceof z.ZodError)
        throw new ValidationError('Validation failed', JSON.stringify(error.issues))
      if (error instanceof ApiError) throw error
      log.error({ err: error }, 'Error adding MCP template')
      throw new BadRequestError('Failed to add MCP template')
    }
  }

  async updateAllTemplates(req: Request, res: Response) {
    try {
      const userId = req.user!.id

      const { templates } = req.body

      await mcpConfigManager.saveUserMCPTemplates(userId, templates || {})

      return res.json({ success: true })
    } catch (error) {
      log.error({ err: error }, 'Error updating MCP templates')
      throw new InternalServerError('Failed to update MCP templates')
    }
  }

  async removeTemplate(req: Request, res: Response) {
    try {
      const userId = req.user!.id
      const templateName = req.params.templateName!

      await mcpConfigManager.removeUserMCPTemplate(userId, templateName)

      return res.json({ success: true })
    } catch (error) {
      log.error({ err: error }, 'Error removing MCP template')
      throw new InternalServerError('Failed to remove MCP template')
    }
  }

  async activateTemplate(req: Request, res: Response) {
    try {
      const userId = req.user!.id
      const templateName = req.params.templateName!
      const { workspaceId, serverName } = req.body
      if (!workspaceId) {
        throw new BadRequestError('workspaceId is required')
      }

      const workspace = await workspaceManager.getWorkspace(workspaceId, userId)
      if (!workspace) {
        throw new NotFoundError('Workspace', workspaceId)
      }

      await mcpConfigManager.activateUserTemplateReferenceInWorkspace(
        userId,
        templateName,
        workspace.path,
        {
          serverName,
          enabled: true,
        },
      )

      return res.json({ success: true })
    } catch (error) {
      if (error instanceof ApiError) throw error
      log.error({ err: error }, 'Error activating MCP template')
      throw new BadRequestError(
        error instanceof Error ? error.message : 'Failed to activate MCP template',
      )
    }
  }

  async deactivateTemplate(req: Request, res: Response) {
    try {
      const userId = req.user!.id
      const { workspaceId, serverName } = req.body
      if (!workspaceId || !serverName) {
        throw new BadRequestError('workspaceId and serverName are required')
      }

      const workspace = await workspaceManager.getWorkspace(workspaceId, userId)
      if (!workspace) {
        throw new NotFoundError('Workspace', workspaceId)
      }

      await mcpConfigManager.removeTemplateReference(workspace.path, serverName)

      return res.json({ success: true })
    } catch (error) {
      if (error instanceof ApiError) throw error
      log.error({ err: error }, 'Error deactivating MCP template')
      throw new InternalServerError('Failed to deactivate MCP template')
    }
  }

  async getAvailableTemplates(req: Request, res: Response) {
    try {
      const userId = req.user!.id
      const workspaceId = req.params.workspaceId!
      const workspace = await workspaceManager.getWorkspace(workspaceId, userId)
      if (!workspace) {
        throw new NotFoundError('Workspace', workspaceId)
      }

      const userTemplates = await mcpConfigManager.getUserMCPTemplates(userId)

      const workspaceConfig = await mcpConfigManager.getWorkspaceMCPConfig(workspace.path)
      const templateRefs = Object.keys(workspaceConfig?.templateReferences || {})
      const directServers = Object.keys(workspaceConfig?.mcpServers || {})
      const activatedServers = [...templateRefs, ...directServers]

      const availableTemplates: Record<string, any> = {}
      for (const [templateName, config] of Object.entries(userTemplates)) {
        if (!activatedServers.includes(templateName)) {
          availableTemplates[templateName] = {
            ...config,
            canActivate: true,
          }
        }
      }

      return res.json({
        availableTemplates,
        activatedServers,
        totalTemplates: Object.keys(userTemplates).length,
      })
    } catch (error) {
      if (error instanceof ApiError) throw error
      log.error({ err: error }, 'Error getting available templates')
      throw new InternalServerError('Failed to get available templates')
    }
  }
}

export const userMcpController = new UserMcpController()
