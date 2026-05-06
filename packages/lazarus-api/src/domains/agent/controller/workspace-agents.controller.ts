import { Request, Response } from 'express'
import * as fs from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'
import { WorkspaceAgentService } from '@domains/agent/service/workspace-agent.service'
import type { WorkspaceAgentConfig } from '@domains/agent/types/agent.types'
import { WorkspaceManager } from '@domains/workspace/service/workspace-manager'
import { getToolMetadataForAgent } from '@tools/tool-metadata'
import { AgentTriggerManager } from '@domains/agent/service/triggers/trigger-manager'
import { WorkspaceAgentExecutor } from '@domains/agent/service/workspace-agent-executor'
import { backgroundProcessManager } from '@background/manager'
import { executionAbortRegistry } from '@domains/agent/service/execution-abort-registry'
import { executionCache } from '@realtime'
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  BadRequestError,
  ServiceUnavailableError,
  agentNotFound,
  workspaceNotFound,
} from '@errors/api-errors'
import { kapsoService } from '@domains/whatsapp/service/kapso-service'
import { whatsAppPhoneRepository } from '@domains/whatsapp/repository/whatsapp-phone.repository'
import { getPhoneStatus } from '@domains/whatsapp/service/whatsapp-status'
import { MCPDirectTester } from '@infrastructure/config/mcp-direct-tester'
import { MCPWorkspaceManager } from '@domains/workspace/service/mcp-workspace-manager'
import { workspaceRepository } from '@domains/workspace/repository/workspace.repository'
import { createLogger } from '@utils/logger'
const log = createLogger('workspace-agents')

const agentService = new WorkspaceAgentService()
const workspaceManager = new WorkspaceManager()
const triggerManager = new AgentTriggerManager()
const agentExecutor = new WorkspaceAgentExecutor()

function enrichAgentWithTools(agent: WorkspaceAgentConfig): any {
  const toolMetadata = getToolMetadataForAgent(agent.id, agent.allowedTools)
  return {
    ...agent,
    tools: toolMetadata,
  }
}

interface MCPToolsCacheEntry {
  tools: Array<{ name: string; description: string }>
  cachedAt: string
}

const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

class WorkspaceAgentsController {
  async listAgents(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const userId = req.user!.id
    const includeSystem = req.query.includeSystem !== 'false'

    const agents = await agentService.listAgents(workspaceId, userId, includeSystem)
    const enrichedAgents = agents.map(enrichAgentWithTools)

    return res.json({
      success: true,
      agents: enrichedAgents,
      count: enrichedAgents.length,
      workspaceId,
    })
  }

  async getAgent(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const agentId = req.params.agentId!
    const userId = req.user!.id

    const agent = await agentService.getAgent(workspaceId, userId, agentId)
    if (!agent) {
      throw agentNotFound(agentId)
    }

    const enrichedAgent = enrichAgentWithTools(agent)

    return res.json({
      success: true,
      agent: enrichedAgent,
    })
  }

  async createAgent(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const userId = req.user!.id

    const data = req.body
    const autoTriggerEmail = data.autoTriggerEmail ?? true
    const restrictEmailToMembers = data.restrictEmailToMembers ?? true

    const agent = await agentService.createAgent(
      workspaceId,
      userId,
      data,
      autoTriggerEmail,
      restrictEmailToMembers,
    )

    try {
      await backgroundProcessManager.reloadWorkspace(workspaceId)
      log.info(`Reloaded workspace ${workspaceId} after agent creation`)
    } catch (error) {
      log.error({ err: error }, `Error reloading workspace ${workspaceId}:`)
    }

    return res.status(201).json({
      success: true,
      agent,
      message: `Agent '${agent.name}' created successfully in workspace`,
      path: `/agents/${agent.id}/config.agent.json`,
    })
  }

  async updateAgent(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const agentId = req.params.agentId!
    const userId = req.user!.id

    const updates = req.body
    const agent = await agentService.updateAgent(workspaceId, userId, agentId, updates)

    try {
      await backgroundProcessManager.reloadWorkspace(workspaceId)
      log.info(`Reloaded workspace ${workspaceId} after agent update`)
    } catch (error) {
      log.error({ err: error }, `Error reloading workspace ${workspaceId}:`)
    }

    return res.json({
      success: true,
      agent,
      message: `Agent '${agent.name}' updated successfully`,
    })
  }

  async deleteAgent(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const agentId = req.params.agentId!
    const userId = req.user!.id

    const success = await agentService.deleteAgent(workspaceId, userId, agentId)
    if (!success) {
      throw agentNotFound(agentId)
    }

    try {
      await backgroundProcessManager.reloadWorkspace(workspaceId)
      log.info(`Reloaded workspace ${workspaceId} after agent deletion`)
    } catch (error) {
      log.error({ err: error }, `Error reloading workspace ${workspaceId}:`)
    }

    return res.json({
      success: true,
      message: `Agent '${agentId}' deleted successfully`,
    })
  }

  async enableAgent(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const agentId = req.params.agentId!
    const userId = req.user!.id

    const agent = await agentService.updateAgent(workspaceId, userId, agentId, { enabled: true })

    return res.json({
      success: true,
      agent,
      message: `Agent '${agent.name}' enabled successfully`,
    })
  }

  async disableAgent(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const agentId = req.params.agentId!
    const userId = req.user!.id

    const agent = await agentService.updateAgent(workspaceId, userId, agentId, { enabled: false })

    return res.json({
      success: true,
      agent,
      message: `Agent '${agent.name}' disabled successfully`,
    })
  }

  async listTriggers(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const agentId = req.params.agentId!
    const userId = req.user!.id

    const agent = await agentService.getAgent(workspaceId, userId, agentId)
    if (!agent) {
      throw agentNotFound(agentId)
    }

    const triggers = await triggerManager.listTriggers(workspaceId, userId, agentId)

    return res.json({
      success: true,
      triggers,
      count: triggers.length,
      agentId,
      workspaceId,
    })
  }

  async createTrigger(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const agentId = req.params.agentId!
    const userId = req.user!.id

    const agent = await agentService.getAgent(workspaceId, userId, agentId)
    if (!agent) {
      throw agentNotFound(agentId)
    }

    const data = req.body

    const trigger = await triggerManager.createTrigger(workspaceId, userId, agentId, {
      type: data.type,
      name: data.name,
      enabled: data.enabled,
      config: data.config,
      task: data.task,
      maxTurns: data.maxTurns,
    })

    return res.status(201).json({
      success: true,
      trigger,
      message: `Trigger '${trigger.name}' created successfully`,
    })
  }

  async getTrigger(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const agentId = req.params.agentId!
    const triggerId = req.params.triggerId!
    const userId = req.user!.id

    const agent = await agentService.getAgent(workspaceId, userId, agentId)
    if (!agent) {
      throw agentNotFound(agentId)
    }

    const trigger = await triggerManager.getTrigger(workspaceId, userId, agentId, triggerId)
    if (!trigger) {
      throw new NotFoundError('Trigger', triggerId)
    }

    return res.json({
      success: true,
      trigger,
    })
  }

  async updateTrigger(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const agentId = req.params.agentId!
    const triggerId = req.params.triggerId!
    const userId = req.user!.id

    const agent = await agentService.getAgent(workspaceId, userId, agentId)
    if (!agent) {
      throw agentNotFound(agentId)
    }

    const updates = req.body

    const trigger = await triggerManager.updateTrigger(
      workspaceId,
      userId,
      agentId,
      triggerId,
      updates,
    )
    if (!trigger) {
      throw new NotFoundError('Trigger', triggerId)
    }

    return res.json({
      success: true,
      trigger,
      message: `Trigger '${trigger.name}' updated successfully`,
    })
  }

  async deleteTrigger(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const agentId = req.params.agentId!
    const triggerId = req.params.triggerId!
    const userId = req.user!.id

    const agent = await agentService.getAgent(workspaceId, userId, agentId)
    if (!agent) {
      throw agentNotFound(agentId)
    }

    await triggerManager.deleteTrigger(workspaceId, userId, agentId, triggerId)

    return res.json({
      success: true,
      message: `Trigger deleted successfully`,
      triggerId,
    })
  }

  async executeTrigger(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const agentId = req.params.agentId!
    const triggerId = req.params.triggerId!
    const userId = req.user!.id
    const { triggerData } = req.body

    const agent = await agentService.getAgent(workspaceId, userId, agentId)
    if (!agent) {
      throw agentNotFound(agentId)
    }

    if (executionCache.isAgentExecuting(agentId)) {
      throw new ConflictError(
        'Agent is already executing',
        'Wait for the current execution to complete before running another trigger.',
      )
    }

    triggerManager
      .executeTrigger(workspaceId, userId, agentId, triggerId, triggerData)
      .catch((error) => {
        log.error({ err: error }, `Background execution failed for trigger ${triggerId}:`)
      })

    return res.json({
      success: true,
      message: 'Trigger execution started',
    })
  }

  async internalTrigger(req: Request, res: Response) {
    const workspaceId = req.workspaceId!
    const agentId = req.params.agentId!
    const { triggerId, payload } = req.body

    const workspace = await workspaceRepository.getWorkspaceWithOwnerAndSettings(workspaceId)
    if (!workspace) {
      throw workspaceNotFound(workspaceId)
    }

    const effectiveUserId = workspace.owner_id || workspace.user_id
    const workspacePath = (workspace.settings as any)?.path

    if (!workspacePath) {
      throw new NotFoundError('Workspace path', workspaceId)
    }

    const agent = await agentService.getAgent(workspaceId, effectiveUserId, agentId)
    if (!agent) {
      throw agentNotFound(agentId)
    }

    const triggersDir = `${workspacePath}/.agents/${agentId}/triggers`
    const triggerFile = `${triggersDir}/${triggerId}.json`
    let trigger: any = null

    try {
      const triggerContent = await fs.readFile(triggerFile, 'utf-8')
      trigger = JSON.parse(triggerContent)
    } catch (e) {
      try {
        const triggersFile = `${workspacePath}/.agents/${agentId}/triggers.json`
        const triggersContent = await fs.readFile(triggersFile, 'utf-8')
        const triggers = JSON.parse(triggersContent)
        trigger = triggers.find((t: any) => t.id === triggerId)
      } catch (e2) {
        log.debug({ err: e2 }, 'No triggers found')
      }
    }

    if (!trigger) {
      throw new NotFoundError('Trigger', triggerId)
    }

    const fullTrigger = {
      ...trigger,
      agentId,
      workspaceId,
      workspacePath,
      userId: effectiveUserId,
      name: trigger.name || trigger.config?.description || `Internal message trigger`,
    }

    log.info(`Executing internal message trigger for agent ${agentId}`)
    const execution = await triggerManager.executeAgentTrigger(fullTrigger, payload)

    return res.json({
      success: true,
      execution,
      message: 'Agent triggered successfully',
    })
  }

  async getTriggerExecutions(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const agentId = req.params.agentId!
    const triggerId = req.params.triggerId!
    const userId = req.user!.id
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10

    const agent = await agentService.getAgent(workspaceId, userId, agentId)
    if (!agent) {
      throw agentNotFound(agentId)
    }

    const trigger = await triggerManager.getTrigger(workspaceId, userId, agentId, triggerId)
    if (!trigger) {
      throw new NotFoundError('Trigger', triggerId)
    }

    const executions = await triggerManager.getTriggerExecutions(
      workspaceId,
      userId,
      agentId,
      triggerId,
      limit,
    )

    return res.json({
      success: true,
      executions,
      count: executions.length,
      limit,
      triggerId,
      agentId,
      workspaceId,
    })
  }

  async toggleAutoTriggerEmail(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const agentId = req.params.agentId!
    const userId = req.user!.id
    const { enabled } = req.body

    if (typeof enabled !== 'boolean') {
      throw new BadRequestError('enabled must be a boolean')
    }

    const workspace = await workspaceManager.getWorkspace(workspaceId, userId)
    if (!workspace) {
      throw workspaceNotFound(workspaceId)
    }

    const agent = await agentService.getAgent(workspaceId, userId, agentId)
    if (!agent) {
      throw agentNotFound(agentId)
    }

    const agentPath = `${workspace.path}/.agents/${agentId}`
    const triggersPath = `${agentPath}/triggers.json`

    let triggers: any[] = []
    try {
      const content = await fs.readFile(triggersPath, 'utf-8')
      triggers = JSON.parse(content)
    } catch {
      triggers = []
    }

    const emailTriggerIndex = triggers.findIndex((t: any) => t.type === 'email')

    if (emailTriggerIndex >= 0) {
      triggers[emailTriggerIndex].enabled = enabled
    } else if (enabled) {
      triggers.push({
        id: 'email-auto-trigger',
        name: 'Email trigger',
        type: 'email',
        enabled: true,
        config: {
          event: 'email_received',
          description: 'Automatically process incoming emails',
        },
      })
    }

    await fs.writeFile(triggersPath, JSON.stringify(triggers, null, 2), 'utf-8')

    return res.json({
      success: true,
      enabled,
      message: `Auto-trigger email ${enabled ? 'enabled' : 'disabled'} for agent '${agent.name}'`,
    })
  }

  async toggleEmailRestriction(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const agentId = req.params.agentId!
    const userId = req.user!.id
    const { enabled } = req.body

    if (typeof enabled !== 'boolean') {
      throw new BadRequestError('enabled must be a boolean')
    }

    const workspace = await workspaceManager.getWorkspace(workspaceId, userId)
    if (!workspace) {
      throw workspaceNotFound(workspaceId)
    }

    const agent = await agentService.getAgent(workspaceId, userId, agentId)
    if (!agent) {
      throw agentNotFound(agentId)
    }

    const emailDomain = process.env.EMAIL_DOMAIN || 'mail.example.com'
    await agentService.updateAgent(workspaceId, userId, agentId, {
      email: {
        ...agent.email,
        address:
          agent.email?.address || `${agentId}@${workspace.slug || workspaceId}.${emailDomain}`,
        enabled: agent.email?.enabled ?? true,
        restrictToWorkspaceMembers: enabled,
      },
    })

    return res.json({
      success: true,
      restrictToWorkspaceMembers: enabled,
      message: `Email restriction ${enabled ? 'enabled' : 'disabled'} for agent '${agent.name}'`,
    })
  }

  async getEmailAllowlist(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const agentId = req.params.agentId!
    const userId = req.user!.id

    const agent = await agentService.getAgent(workspaceId, userId, agentId)
    if (!agent) {
      throw agentNotFound(agentId)
    }

    return res.json({
      success: true,
      emails: agent.email?.allowedExternalEmails || [],
      restrictToWorkspaceMembers: agent.email?.restrictToWorkspaceMembers !== false,
    })
  }

  async updateEmailAllowlist(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const agentId = req.params.agentId!
    const userId = req.user!.id
    const { emails } = req.body

    if (!Array.isArray(emails)) {
      throw new BadRequestError('emails must be an array of strings')
    }

    if (emails.length > 100) {
      throw new BadRequestError('Maximum 100 entries allowed')
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const wildcardRegex = /^\*@[^\s@]+\.[^\s@]+$/
    const normalized: string[] = []

    for (const entry of emails) {
      if (typeof entry !== 'string') {
        throw new BadRequestError(`Invalid entry: ${entry}. Must be a string.`)
      }
      const trimmed = entry.trim().toLowerCase()
      if (!emailRegex.test(trimmed) && !wildcardRegex.test(trimmed)) {
        throw new BadRequestError(
          `Invalid email format: "${entry}". Use "user@domain.com" or "*@domain.com".`,
        )
      }
      normalized.push(trimmed)
    }

    const unique = [...new Set(normalized)]

    const workspace = await workspaceManager.getWorkspace(workspaceId, userId)
    if (!workspace) {
      throw workspaceNotFound(workspaceId)
    }

    const agent = await agentService.getAgent(workspaceId, userId, agentId)
    if (!agent) {
      throw agentNotFound(agentId)
    }

    const emailDomain = process.env.EMAIL_DOMAIN || 'mail.example.com'
    await agentService.updateAgent(workspaceId, userId, agentId, {
      email: {
        ...agent.email,
        address:
          agent.email?.address || `${agentId}@${workspace.slug || workspaceId}.${emailDomain}`,
        enabled: agent.email?.enabled ?? true,
        allowedExternalEmails: unique,
      },
    })

    return res.json({
      success: true,
      emails: unique,
      message: `Updated allowed external emails for agent '${agent.name}' (${unique.length} entries)`,
    })
  }

  async listAgentFiles(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const agentId = req.params.agentId!
    const userId = req.user!.id
    const relativePath = (req.query.path as string) || ''

    const files = await agentService.listAgentFiles(workspaceId, userId, agentId, relativePath)

    return res.json({
      success: true,
      files,
      agentId,
      path: relativePath,
    })
  }

  async initializeSystemAgents(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const userId = req.user!.id

    await agentService.initializeSystemAgents(workspaceId, userId)

    return res.json({
      success: true,
      message: 'System agents initialized successfully',
    })
  }

  async getAgentConfig(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const agentId = req.params.agentId!
    const userId = req.user!.id

    const agent = await agentService.getAgent(workspaceId, userId, agentId)
    if (!agent) {
      throw agentNotFound(agentId)
    }

    const configPath = `agents/${agentId}/config.agent.json`
    const agentPath = `agents/${agentId}`

    return res.json({
      success: true,
      configPath,
      agentPath,
      isSystemAgent: agent.metadata.isSystemAgent || false,
    })
  }

  async getWhatsAppConfig(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const agentId = req.params.agentId!
    const userId = req.user!.id

    const agent = await agentService.getAgent(workspaceId, userId, agentId)
    if (!agent) {
      throw agentNotFound(agentId)
    }

    const phoneConfig = await whatsAppPhoneRepository.getFullPhoneConfig(workspaceId, agentId)

    const metaStatus: {
      verifiedName?: string
      qualityRating?: string
      nameStatus?: string
      businessAccountId?: string
      accountMode?: string
      messagingLimitTier?: string
      templateCount?: number
      templates?: unknown[]
      stale?: boolean
    } = {}

    if (phoneConfig && phoneConfig.status === 'connected') {
      let stale = false

      try {
        const liveData = await kapsoService.getPhoneNumber(phoneConfig.phone_number_id)
        metaStatus.verifiedName = liveData.verifiedName
        metaStatus.qualityRating = liveData.qualityRating
        metaStatus.nameStatus = liveData.nameStatus
        metaStatus.businessAccountId =
          liveData.businessAccountId || phoneConfig.business_account_id || undefined
        metaStatus.accountMode = liveData.accountMode
        metaStatus.messagingLimitTier = liveData.messagingLimitTier

        await whatsAppPhoneRepository.updateMetaFields(workspaceId, agentId, {
          business_account_id: metaStatus.businessAccountId,
          quality_rating: metaStatus.qualityRating,
          name_status: metaStatus.nameStatus,
          account_mode: metaStatus.accountMode,
          messaging_limit_tier: metaStatus.messagingLimitTier,
        })
      } catch (kapsoError) {
        log.warn({ data: kapsoError }, 'Could not fetch live Meta status, returning cached data')
        stale = true
        metaStatus.qualityRating = phoneConfig.quality_rating || undefined
        metaStatus.nameStatus = phoneConfig.name_status || undefined
        metaStatus.businessAccountId = phoneConfig.business_account_id || undefined
      }

      if (metaStatus.businessAccountId) {
        try {
          const templates = await kapsoService.listMessageTemplates(metaStatus.businessAccountId)
          metaStatus.templateCount = templates.length
          metaStatus.templates = templates.map((t: any) => ({
            name: t.name,
            status: t.status,
            language: t.language,
            category: t.category,
          }))
        } catch {
          metaStatus.templateCount = undefined
        }
      }

      metaStatus.stale = stale
    }

    const phoneStatus =
      phoneConfig?.status === 'connected'
        ? getPhoneStatus(metaStatus.nameStatus, metaStatus.qualityRating)
        : null

    return res.json({
      success: true,
      whatsapp: phoneConfig
        ? {
            enabled: phoneConfig.status === 'connected',
            phoneNumber: phoneConfig.phone_number,
            phoneNumberId: phoneConfig.phone_number_id,
            displayName: phoneConfig.display_name,
            status: phoneConfig.status,
            qualityRating: metaStatus.qualityRating || phoneConfig.quality_rating,
            provisionedByLazarus: phoneConfig.provisioned_by_lazarus,
            connectedAt: phoneConfig.connected_at,
            verifiedName: metaStatus.verifiedName,
            nameStatus: metaStatus.nameStatus,
            businessAccountId: metaStatus.businessAccountId,
            accountMode: metaStatus.accountMode,
            messagingLimitTier: metaStatus.messagingLimitTier,
            templateCount: metaStatus.templateCount,
            templates: metaStatus.templates,
            stale: metaStatus.stale,
            phoneStatus,
          }
        : null,
      agentId,
      workspaceId,
    })
  }

  async disconnectWhatsApp(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const agentId = req.params.agentId!
    const userId = req.user!.id

    const agent = await agentService.getAgent(workspaceId, userId, agentId)
    if (!agent) {
      throw agentNotFound(agentId)
    }

    const cleaned = await whatsAppPhoneRepository.disconnectAndCleanup(workspaceId, agentId)
    if (!cleaned) {
      throw new NotFoundError('WhatsApp configuration', agentId)
    }

    return res.json({
      success: true,
      message: 'WhatsApp disconnected successfully',
    })
  }

  async createWhatsAppSetupLink(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const { agentId, provisionPhoneNumber = false } = req.body

    if (!kapsoService.isConfigured()) {
      throw new ServiceUnavailableError(
        'WhatsApp integration is not configured. Please set up Kapso API credentials.',
      )
    }

    const workspaceName = (await workspaceRepository.getWorkspaceName(workspaceId)) || workspaceId

    let kapsoCustomerId: string
    const existingKapsoId = await workspaceRepository.getKapsoCustomerId(workspaceId)

    if (existingKapsoId) {
      kapsoCustomerId = existingKapsoId
    } else {
      const kapsoCustomer = await kapsoService.getOrCreateCustomer(workspaceId, workspaceName)
      kapsoCustomerId = kapsoCustomer.id

      const inserted = await workspaceRepository.insertKapsoCustomer(workspaceId, kapsoCustomerId)
      if (!inserted) {
        log.error('Error saving Kapso customer')
      }
    }

    const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/workspaces/${workspaceId}/agents/${agentId}/whatsapp/callback`
    const setupLink = await kapsoService.createSetupLink(kapsoCustomerId, {
      provisionPhoneNumber,
      redirectUrl,
      expiresIn: 3600,
    })

    return res.json({
      success: true,
      setupLink: {
        url: setupLink.url,
        expiresAt: setupLink.expiresAt,
        provisionPhoneNumber,
      },
      kapsoCustomerId,
      agentId,
    })
  }

  async getWhatsAppCustomer(req: Request, res: Response) {
    const workspaceId = req.workspace!.id

    const kapsoCustomerId = await workspaceRepository.getKapsoCustomerId(workspaceId)

    return res.json({
      success: true,
      kapsoCustomerId,
      workspaceId,
    })
  }

  async listPhoneNumbers(req: Request, res: Response) {
    const workspaceId = req.workspace!.id

    const phoneNumbers = await whatsAppPhoneRepository.listPhoneNumbers(workspaceId)

    return res.json({
      success: true,
      phoneNumbers: (phoneNumbers || []).map((pn) => ({
        id: pn.id,
        phoneNumber: pn.phone_number,
        phoneNumberId: pn.phone_number_id,
        displayName: pn.display_name,
        status: pn.status,
        agentId: pn.agent_id,
        qualityRating: pn.quality_rating,
        provisionedByLazarus: pn.provisioned_by_lazarus,
        createdAt: pn.created_at,
        connectedAt: pn.connected_at,
      })),
      workspaceId,
    })
  }

  async assignWhatsApp(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const agentId = req.params.agentId!
    const userId = req.user!.id
    const { phoneNumberId, kapsoCustomerId } = req.body
    let { phoneNumber, displayName, businessAccountId } = req.body

    if (!phoneNumberId) {
      throw new BadRequestError('phoneNumberId is required')
    }

    if (!phoneNumber && kapsoService.isConfigured()) {
      try {
        log.info(`Fetching phone details from Kapso for ${phoneNumberId}`)
        const phoneDetails = await kapsoService.getPhoneNumber(phoneNumberId)
        phoneNumber = phoneDetails.phoneNumber
        displayName =
          displayName || phoneDetails.displayName || phoneDetails.verifiedName || phoneNumber
        businessAccountId = businessAccountId || phoneDetails.businessAccountId || null
        log.info(`Got phone number: ${phoneNumber}`)
      } catch (fetchError) {
        log.error({ err: fetchError }, 'Failed to fetch phone details from Kapso')
        throw new BadRequestError(
          'Could not fetch phone number details from Kapso',
          'Please try again or contact support',
        )
      }
    }

    const agent = await agentService.getAgent(workspaceId, userId, agentId)
    if (!agent) {
      throw agentNotFound(agentId)
    }

    const hasPhone = await whatsAppPhoneRepository.checkAgentHasPhone(workspaceId, agentId)
    if (hasPhone) {
      throw new ConflictError(
        'Agent already has a WhatsApp number assigned',
        'Disconnect the existing number first',
      )
    }

    const webhookSecret = uuidv4()

    const phoneConfig = await whatsAppPhoneRepository.insertPhoneNumber({
      workspace_id: workspaceId,
      agent_id: agentId,
      phone_number: phoneNumber,
      phone_number_id: phoneNumberId,
      display_name: displayName,
      kapso_customer_id: kapsoCustomerId,
      business_account_id: businessAccountId || null,
      status: 'connected',
      webhook_secret: webhookSecret,
      connected_at: new Date().toISOString(),
    })

    let webhookConfigured = false
    try {
      if (kapsoService.isConfigured()) {
        const webhookUrl = `${process.env.WORKSPACE_DOMAIN_URL || process.env.API_BASE_URL || 'http://localhost:8000'}/api/whatsapp/webhook`
        const kapsoWebhookSecret = process.env.KAPSO_WEBHOOK_SECRET || ''

        await kapsoService.configurePhoneWebhook(phoneNumberId, webhookUrl, kapsoWebhookSecret)
        webhookConfigured = true
        log.info(`Webhook configured for phone ${phoneNumberId}`)
      }
    } catch (webhookError) {
      log.error({ err: webhookError }, 'Failed to configure webhook')
    }

    try {
      await agentService.connectWhatsApp(workspaceId, userId, agentId)
    } catch (connectError) {
      log.error({ err: connectError }, 'Failed to enable WhatsApp on agent')
    }

    return res.json({
      success: true,
      whatsapp: {
        phoneNumber: phoneConfig.phone_number,
        phoneNumberId: phoneConfig.phone_number_id,
        displayName: phoneConfig.display_name,
        status: phoneConfig.status,
        webhookConfigured,
      },
      message: `WhatsApp number ${phoneNumber} assigned to agent '${agent.name}'`,
    })
  }

  async updateWhatsAppSettings(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const agentId = req.params.agentId!
    const userId = req.user!.id
    const { displayName, autoTriggerOnMessage, restrictToContacts } = req.body

    const agent = await agentService.getAgent(workspaceId, userId, agentId)
    if (!agent) {
      throw agentNotFound(agentId)
    }

    if (displayName !== undefined) {
      const updated = await whatsAppPhoneRepository.updateDisplayName(
        workspaceId,
        agentId,
        displayName,
      )
      if (!updated) {
        log.error('Error updating phone display name')
      }
    }

    await agentService.updateAgent(workspaceId, userId, agentId, {
      whatsapp: {
        ...agent.whatsapp,
        enabled: true,
        autoTriggerOnMessage: autoTriggerOnMessage ?? agent.whatsapp?.autoTriggerOnMessage ?? true,
        restrictToContacts: restrictToContacts ?? agent.whatsapp?.restrictToContacts ?? false,
      },
    })

    const workspace = await workspaceManager.getWorkspace(workspaceId, userId)
    if (workspace) {
      const triggersPath = `${workspace.path}/.agents/${agentId}/triggers.json`

      let triggers: any[] = []
      try {
        const content = await fs.readFile(triggersPath, 'utf-8')
        triggers = JSON.parse(content)
      } catch {
        triggers = []
      }

      const whatsappTriggerIndex = triggers.findIndex((t: any) => t.type === 'whatsapp')

      if (whatsappTriggerIndex >= 0) {
        triggers[whatsappTriggerIndex].enabled = autoTriggerOnMessage ?? true
      } else if (autoTriggerOnMessage !== false) {
        triggers.push({
          id: 'whatsapp-auto-trigger',
          type: 'whatsapp',
          enabled: true,
          config: {
            event: 'whatsapp_message_received',
            description: 'Automatically process incoming WhatsApp messages',
          },
        })
      }

      await fs.writeFile(triggersPath, JSON.stringify(triggers, null, 2), 'utf-8')
    }

    return res.json({
      success: true,
      settings: {
        displayName,
        autoTriggerOnMessage: autoTriggerOnMessage ?? true,
        restrictToContacts: restrictToContacts ?? false,
      },
      message: 'WhatsApp settings updated successfully',
    })
  }

  async stopExecution(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const executionId = req.params.executionId!

    const execution = executionCache.get(executionId)
    if (!execution) {
      throw new NotFoundError('Execution', executionId)
    }

    if (execution.workspaceId !== workspaceId) {
      throw new ForbiddenError('Execution does not belong to this workspace')
    }

    const aborted = executionAbortRegistry.abort(executionId, 'Cancelled by user')
    executionCache.cancel(executionId, 'Cancelled by user')

    return res.json({ success: true, aborted })
  }

  async getMCPTools(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const agentId = req.params.agentId!
    const forceRefresh = req.query.refresh === 'true'

    const userId = req.user!.id
    const workspace = await workspaceManager.getWorkspace(workspaceId, userId)
    if (!workspace) throw new NotFoundError('Workspace', workspaceId)

    const agent = await agentService.getAgent(workspaceId, userId, agentId)
    if (!agent) throw new NotFoundError('Agent', agentId)

    const mcpWsManager = new MCPWorkspaceManager()
    const workspaceMcpConfig = await mcpWsManager.buildWorkspaceMCPConfig(workspace)
    const workspaceServers = workspaceMcpConfig.mcpServers || {}

    const agentServers: Record<string, any> = {}

    if (agent.mcpServers) {
      for (const [key, server] of Object.entries(agent.mcpServers)) {
        if ((server as any).enabled !== false) {
          agentServers[key] = server
        }
      }
    }

    if (agent.allowedTools.includes('mcp') || agent.allowedTools.includes('*')) {
      if (agent.activeMCPs && agent.activeMCPs.length > 0) {
        for (const mcpName of agent.activeMCPs) {
          if (workspaceServers[mcpName]) {
            agentServers[mcpName] = workspaceServers[mcpName]
          }
        }
      } else {
        Object.assign(agentServers, workspaceServers)
      }
    }

    const BUILTIN_SERVERS = new Set([
      'email-tools',
      'sqlite-tools',
      'integration-channel-tools',
      'google-ai-tools',
      'whatsapp-tools',
      'agent-management-tools',
      'agent-chat-tools',
      'browser-tools',
      'v0-tools',
    ])

    const userServers: Record<string, any> = {}
    for (const [name, config] of Object.entries(agentServers)) {
      if (!BUILTIN_SERVERS.has(name)) {
        userServers[name] = config
      }
    }

    const existingCache: Record<string, MCPToolsCacheEntry> = (agent as any).mcpToolsCache || {}
    const result: Record<
      string,
      { tools: Array<{ name: string; description: string }>; serverDescription?: string }
    > = {}

    const discoveryPromises = Object.entries(userServers).map(
      async ([serverName, serverConfig]) => {
        const cached = existingCache[serverName]
        if (cached && !forceRefresh) {
          const age = Date.now() - new Date(cached.cachedAt).getTime()
          if (age < CACHE_TTL_MS) {
            result[serverName] = { tools: cached.tools }
            return
          }
        }

        try {
          const testResult = await MCPDirectTester.testMCPServerDirect(serverConfig, {
            MCP_REMOTE_CONFIG_DIR: `${workspace.path}/.mcp-auth`,
          })

          const tools = (testResult.tools || []).map((t) => ({
            name: t.name,
            description: t.description || '',
          }))

          result[serverName] = {
            tools,
            serverDescription: testResult.serverInfo?.name,
          }

          existingCache[serverName] = {
            tools,
            cachedAt: new Date().toISOString(),
          }
        } catch (err) {
          result[serverName] = {
            tools: [],
            serverDescription: `Error: ${err instanceof Error ? err.message : 'Connection failed'}`,
          }
        }
      },
    )

    await Promise.all(discoveryPromises)

    try {
      await agentService.updateAgent(workspaceId, userId, agentId, {
        mcpToolsCache: existingCache,
      } as any)
    } catch (err) {
      log.debug({ err }, 'Cache persistence is non-critical')
    }

    return res.json(result)
  }

  // Called by the orchestrator global agent to run a workspace agent and get the text response back.
  // Uses instanceAuth — never called by end users directly.
  async agentRun(req: Request, res: Response) {
    const workspaceId = req.workspaceId!
    const { agentId, query, userId, platformSource } = req.body

    if (!agentId || !query) {
      return res.status(400).json({ error: 'agentId and query are required' })
    }

    const workspace = await workspaceRepository.getWorkspaceWithOwnerAndSettings(workspaceId)
    if (!workspace) throw workspaceNotFound(workspaceId)

    const effectiveUserId = userId || workspace.owner_id || workspace.user_id

    const { result, messages } = await agentExecutor.executeAgent({
      agentId,
      workspaceId,
      userId: effectiveUserId,
      task: query,
      platformSource: platformSource ?? 'whatsapp',
    })

    const sdkResult = result as any
    if (sdkResult?.result && typeof sdkResult.result === 'string') {
      return res.json({ response: sdkResult.result })
    }

    const assistantText =
      (messages as any[])
        .filter((m) => m.role === 'assistant')
        .map((m) => {
          if (typeof m.content === 'string') return m.content
          if (Array.isArray(m.content))
            return m.content
              .filter((b: any) => b.type === 'text')
              .map((b: any) => b.text)
              .join('\n')
          return ''
        })
        .filter(Boolean)
        .pop() ?? 'Agent completed but produced no text response.'

    return res.json({ response: assistantText })
  }
}

export const workspaceAgentsController = new WorkspaceAgentsController()
