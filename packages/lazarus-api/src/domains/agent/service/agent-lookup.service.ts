import * as path from 'path'
import * as fs from 'fs/promises'
import { agentRepository } from '@domains/agent/repository/agent.repository'
import type { AgentMetadata } from '@domains/agent/types/agent.types'
import type { IAgentLookupService } from './agent-lookup.service.interface'
import { createLogger } from '@utils/logger'
const log = createLogger('agent-lookup')

export type { AgentMetadata }

/**
 * Workspace information for agent lookup
 */
interface WorkspaceInfo {
  id: string
  slug: string | null
  user_id: string
  settings?: { path?: string } | null
  path?: string // File system path (calculated)
}

/**
 * Service for looking up and validating agents
 * Used primarily for email routing and agent existence checks
 */
export class AgentLookupService implements IAgentLookupService {
  /**
   * Storage base path from environment
   */
  private readonly STORAGE_BASE: string

  constructor(storageBase?: string) {
    this.STORAGE_BASE =
      storageBase || process.env.STORAGE_BASE_PATH || process.env.STORAGE_PATH || './storage'
  }

  /**
   * Get workspace file system path
   * Uses path from settings if available, falls back to workspaces directory
   */
  private getWorkspacePathFromSettings(
    workspaceId: string,
    settings?: { path?: string } | null,
  ): string {
    // Use path from settings if available (preferred)
    if (settings?.path) {
      return settings.path
    }
    // Fallback to workspaces directory structure
    return path.join(this.STORAGE_BASE, 'workspaces', workspaceId)
  }

  /**
   * Get agent config file path
   */
  private getAgentConfigPath(workspacePath: string, agentId: string): string {
    return path.join(workspacePath, '.agents', agentId, 'config.agent.json')
  }

  /**
   * Get workspace information from database by ID
   */
  async getWorkspaceById(workspaceId: string): Promise<WorkspaceInfo | null> {
    try {
      const data = await agentRepository.getWorkspaceLookupById(workspaceId)
      if (!data) return null

      return {
        ...data,
        path: this.getWorkspacePathFromSettings(data.id, data.settings),
      }
    } catch (error) {
      log.error({ err: error }, 'Error getting workspace')
      return null
    }
  }

  /**
   * Get workspace information from database by slug
   */
  async getWorkspaceBySlug(slug: string): Promise<WorkspaceInfo | null> {
    try {
      const data = await agentRepository.getWorkspaceLookupBySlug(slug)
      if (!data) return null

      return {
        ...data,
        path: this.getWorkspacePathFromSettings(data.id, data.settings),
      }
    } catch (error) {
      log.error({ err: error }, 'Error getting workspace by slug')
      return null
    }
  }

  /**
   * Check if an agent exists in a workspace
   *
   * @param workspaceId - Workspace ID
   * @param agentId - Agent ID
   * @returns True if agent exists and is enabled
   */
  async agentExists(workspaceId: string, agentId: string): Promise<boolean> {
    try {
      const workspace = await this.getWorkspaceById(workspaceId)
      if (!workspace || !workspace.path) {
        return false
      }

      const configPath = this.getAgentConfigPath(workspace.path, agentId)

      // Check if config file exists
      try {
        await fs.access(configPath)
      } catch {
        return false
      }

      // Read config to check if enabled
      const configData = await fs.readFile(configPath, 'utf-8')
      const config = JSON.parse(configData)

      // Agent exists if config exists and agent is enabled
      return config.enabled === true
    } catch (error) {
      log.error({ err: error }, 'Error checking agent existence')
      return false
    }
  }

  /**
   * Check if an agent exists by workspace slug and agent ID
   * Useful for email routing where we parse slug from email domain
   *
   * @param workspaceSlug - Workspace slug
   * @param agentId - Agent ID
   * @returns True if agent exists and is enabled
   */
  async agentExistsBySlug(workspaceSlug: string, agentId: string): Promise<boolean> {
    try {
      const workspace = await this.getWorkspaceBySlug(workspaceSlug)
      if (!workspace) {
        return false
      }

      return await this.agentExists(workspace.id, agentId)
    } catch (error) {
      log.error({ err: error }, 'Error checking agent by slug')
      return false
    }
  }

  /**
   * Get agent metadata
   *
   * @param workspaceId - Workspace ID
   * @param agentId - Agent ID
   * @returns Agent metadata or null if not found
   */
  async getAgentMetadata(workspaceId: string, agentId: string): Promise<AgentMetadata | null> {
    try {
      const workspace = await this.getWorkspaceById(workspaceId)
      if (!workspace || !workspace.path) {
        return null
      }

      const configPath = this.getAgentConfigPath(workspace.path, agentId)

      // Check if config file exists
      try {
        await fs.access(configPath)
      } catch {
        return null
      }

      // Read config
      const configData = await fs.readFile(configPath, 'utf-8')
      const config = JSON.parse(configData)

      return {
        id: config.id,
        name: config.name,
        enabled: config.enabled || false,
        isSystemAgent: config.metadata?.isSystemAgent || false,
        email: config.email || undefined,
        autoTriggerEmail: config.autoTriggerEmail,
        workspaceId: workspace.id,
        userId: workspace.user_id,
      }
    } catch (error) {
      log.error({ err: error }, 'Error getting agent metadata')
      return null
    }
  }

  /**
   * Get agent metadata by workspace slug
   *
   * @param workspaceSlug - Workspace slug
   * @param agentId - Agent ID
   * @returns Agent metadata or null if not found
   */
  async getAgentMetadataBySlug(
    workspaceSlug: string,
    agentId: string,
  ): Promise<AgentMetadata | null> {
    try {
      const workspace = await this.getWorkspaceBySlug(workspaceSlug)
      if (!workspace) {
        return null
      }

      return await this.getAgentMetadata(workspace.id, agentId)
    } catch (error) {
      log.error({ err: error }, 'Error getting agent metadata by slug')
      return null
    }
  }

  /**
   * List all enabled agents in a workspace
   *
   * @param workspaceId - Workspace ID
   * @returns Array of agent metadata
   */
  async listEnabledAgents(workspaceId: string): Promise<AgentMetadata[]> {
    try {
      const workspace = await this.getWorkspaceById(workspaceId)
      if (!workspace || !workspace.path) {
        return []
      }

      const agentsDir = path.join(workspace.path, '.agents')

      // Check if agents directory exists
      try {
        await fs.access(agentsDir)
      } catch {
        return []
      }

      // Read all agent directories
      const entries = await fs.readdir(agentsDir, { withFileTypes: true })
      const agentIds = entries.filter((e) => e.isDirectory()).map((e) => e.name)

      // Get metadata for each agent
      const agents: AgentMetadata[] = []
      for (const agentId of agentIds) {
        const metadata = await this.getAgentMetadata(workspaceId, agentId)
        if (metadata && metadata.enabled) {
          agents.push(metadata)
        }
      }

      return agents
    } catch (error) {
      log.error({ err: error }, 'Error listing agents')
      return []
    }
  }

  /**
   * Validate email address format and extract workspace slug + agent ID
   *
   * Format: {agentId}@{workspaceSlug}.{EMAIL_DOMAIN}
   *
   * @param emailAddress - Email address to parse
   * @returns Parsed components or null if invalid format
   */
  parseAgentEmail(emailAddress: string): { workspaceSlug: string; agentId: string } | null {
    const emailDomain = process.env.EMAIL_DOMAIN || 'your-domain.example'
    const escapedDomain = emailDomain.replace(/\./g, '\\.')
    const match = emailAddress.match(new RegExp(`^([^@]+)@([^.]+)\\.${escapedDomain}$`))

    if (!match) {
      return null
    }

    return {
      agentId: match[1]!,
      workspaceSlug: match[2]!,
    }
  }

  /**
   * Validate agent email address
   * Checks both format and agent existence
   *
   * @param emailAddress - Email address to validate
   * @returns True if email is valid and agent exists
   */
  async validateAgentEmail(emailAddress: string): Promise<boolean> {
    const parsed = this.parseAgentEmail(emailAddress)
    if (!parsed) {
      return false
    }

    return await this.agentExistsBySlug(parsed.workspaceSlug, parsed.agentId)
  }
}

// Export singleton instance
export const agentLookupService: IAgentLookupService = new AgentLookupService()
