import { promises as fs } from 'fs'
import path from 'path'
import { validateSlugFormat, generateRandomSlug, ensureUniqueSlug } from '@utils/slug-generator'
import { workspaceRepository } from '@domains/workspace/repository/workspace.repository'
import type { WorkspaceConfig } from '@domains/workspace/types/workspace.types'
import type { IWorkspaceConfigService } from './workspace-config.service.interface'
import { createLogger } from '@utils/logger'
const log = createLogger('workspace-config')

/**
 * Service for managing workspace configuration files
 *
 * Configuration is stored in .workspace.json at the workspace root.
 * This includes the workspace slug used for agent email addresses:
 * {agentId}@{workspaceSlug}.lazarusconnect.com
 */
export class WorkspaceConfigService implements IWorkspaceConfigService {
  private readonly CONFIG_FILENAME = '.workspace.json'

  /**
   * Get the path to the workspace config file
   */
  getConfigPath(workspacePath: string): string {
    return path.join(workspacePath, this.CONFIG_FILENAME)
  }

  /**
   * Get workspace configuration
   * Auto-creates config from database slug if it doesn't exist
   */
  async getConfig(workspacePath: string, workspaceId: string): Promise<WorkspaceConfig> {
    const configPath = this.getConfigPath(workspacePath)

    try {
      const configData = await fs.readFile(configPath, 'utf-8')
      const config = JSON.parse(configData) as WorkspaceConfig

      // Validate config structure
      if (!config.slug || !config.version) {
        log.warn('Invalid config, syncing from database')
        return await this.createDefaultConfig(workspacePath, workspaceId)
      }

      // Verify slug matches database (database is source of truth)
      const dbSlug = await this.getSlugFromDatabase(workspaceId)
      if (dbSlug && dbSlug !== config.slug) {
        log.warn(
          `[WorkspaceConfigService] Slug mismatch! DB: ${dbSlug}, File: ${config.slug}. Syncing from database.`,
        )
        return await this.syncConfigFromDatabase(workspacePath, workspaceId, dbSlug)
      }

      return config
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // Config doesn't exist, create it from database slug
        log.info('Config not found, syncing from database')
        return await this.createDefaultConfig(workspacePath, workspaceId)
      }
      throw error
    }
  }

  /**
   * Update workspace configuration
   * Validates slug before saving
   */
  async updateConfig(
    workspacePath: string,
    workspaceId: string,
    updates: Partial<WorkspaceConfig>,
  ): Promise<WorkspaceConfig> {
    // Get existing config
    const currentConfig = await this.getConfig(workspacePath, workspaceId)

    // If slug is being updated, validate it
    if (updates.slug && updates.slug !== currentConfig.slug) {
      const validation = await this.validateSlug(updates.slug, workspaceId)
      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid slug')
      }
    }

    // Merge updates
    const updatedConfig: WorkspaceConfig = {
      ...currentConfig,
      ...updates,
      updatedAt: new Date().toISOString(),
      version: '1.0', // Ensure version is preserved
    }

    // Write to file
    const configPath = this.getConfigPath(workspacePath)
    await fs.writeFile(configPath, JSON.stringify(updatedConfig, null, 2), 'utf-8')

    log.info({ data: workspaceId }, 'Config updated')
    return updatedConfig
  }

  /**
   * Create default configuration using slug from database
   * Database is the single source of truth for slugs
   */
  private async createDefaultConfig(
    workspacePath: string,
    workspaceId: string,
  ): Promise<WorkspaceConfig> {
    // Get slug from database (database is source of truth)
    let slug = await this.getSlugFromDatabase(workspaceId)

    if (!slug) {
      // Fallback: Database doesn't have slug yet, generate one
      log.warn(
        `[WorkspaceConfigService] No slug in database for workspace ${workspaceId}, generating fallback`,
      )
      slug = await ensureUniqueSlug(
        generateRandomSlug('workspace'),
        async (candidateSlug) => await this.checkSlugExists(candidateSlug, workspaceId),
        { maxAttempts: 10, prefix: 'workspace' },
      )

      // Update database with generated slug
      try {
        await workspaceRepository.updateWorkspace(workspaceId, { slug })
      } catch (updateError) {
        log.error({ err: updateError }, 'Failed to update database slug')
      }
    }

    const config: WorkspaceConfig = {
      slug,
      version: '1.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Ensure workspace directory exists
    await fs.mkdir(workspacePath, { recursive: true })

    // Write config file
    const configPath = this.getConfigPath(workspacePath)
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8')

    log.info({ workspaceId, slug }, 'Created default config from database')
    return config
  }

  /**
   * Validate workspace slug
   * Checks format and uniqueness across all workspaces
   */
  async validateSlug(
    slug: string,
    currentWorkspaceId?: string,
  ): Promise<{ valid: boolean; error?: string }> {
    // Use centralized format validation
    const formatValidation = validateSlugFormat(slug)
    if (!formatValidation.valid) {
      return formatValidation
    }

    // Check uniqueness against database
    try {
      const slugExists = await this.checkSlugExists(slug, currentWorkspaceId)

      if (slugExists) {
        return {
          valid: false,
          error: `The slug "${slug}" is already in use by another workspace`,
        }
      }

      return { valid: true }
    } catch (error) {
      log.error({ err: error }, 'Error checking slug uniqueness')
      return {
        valid: false,
        error: 'Failed to validate slug uniqueness',
      }
    }
  }

  /**
   * Check if a slug exists across all workspaces
   * Queries the workspaces table for slug uniqueness
   */
  async checkSlugExists(slug: string, excludeWorkspaceId?: string): Promise<boolean> {
    try {
      return await workspaceRepository.checkSlugExists(slug, excludeWorkspaceId)
    } catch (error) {
      log.error({ err: error }, 'Error')
      throw error
    }
  }

  /**
   * Get slug from database
   * Database is the single source of truth for workspace slugs
   */
  private async getSlugFromDatabase(workspaceId: string): Promise<string | null> {
    try {
      return await workspaceRepository.getWorkspaceSlug(workspaceId)
    } catch (error) {
      log.error({ err: error }, 'Error')
      return null
    }
  }

  /**
   * Sync configuration from database
   * Updates the .workspace.json file to match the database slug
   */
  private async syncConfigFromDatabase(
    workspacePath: string,
    workspaceId: string,
    dbSlug: string,
  ): Promise<WorkspaceConfig> {
    const config: WorkspaceConfig = {
      slug: dbSlug,
      version: '1.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Ensure workspace directory exists
    await fs.mkdir(workspacePath, { recursive: true })

    // Write config file with database slug
    const configPath = this.getConfigPath(workspacePath)
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8')

    log.info({ workspaceId, slug: dbSlug }, 'Synced config from database')
    return config
  }
}

export const workspaceConfigService: IWorkspaceConfigService = new WorkspaceConfigService()
