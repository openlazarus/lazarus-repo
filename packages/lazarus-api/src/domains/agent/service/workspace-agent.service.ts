import * as path from 'path'
import * as fs from 'fs/promises'
import { WorkspaceManager } from '@domains/workspace/service/workspace-manager'
import { getAgentTemplate } from '@infrastructure/config/agent-templates'
import {
  getWorkspaceTemplate,
  getDefaultWorkspaceTemplate,
} from '@infrastructure/config/workspace-templates'
import { whatsAppPhoneRepository } from '@domains/whatsapp/repository/whatsapp-phone.repository'
import type {
  AgentIndex,
  AgentIndexEntry,
  AgentTriggerConfig,
  WorkspaceAgentConfig,
} from '@domains/agent/types/agent.types'
import { type IWorkspaceAgentService } from './workspace-agent.service.interface'
import { createLogger } from '@utils/logger'
const log = createLogger('workspace-agent')

/**
 * Service for managing agents as files within workspaces
 * Agents are stored at: {workspacePath}/agents/{agentId}/config.agent.json
 * Index file at: {workspacePath}/.agents.json
 */
export class WorkspaceAgentService implements IWorkspaceAgentService {
  private workspaceManager: WorkspaceManager

  constructor(workspaceManager?: WorkspaceManager) {
    this.workspaceManager = workspaceManager || new WorkspaceManager()
  }

  /**
   * Get path to agent index file
   */
  private getIndexPath(workspacePath: string): string {
    const absoluteWorkspacePath = path.isAbsolute(workspacePath)
      ? workspacePath
      : path.resolve(process.cwd(), workspacePath)
    return path.join(absoluteWorkspacePath, '.agents.json')
  }

  /**
   * Read agent index file
   */
  private async readIndex(workspacePath: string): Promise<AgentIndex> {
    const indexPath = this.getIndexPath(workspacePath)
    try {
      const content = await fs.readFile(indexPath, 'utf-8')
      return JSON.parse(content)
    } catch {
      // Return empty index if not exists
      return { version: '1.0', agents: [] }
    }
  }

  /**
   * Write agent index file
   */
  private async writeIndex(workspacePath: string, index: AgentIndex): Promise<void> {
    const indexPath = this.getIndexPath(workspacePath)
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8')
  }

  /**
   * Add or update agent in index
   */
  private async updateIndexEntry(workspacePath: string, entry: AgentIndexEntry): Promise<void> {
    const index = await this.readIndex(workspacePath)
    const existingIndex = index.agents.findIndex((a) => a.id === entry.id)

    if (existingIndex >= 0) {
      index.agents[existingIndex] = entry
    } else {
      index.agents.push(entry)
    }

    await this.writeIndex(workspacePath, index)
  }

  /**
   * Remove agent from index
   */
  private async removeIndexEntry(workspacePath: string, agentId: string): Promise<void> {
    const index = await this.readIndex(workspacePath)
    index.agents = index.agents.filter((a) => a.id !== agentId)
    await this.writeIndex(workspacePath, index)
  }

  private async readWorkspaceSlug(workspacePath: string): Promise<string | undefined> {
    try {
      const metadataPath = path.join(workspacePath, '.workspace.json')
      const raw = await fs.readFile(metadataPath, 'utf-8')
      const metadata = JSON.parse(raw) as { slug?: string }
      return metadata.slug
    } catch (err) {
      log.warn({ err, workspacePath }, 'Could not read workspace slug')
      return undefined
    }
  }

  private buildAgentEmailAddress(agentId: string, workspaceSlug: string): string {
    const emailDomain = process.env.EMAIL_DOMAIN || 'your-domain.example'
    return `${agentId}@${workspaceSlug}.${emailDomain}`
  }

  private async writeEmailAutoTrigger(agentPath: string): Promise<void> {
    const triggersDir = path.join(agentPath, 'triggers')
    await fs.mkdir(triggersDir, { recursive: true })
    const trigger: AgentTriggerConfig = {
      id: 'email-auto-trigger',
      name: 'Email trigger',
      type: 'email',
      enabled: true,
      config: {
        event: 'email_received',
        description: 'Automatically process incoming emails',
      },
    }
    await fs.writeFile(
      path.join(triggersDir, 'email-auto-trigger.json'),
      JSON.stringify(trigger, null, 2),
      'utf-8',
    )
  }

  private async provisionAgentEmail(
    workspacePath: string,
    agentId: string,
    agentPath: string,
    restrictToWorkspaceMembers: boolean,
  ): Promise<WorkspaceAgentConfig['email'] | undefined> {
    const slug = await this.readWorkspaceSlug(workspacePath)
    if (!slug) {
      log.warn({ workspacePath, agentId }, 'No workspace slug; skipping email provisioning')
      return undefined
    }
    const address = this.buildAgentEmailAddress(agentId, slug)
    await this.writeEmailAutoTrigger(agentPath)
    log.info({ agentId, address }, 'Provisioned email + auto-trigger for agent')
    return { address, enabled: true, restrictToWorkspaceMembers }
  }

  private async ensureCoreAgents(workspacePath: string, userId: string): Promise<void> {
    const index = await this.readIndex(workspacePath)
    const hasLazarus = index.agents.some((a) => a.id === 'lazarus')
    if (hasLazarus) return

    try {
      await this.createAgentFromTemplate(workspacePath, 'lazarus', userId)
      log.info({ workspacePath }, 'Bootstrapped missing core lazarus agent')
    } catch (error) {
      log.error({ err: error, workspacePath }, 'Failed to bootstrap core lazarus agent')
    }
  }

  /**
   * Get path to agent directory within workspace
   * All agents now stored in agents/ directory (no more .system/)
   */
  private getAgentPath(workspacePath: string, agentId: string): string {
    // Ensure we have an absolute path
    const absoluteWorkspacePath = path.isAbsolute(workspacePath)
      ? workspacePath
      : path.resolve(process.cwd(), workspacePath)

    const agentPath = path.join(absoluteWorkspacePath, '.agents', agentId)

    log.info(`getAgentPath - workspacePath: ${workspacePath}`)
    log.info(`getAgentPath - absoluteWorkspacePath: ${absoluteWorkspacePath}`)
    log.info(`getAgentPath - agentId: ${agentId}`)
    log.info(`getAgentPath - constructed path: ${agentPath}`)

    return agentPath
  }

  /**
   * Get path to agent config file
   */
  private getAgentConfigPath(workspacePath: string, agentId: string): string {
    const configPath = path.join(this.getAgentPath(workspacePath, agentId), 'config.agent.json')
    log.info(`getAgentConfigPath - final config path: ${configPath}`)
    return configPath
  }

  /**
   * Create a new agent in workspace
   */
  async createAgent(
    workspaceId: string,
    userId: string,
    agent: Omit<WorkspaceAgentConfig, 'metadata' | 'enabled'> & { enabled?: boolean },
    autoTriggerEmail: boolean = true,
    restrictEmailToMembers: boolean = true,
  ): Promise<WorkspaceAgentConfig> {
    const workspace = await this.workspaceManager.getWorkspace(workspaceId, userId)
    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`)
    }

    const now = new Date().toISOString()

    // Extract guardrails from metadata if present (frontend compat) and promote to top-level
    const guardrails = agent.guardrails || (agent as any).metadata?.guardrails

    // Create full agent config
    const fullAgent: WorkspaceAgentConfig = {
      ...agent,
      enabled: agent.enabled !== undefined ? agent.enabled : true,
      ...(guardrails ? { guardrails } : {}),
      metadata: {
        created: now,
        updated: now,
        author: userId,
        tags: [],
        isSystemAgent: false,
        workspaceId, // Store for webhook lookups
        userId, // Store for webhook lookups
      },
    }

    // Create agent directory structure
    const agentPath = this.getAgentPath(workspace.path, agent.id)
    await fs.mkdir(agentPath, { recursive: true })

    // Create inbox directory for email
    await fs.mkdir(path.join(agentPath, 'inbox'), { recursive: true })
    await fs.mkdir(path.join(agentPath, 'inbox', 'attachments'), { recursive: true })

    // Create personal directories if specified
    if (fullAgent.personalFiles?.scriptsDir) {
      await fs.mkdir(path.join(agentPath, fullAgent.personalFiles.scriptsDir), { recursive: true })
    }
    if (fullAgent.personalFiles?.promptsDir) {
      await fs.mkdir(path.join(agentPath, fullAgent.personalFiles.promptsDir), { recursive: true })
    }
    if (fullAgent.personalFiles?.dataDir) {
      await fs.mkdir(path.join(agentPath, fullAgent.personalFiles.dataDir), { recursive: true })
    }

    if (autoTriggerEmail) {
      const email = await this.provisionAgentEmail(
        workspace.path,
        agent.id,
        agentPath,
        restrictEmailToMembers,
      )
      if (email) {
        fullAgent.email = email
        ;(fullAgent as { autoTriggerEmail?: boolean }).autoTriggerEmail = true
      }
    }

    const configPath = this.getAgentConfigPath(workspace.path, agent.id)
    await fs.writeFile(configPath, JSON.stringify(fullAgent, null, 2), 'utf-8')

    // Update index
    await this.updateIndexEntry(workspace.path, {
      id: fullAgent.id,
      name: fullAgent.name,
      isSystemAgent: fullAgent.metadata.isSystemAgent,
      enabled: fullAgent.enabled,
      path: `agents/${fullAgent.id}`,
      created: fullAgent.metadata.created,
      updated: fullAgent.metadata.updated,
    })

    return fullAgent
  }

  /**
   * Update an existing agent
   */
  async updateAgent(
    workspaceId: string,
    userId: string,
    agentId: string,
    updates: Partial<WorkspaceAgentConfig>,
  ): Promise<WorkspaceAgentConfig> {
    const workspace = await this.workspaceManager.getWorkspace(workspaceId, userId)
    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`)
    }

    // Load existing agent
    const agent = await this.getAgent(workspaceId, userId, agentId)
    if (!agent) {
      throw new Error(`Agent ${agentId} not found in workspace ${workspaceId}`)
    }

    // Prevent editing system agents (except specific fields)
    if (agent.metadata.isSystemAgent) {
      const allowedUpdates = ['triggers', 'enabled']
      const hasDisallowedUpdates = Object.keys(updates).some(
        (key) => !allowedUpdates.includes(key) && key !== 'metadata',
      )
      if (hasDisallowedUpdates) {
        throw new Error('System agents are immutable and cannot be modified')
      }
    }

    const now = new Date().toISOString()

    // Promote guardrails from metadata.guardrails to top-level (frontend compat)
    const incomingGuardrails =
      updates.guardrails || (updates.metadata as any)?.guardrails || agent.guardrails

    // Merge updates
    const updatedAgent: WorkspaceAgentConfig = {
      ...agent,
      ...updates,
      id: agent.id, // Prevent ID changes
      ...(incomingGuardrails ? { guardrails: incomingGuardrails } : {}),
      metadata: {
        ...agent.metadata,
        ...(updates.metadata || {}),
        updated: now,
        isSystemAgent: agent.metadata.isSystemAgent, // Prevent changing system agent status
      },
    }

    // Remove guardrails from metadata before persisting (top-level is canonical on disk)
    if ((updatedAgent.metadata as any).guardrails) {
      delete (updatedAgent.metadata as any).guardrails
    }

    // Write updated config
    const configPath = this.getAgentConfigPath(workspace.path, agentId)
    await fs.writeFile(configPath, JSON.stringify(updatedAgent, null, 2), 'utf-8')

    // Update index
    await this.updateIndexEntry(workspace.path, {
      id: updatedAgent.id,
      name: updatedAgent.name,
      isSystemAgent: updatedAgent.metadata.isSystemAgent,
      enabled: updatedAgent.enabled,
      path: `agents/${updatedAgent.id}`,
      created: updatedAgent.metadata.created,
      updated: updatedAgent.metadata.updated,
    })

    return updatedAgent
  }

  /**
   * Connect WhatsApp to an agent: creates the trigger and enables WhatsApp in config
   */
  async connectWhatsApp(
    workspaceId: string,
    userId: string,
    agentId: string,
  ): Promise<{ triggerCreated: boolean }> {
    const workspace = await this.workspaceManager.getWorkspace(workspaceId, userId)
    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`)
    }

    // Add WhatsApp trigger to triggers.json (preserving existing triggers)
    let triggerCreated = false
    const triggersPath = path.join(workspace.path, '.agents', agentId, 'triggers.json')

    let triggers: any[] = []
    try {
      const content = await fs.readFile(triggersPath, 'utf-8')
      triggers = JSON.parse(content)
    } catch (err) {
      log.debug({ err }, "File doesn't exist, start with empty array")
    }

    const existingTrigger = triggers.find((t: any) => t.type === 'whatsapp')
    if (!existingTrigger) {
      triggers.push({
        id: 'whatsapp-auto-trigger',
        type: 'whatsapp',
        enabled: true,
        config: {
          event: 'whatsapp_message_received',
          description: 'Automatically process incoming WhatsApp messages',
        },
      })
      await fs.writeFile(triggersPath, JSON.stringify(triggers, null, 2))
      triggerCreated = true
      log.info(`WhatsApp trigger created for agent ${agentId}`)
    }

    // Enable WhatsApp in agent config
    await this.updateAgent(workspaceId, userId, agentId, {
      whatsapp: {
        enabled: true,
        autoTriggerOnMessage: true,
        restrictToContacts: false,
      },
    })
    log.info(`WhatsApp enabled in config for agent ${agentId}`)

    return { triggerCreated }
  }

  /**
   * Get agent configuration
   */
  async getAgent(
    workspaceId: string,
    userId: string,
    agentId: string,
  ): Promise<WorkspaceAgentConfig | null> {
    log.info(
      `getAgent called - workspaceId: ${workspaceId}, userId: ${userId}, agentId: ${agentId}`,
    )

    const workspace = await this.workspaceManager.getWorkspace(workspaceId, userId)
    if (!workspace) {
      log.info(`getAgent - workspace not found: ${workspaceId}`)
      return null
    }

    log.info(`getAgent - workspace found, path: ${workspace.path}`)

    // All agents now in agents/ directory
    const configPath = this.getAgentConfigPath(workspace.path, agentId)
    log.info(`getAgent - attempting to read config from: ${configPath}`)

    try {
      const content = await fs.readFile(configPath, 'utf-8')
      log.info(`getAgent - successfully read config file for ${agentId}`)
      const agent = JSON.parse(content)

      // Self-healing: recompute email address from workspace slug
      if (workspace.slug && agent.email) {
        const emailDomain = process.env.EMAIL_DOMAIN || 'your-domain.example'
        const correctEmail = `${agentId}@${workspace.slug}.${emailDomain}`
        if (agent.email.address !== correctEmail) {
          log.info(`Fixing agent email: ${agent.email.address} -> ${correctEmail}`)
          agent.email.address = correctEmail
          // Write corrected config back to disk
          fs.writeFile(configPath, JSON.stringify(agent, null, 2), 'utf-8').catch((err) =>
            log.error({ err }, `Failed to write corrected email for ${agentId}`),
          )
        }
      }

      // Self-healing: migrate guardrails from metadata.guardrails to top-level
      if (agent.metadata?.guardrails) {
        if (!agent.guardrails) {
          agent.guardrails = agent.metadata.guardrails
        }
        delete agent.metadata.guardrails
        log.info(`Migrated guardrails from metadata for agent ${agentId}`)
        fs.writeFile(configPath, JSON.stringify(agent, null, 2), 'utf-8').catch((err) =>
          log.error({ err }, `Failed to write migrated guardrails for ${agentId}`),
        )
      }

      return agent
    } catch (error: any) {
      log.error({ err: error.message }, `getAgent - failed to read config for ${agentId}:`)
      log.error({ err: error.code }, `getAgent - error code:`)
      log.error({ err: configPath }, `getAgent - attempted path:`)

      return null
    }
  }

  /**
   * Update email addresses for all agents in a workspace when the slug changes.
   */
  async updateAgentEmails(workspaceId: string, userId: string, newSlug: string): Promise<number> {
    const workspace = await this.workspaceManager.getWorkspace(workspaceId, userId)
    if (!workspace) {
      return 0
    }

    const index = await this.readIndex(workspace.path)
    let updated = 0

    for (const entry of index.agents) {
      const configPath = this.getAgentConfigPath(workspace.path, entry.id)
      try {
        const content = await fs.readFile(configPath, 'utf-8')
        const agent = JSON.parse(content)

        if (agent.email) {
          const correctEmail = this.buildAgentEmailAddress(entry.id, newSlug)
          if (agent.email.address !== correctEmail) {
            agent.email.address = correctEmail
            await fs.writeFile(configPath, JSON.stringify(agent, null, 2), 'utf-8')
            updated++
          }
        }
      } catch (err) {
        log.error({ err: err }, `Failed to update email for agent ${entry.id}:`)
      }
    }

    if (updated > 0) {
      log.info(`Updated ${updated} agent email(s) for new slug: ${newSlug}`)
    }

    return updated
  }

  /**
   * List all agents in a workspace (uses index for fast listing)
   */
  async listAgents(
    workspaceId: string,
    userId: string,
    includeSystem: boolean = true,
  ): Promise<WorkspaceAgentConfig[]> {
    const workspace = await this.workspaceManager.getWorkspace(workspaceId, userId)
    if (!workspace) {
      return []
    }

    await this.ensureCoreAgents(workspace.path, userId)

    // Read index file for fast listing
    const index = await this.readIndex(workspace.path)

    // Filter by includeSystem flag
    let entries = index.agents
    if (!includeSystem) {
      entries = entries.filter((e) => !e.isSystemAgent)
    }

    // Load full configs for each agent
    const agents: WorkspaceAgentConfig[] = []
    for (const entry of entries) {
      const agent = await this.getAgent(workspaceId, userId, entry.id)
      if (agent) {
        agents.push(agent)
      }
    }

    return agents
  }

  /**
   * Delete an agent from workspace
   */
  async deleteAgent(workspaceId: string, userId: string, agentId: string): Promise<boolean> {
    const workspace = await this.workspaceManager.getWorkspace(workspaceId, userId)
    if (!workspace) {
      return false
    }

    // Load agent to check if it's a system agent
    const agent = await this.getAgent(workspaceId, userId, agentId)
    if (!agent) {
      return false
    }

    // Prevent deleting system agents
    if (agent.metadata.isSystemAgent) {
      throw new Error('Cannot delete system agents')
    }

    // Clean up WhatsApp phone number (Kapso + DB)
    try {
      await whatsAppPhoneRepository.disconnectAndCleanup(workspaceId, agentId)
    } catch (whatsappError) {
      log.error({ err: whatsappError }, `WhatsApp cleanup failed for agent ${agentId}:`)
    }

    // Delete agent directory
    const agentPath = this.getAgentPath(workspace.path, agentId)
    try {
      await fs.rm(agentPath, { recursive: true, force: true })

      // Remove from index
      await this.removeIndexEntry(workspace.path, agentId)

      return true
    } catch (error) {
      log.error({ err: error }, `Failed to delete agent ${agentId}:`)
      return false
    }
  }

  /**
   * List agent's personal files
   */
  async listAgentFiles(
    workspaceId: string,
    userId: string,
    agentId: string,
    relativePath: string = '',
  ): Promise<{ name: string; path: string; type: 'file' | 'directory' }[]> {
    const workspace = await this.workspaceManager.getWorkspace(workspaceId, userId)
    if (!workspace) {
      return []
    }

    const agent = await this.getAgent(workspaceId, userId, agentId)
    if (!agent) {
      return []
    }

    const agentPath = this.getAgentPath(workspace.path, agentId)
    const fullPath = path.join(agentPath, relativePath)

    const files: { name: string; path: string; type: 'file' | 'directory' }[] = []

    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true })
      for (const entry of entries) {
        // Skip config.agent.json in file list
        if (entry.name === 'config.agent.json' && relativePath === '') {
          continue
        }

        files.push({
          name: entry.name,
          path: path.join(relativePath, entry.name),
          type: entry.isDirectory() ? 'directory' : 'file',
        })
      }
    } catch (error) {
      log.error({ err: error }, `Failed to list agent files:`)
    }

    return files
  }

  /**
   * Initialize system agents in a workspace based on template
   * Creates agents according to the selected workspace template
   * System agents are stored in .agents/ with isSystemAgent: true flag
   *
   * NOTE: The 'lazarus' agent is ALWAYS created first as it's the default
   * agent for Discord, Slack, and email integrations.
   */
  async initializeSystemAgents(
    workspaceId: string,
    userId: string,
    templateId: string = 'default',
  ): Promise<void> {
    const workspace = await this.workspaceManager.getWorkspace(workspaceId, userId)
    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`)
    }

    const agentsPath = path.join(workspace.path, '.agents')
    await fs.mkdir(agentsPath, { recursive: true })

    // ALWAYS create the 'lazarus' core agent first - required for integrations
    // This agent is the default for Discord, Slack, and email when no specific agent is configured
    try {
      await this.createAgentFromTemplate(workspace.path, 'lazarus', userId)
      log.info(`Created core 'lazarus' agent for workspace ${workspaceId}`)
    } catch (error) {
      log.error({ err: error }, `Error creating lazarus agent:`)
      // Continue with other agents even if lazarus fails
    }

    // Get workspace template
    const template = getWorkspaceTemplate(templateId) || getDefaultWorkspaceTemplate()
    log.info(`Initializing agents for template: ${template.name}`)

    // For blank template, we've already created lazarus - that's all we need
    if (template.id === 'blank' || template.agentTemplateIds.length === 0) {
      log.info(`Blank template - only lazarus agent created`)
      return
    }

    // Create agents from template
    for (const agentTemplateId of template.agentTemplateIds) {
      await this.createAgentFromTemplate(workspace.path, agentTemplateId, userId)
    }

    log.info(
      `Initialized ${template.agentTemplateIds.length + 1} agents for workspace ${workspaceId}`,
    )
  }

  /**
   * Create an agent from a template
   */
  async createAgentFromTemplate(
    workspacePath: string,
    agentTemplateId: string,
    userId: string,
  ): Promise<WorkspaceAgentConfig> {
    const template = getAgentTemplate(agentTemplateId)
    if (!template) {
      throw new Error(`Agent template ${agentTemplateId} not found`)
    }

    const agentPath = this.getAgentPath(workspacePath, template.id)
    const configPath = this.getAgentConfigPath(workspacePath, template.id)

    // Check if already exists
    try {
      await fs.access(configPath)
      log.info(`Agent ${template.id} already exists, skipping`)
      const existingConfig = await fs.readFile(configPath, 'utf-8')
      return JSON.parse(existingConfig)
    } catch (err) {
      log.debug({ err }, 'Create agent')
    }

    const now = new Date().toISOString()

    // Map template tools to MCP tool format
    const allowedTools = template.allowedTools.map((tool) => {
      // Convert simple tool names to MCP format if needed
      if (tool.includes('sqlite')) {
        return `mcp__sqlite-tools__${tool.replace('sqlite_', '')}`
      }
      if (tool.includes('v0')) {
        return `mcp__v0-tools__${tool.replace('v0_', '')}`
      }
      // Keep other tools as-is (read, write, web_search, etc.)
      return tool
    })

    const fullAgent: WorkspaceAgentConfig = {
      id: template.id,
      name: template.name,
      description: template.description,
      systemPrompt: template.systemPrompt,
      allowedTools: allowedTools,
      enabled: true,
      modelConfig: template.modelConfig,
      metadata: {
        created: now,
        updated: now,
        author: userId,
        tags: template.tags,
        isSystemAgent: template.isSystemAgent,
        version: '1.0.0',
      },
    }

    await fs.mkdir(agentPath, { recursive: true })
    await fs.mkdir(path.join(agentPath, 'inbox'), { recursive: true })
    await fs.mkdir(path.join(agentPath, 'inbox', 'attachments'), { recursive: true })

    const email = await this.provisionAgentEmail(workspacePath, template.id, agentPath, true)
    if (email) {
      fullAgent.email = email
      ;(fullAgent as { autoTriggerEmail?: boolean }).autoTriggerEmail = true
    }

    await fs.writeFile(configPath, JSON.stringify(fullAgent, null, 2), 'utf-8')

    // Update index
    await this.updateIndexEntry(workspacePath, {
      id: fullAgent.id,
      name: fullAgent.name,
      isSystemAgent: template.isSystemAgent,
      enabled: true,
      path: `agents/${fullAgent.id}`,
      created: now,
      updated: now,
    })

    log.info(`Created agent from template: ${template.id}`)

    return fullAgent
  }
}
