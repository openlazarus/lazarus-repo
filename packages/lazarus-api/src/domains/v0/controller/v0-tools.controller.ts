import { Request, Response } from 'express'
import { v0 } from 'v0-sdk'
import { BadRequestError } from '@errors/api-errors'
import { createLogger } from '@utils/logger'
const log = createLogger('v0-tools')

class V0ToolsController {
  async getChat(req: Request, res: Response) {
    const { chatId } = req.params

    if (!chatId) {
      throw new BadRequestError('Missing chatId')
    }

    const chat = await v0.chats.getById({ chatId })

    log.info({ data: Object.keys(chat) }, 'Chat API response keys')
    log.info({ data: 'demo' in chat }, 'Has demo field')
    log.info({ data: (chat as any).demo || 'MISSING' }, 'Demo value')

    return res.json({
      success: true,
      chat,
    })
  }

  async getDeployments(req: Request, res: Response) {
    const { projectId, chatId, versionId } = req.query

    if (!projectId || !chatId || !versionId) {
      throw new BadRequestError('Missing required parameters: projectId, chatId, versionId')
    }

    try {
      const deployments = await v0.deployments.find({
        projectId: projectId as string,
        chatId: chatId as string,
        versionId: versionId as string,
      })

      return res.json({
        success: true,
        deployments,
      })
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes('no Vercel project ID') ||
          error.message.includes('vercel_project_not_found_error') ||
          error.message.includes('not properly linked to a Vercel project'))
      ) {
        log.info('Project not yet deployed to Vercel, returning empty deployments')
        return res.json({
          success: true,
          deployments: [],
        })
      }

      throw error
    }
  }

  async getEnvVars(req: Request, res: Response) {
    const projectId = req.query.projectId as string
    const decrypted = req.query.decrypted === 'true'

    if (!projectId) {
      throw new BadRequestError('Missing projectId')
    }

    try {
      const envVars = await v0.projects.findEnvVars({ projectId, decrypted })

      return res.json({ success: true, envVars })
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes('no Vercel project ID') ||
          error.message.includes('vercel_project_not_found_error') ||
          error.message.includes('not properly linked to a Vercel project'))
      ) {
        log.info('Project not yet deployed to Vercel, returning empty env vars')
        return res.json({
          success: true,
          envVars: [],
        })
      }

      throw error
    }
  }

  async getDeploymentLogs(req: Request, res: Response) {
    const { deploymentId } = req.params
    const { projectId, chatId } = req.query

    if (!deploymentId || !projectId || !chatId) {
      throw new BadRequestError('Missing required parameters: deploymentId, projectId, chatId')
    }

    const logs = await v0.deployments.findLogs({
      deploymentId,
      since: undefined,
    } as any)

    return res.json({
      success: true,
      logs,
    })
  }
}

export const v0ToolsController = new V0ToolsController()
