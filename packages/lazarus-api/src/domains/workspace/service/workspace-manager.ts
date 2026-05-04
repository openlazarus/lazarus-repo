import * as path from 'path'
import * as fs from 'fs/promises'
import { WorkspaceAgentService } from '@domains/agent/service/workspace-agent.service'
import { isValidId } from '@utils/id-validation'
import { workspaceRepository } from '@domains/workspace/repository/workspace.repository'
import type { Workspace, WorkspaceFile } from '@domains/workspace/types/workspace.types'
import type { IWorkspaceManager } from './workspace-manager.interface'
import { createLogger } from '@utils/logger'
const log = createLogger('workspace-manager')

export class WorkspaceManager implements IWorkspaceManager {
  private basePath: string
  private isProduction: boolean

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production'
    // Use STORAGE_BASE_PATH environment variable if set, otherwise use defaults
    this.basePath =
      process.env.STORAGE_BASE_PATH ||
      (this.isProduction ? path.join(process.env.HOME || '~', 'storage') : './storage')

    log.info(`Initialized with basePath: ${this.basePath}`)
  }

  /**
   * List all workspaces for a user
   * Queries Supabase for workspaces the user owns or is a member of
   */
  async listWorkspaces(userId: string): Promise<Workspace[]> {
    if (!isValidId(userId)) {
      log.error({ err: userId }, 'listWorkspaces called with invalid userId')
      return []
    }

    const workspaces: Workspace[] = []
    const workspaceIds = new Set<string>()

    try {
      // 1. Get workspaces owned by user
      try {
        const ownedRows = await workspaceRepository.getWorkspacesByOwnerId(userId)
        for (const wsRow of ownedRows) {
          if (!workspaceIds.has(wsRow.id)) {
            workspaceIds.add(wsRow.id)
            workspaces.push(this.convertWorkspaceRow(wsRow))
          }
        }
      } catch (ownedError) {
        log.error({ err: ownedError }, 'Error getting owned workspaces')
      }

      // 2. Get workspaces where user is a member (via workspace_members)
      try {
        const memberIds = await workspaceRepository.getMemberWorkspaceIds(userId)
        if (memberIds.length > 0) {
          const memberRows = await workspaceRepository.getWorkspacesByIds(memberIds)
          for (const wsRow of memberRows) {
            if (!workspaceIds.has(wsRow.id)) {
              workspaceIds.add(wsRow.id)
              workspaces.push(this.convertWorkspaceRow(wsRow))
            }
          }
        }
      } catch (memberError) {
        log.error({ err: memberError }, 'Error getting workspace memberships')
      }

      // Sort by updated date
      workspaces.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

      log.info(`Found ${workspaces.length} workspaces for user ${userId}`)

      return workspaces
    } catch (error) {
      log.error({ err: error }, 'Error listing workspaces')

      // Fallback to filesystem scan if Supabase fails
      log.info('Falling back to filesystem scan')
      return this.listWorkspacesFromFilesystem(userId)
    }
  }

  /**
   * Helper to convert Supabase workspace row to Workspace object
   */
  private convertWorkspaceRow(wsRow: any): Workspace {
    // Determine correct path based on settings or default structure
    // Priority: 1. settings.path (if stored), 2. workspaces/{workspaceId} structure
    const settings = (wsRow.settings as Record<string, any>) || {}
    let workspacePath: string

    if (settings.path) {
      // Path stored in settings (new workspaces)
      workspacePath = settings.path
    } else {
      // Default workspace path structure: workspaces/{workspaceId}
      // Ownership is handled by Supabase database, not filesystem structure
      workspacePath = path.join(this.basePath, 'workspaces', wsRow.id)
    }

    return {
      id: wsRow.id,
      name: wsRow.name,
      slug: wsRow.slug || undefined,
      description: wsRow.description || undefined,
      path: workspacePath,
      ownerId: wsRow.owner_id || wsRow.user_id,
      status: 'active',
      createdAt: wsRow.created_at,
      updatedAt: wsRow.updated_at,
      mcpServers: settings.mcpServers || [],
      metadata: settings || {},
    }
  }

  /**
   * Fallback method to list workspaces from filesystem
   * Used when Supabase is unavailable or for migration
   * NOTE: Only reads from flat structure workspaces/{workspaceId}, does NOT create directories
   */
  private async listWorkspacesFromFilesystem(userId: string): Promise<Workspace[]> {
    const workspaces: Workspace[] = []

    // Only scan flat workspace structure: storage/workspaces/
    // Do NOT create directories or use nested userId structure
    const workspacesDir = path.join(this.basePath, 'workspaces')
    try {
      const dirs = await fs.readdir(workspacesDir)

      for (const dir of dirs) {
        // Skip hidden folders and non-workspace directories
        if (dir.startsWith('.')) continue

        const workspacePath = path.join(workspacesDir, dir)
        const stat = await fs.stat(workspacePath)

        if (stat.isDirectory()) {
          try {
            const workspace = await this.loadWorkspaceMetadata(workspacePath, dir, userId)
            // Only include if workspace belongs to user (checked in loadWorkspaceMetadata)
            if (workspace.ownerId === userId) {
              workspaces.push(workspace)
            }
          } catch (err) {
            // Skip workspaces that can't be loaded
            log.warn(`Skipping workspace ${dir}: ${err}`)
          }
        }
      }
    } catch (error) {
      log.error({ err: error }, 'Error listing workspaces from filesystem')
    }

    // Sort by updated date
    workspaces.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

    return workspaces
  }

  /**
   * Get a specific workspace
   */
  async getWorkspace(workspaceId: string, userId: string): Promise<Workspace | null> {
    if (!isValidId(userId) || !isValidId(workspaceId)) {
      log.error({ err: { userId, workspaceId } }, 'getWorkspace called with invalid args')
      return null
    }

    const wsRow = await workspaceRepository.getWorkspaceById(workspaceId)

    if (!wsRow) {
      return null
    }

    // Check access permissions
    // User must either own the workspace OR be a member of it
    const ownerId = wsRow.owner_id || wsRow.user_id
    if (ownerId !== userId) {
      const membershipData = await workspaceRepository.getWorkspaceMembership(workspaceId, userId)

      if (!membershipData) {
        log.info(`User ${userId} does not have access to workspace ${workspaceId}`)
        return null
      }
    }

    // Convert Supabase row to Workspace object (includes path property)
    const workspace = this.convertWorkspaceRow(wsRow)

    // Load slug from .workspace.json file in the workspace directory
    try {
      const metadataPath = path.join(workspace.path, '.workspace.json')
      const metadataContent = await fs.readFile(metadataPath, 'utf-8')
      const metadata = JSON.parse(metadataContent)

      // Merge slug from filesystem metadata
      if (metadata.slug) {
        workspace.slug = metadata.slug
      }
    } catch (error) {
      // .workspace.json doesn't exist or is invalid - that's ok, slug will be undefined
      log.info({ data: error }, `Could not load .workspace.json for ${workspace.id}:`)
    }

    return workspace
  }

  /**
   * Get or create default workspace for a user
   */
  async getOrCreateDefaultWorkspace(userId: string): Promise<Workspace> {
    // List all workspaces and find one that is default
    const workspaces = await this.listWorkspaces(userId)
    const defaultWorkspace = workspaces.find(
      (w) =>
        w.name === 'Default Workspace' ||
        w.name === 'My Workspace' ||
        w.metadata?.is_default === true,
    )

    if (defaultWorkspace) {
      // Workspace exists in database - ensure physical folders exist
      const workspacePath = defaultWorkspace.path

      try {
        // Check if workspace folder exists
        await fs.access(workspacePath)
        log.info(`Default workspace exists at: ${workspacePath}`)

        // Ensure system agents are initialized (idempotent operation)
        try {
          const agentService = new WorkspaceAgentService(this)
          await agentService.initializeSystemAgents(defaultWorkspace.id, userId)
        } catch (error) {
          log.error(
            { err: error },
            `Error ensuring system agents for workspace ${defaultWorkspace.id}:`,
          )
          // Don't throw - this is a background task
        }
      } catch {
        // Folder doesn't exist - create it along with default structure
        log.info(`Creating physical folders for workspace ${defaultWorkspace.id}`)
        await fs.mkdir(workspacePath, { recursive: true })

        // Save workspace metadata
        await this.saveWorkspaceMetadata(defaultWorkspace)

        // Create default structure (README, .sqlite, etc.)
        await this.createDefaultStructure(workspacePath)

        // Initialize system agents
        try {
          const agentService = new WorkspaceAgentService(this)
          await agentService.initializeSystemAgents(defaultWorkspace.id, userId)
          log.info(`Initialized system agents for workspace ${defaultWorkspace.id}`)
        } catch (error) {
          log.error(
            { err: error },
            `Error initializing system agents for workspace ${defaultWorkspace.id}:`,
          )
          // Don't throw - workspace creation succeeded, agent initialization can be retried
        }

        log.info(`Physical workspace created at: ${workspacePath}`)
      }

      return defaultWorkspace
    }

    // No default workspace found in database
    // This should only happen if the database trigger failed or user is being migrated
    log.warn(`No default workspace found in database for user ${userId}`)
    log.warn(`Auto-creating default workspace for user`)

    try {
      // Generate workspace ID with ws_ prefix (matching database trigger format)
      const workspaceId = `ws_${Math.random().toString(36).substring(2, 10)}`

      // Workspace path: storage/workspaces/{workspaceId}
      // Ownership is handled by Supabase database, not filesystem structure
      const workspacePath = path.join(this.basePath, 'workspaces', workspaceId)

      // Create workspace record in database
      const wsData = await workspaceRepository.insertWorkspace({
        id: workspaceId,
        name: 'My Workspace',
        description: 'Your default workspace',
        user_id: userId,
        owner_id: userId,
        is_default: true,
        settings: {
          mcpServers: [],
          is_default: true,
          path: workspacePath,
        },
      })

      // Create physical folder structure
      await fs.mkdir(workspacePath, { recursive: true })

      // Build workspace object
      const workspace: Workspace = {
        id: wsData.id,
        name: wsData.name,
        description: wsData.description || undefined,
        path: workspacePath,
        ownerId: userId,
        status: 'active',
        createdAt: wsData.created_at ?? new Date().toISOString(),
        updatedAt: wsData.updated_at ?? new Date().toISOString(),
        mcpServers: [],
        metadata: (wsData.settings as Record<string, any>) || {},
      }

      // Save workspace metadata to filesystem
      await this.saveWorkspaceMetadata(workspace)

      // Create default structure (README.md)
      await this.createDefaultStructure(workspacePath)

      // Owner row in workspace_members is created by trigger add_workspace_creator_as_member (see createWorkspace).

      // The user's billing account is shared across all workspaces they own

      // Initialize system agents
      try {
        const agentService = new WorkspaceAgentService(this)
        await agentService.initializeSystemAgents(workspace.id, userId)
        log.info(`Initialized system agents for workspace ${workspaceId}`)
      } catch (error) {
        log.error({ err: error }, `Error initializing system agents for workspace ${workspaceId}:`)
        // Don't throw - workspace creation succeeded, agent initialization can be retried
      }

      log.info(`Successfully created default workspace ${workspaceId} at ${workspacePath}`)

      return workspace
    } catch (error) {
      log.error({ err: error }, 'Error creating default workspace')
      throw new Error(
        `Failed to create default workspace: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Create a new workspace
   * Creates both the file system structure and Supabase metadata
   */
  async createWorkspace(
    name: string,
    ownerId: string,
    description?: string,
    mcpServers?: string[],
    _templateId: string = 'default',
  ): Promise<Workspace> {
    log.info(`Creating workspace "${name}" for user ${ownerId}`)

    try {
      // Generate unique workspace/server ID
      const workspaceId = this.generateWorkspaceId(name)

      // Workspace path: storage/workspaces/{workspaceId}/
      // Ownership is handled by Supabase database, not filesystem structure
      const basePath = path.join(this.basePath, 'workspaces', workspaceId)

      // Create database workspace record first
      log.info(`Inserting DB record for ${workspaceId}, path: ${basePath}`)
      await workspaceRepository.insertWorkspace({
        id: workspaceId,
        name,
        description: description || null,
        user_id: ownerId,
        owner_id: ownerId,
        settings: {
          mcpServers: mcpServers || [],
          path: basePath,
        },
      })
      log.info(`DB record created for ${workspaceId}`)

      // Create file system structure
      log.info(`Creating directory: ${basePath}`)
      await fs.mkdir(basePath, { recursive: true })
      log.info(`Directory created: ${basePath}`)

      const workspace: Workspace = {
        id: workspaceId,
        name,
        description,
        path: basePath,
        ownerId,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        mcpServers: mcpServers || [],
        metadata: {},
      }

      // Save workspace metadata to file
      log.info(`Saving workspace metadata to ${basePath}/.workspace.json`)
      await this.saveWorkspaceMetadata(workspace)
      log.info(`Workspace metadata saved`)

      // Create default structure
      log.info(`Creating default structure in ${basePath}`)
      await this.createDefaultStructure(basePath)
      log.info(`Default structure created`)

      // Creator membership: DB trigger `on_workspace_created` → add_workspace_creator_as_member()

      // The owner's billing account is shared across all workspaces they own

      log.info(`Successfully created workspace ${workspaceId} at ${basePath}`)

      return workspace
    } catch (error) {
      log.error({ err: error }, 'Error creating workspace')
      throw error
    }
  }

  /**
   * Update workspace metadata
   * Updates both Supabase and file system
   */
  async updateWorkspace(workspace: Workspace): Promise<void> {
    workspace.updatedAt = new Date().toISOString()

    try {
      await workspaceRepository.updateWorkspace(workspace.id, {
        name: workspace.name,
        description: workspace.description || null,
        settings: {
          ...(workspace.metadata || {}),
          mcpServers: workspace.mcpServers || [],
          path: workspace.path,
        },
        updated_at: workspace.updatedAt,
      })

      // Update file system metadata
      await this.saveWorkspaceMetadata(workspace)
    } catch (error) {
      log.error({ err: error }, 'Error updating workspace')
      throw error
    }
  }

  /**
   * Delete a workspace
   * Soft deletes in Supabase and moves files to trash
   */
  async deleteWorkspace(workspaceId: string, userId: string): Promise<boolean> {
    try {
      const workspace = await this.getWorkspace(workspaceId, userId)
      if (!workspace) {
        log.info(`Workspace ${workspaceId} not found`)
        return false
      }

      // Verify user is the owner
      if (workspace.ownerId !== userId) {
        log.info(`User ${userId} is not the owner of workspace ${workspaceId}`)
        return false
      }

      // Delete workspace from database (cascade deletes members, billing, invitations)
      await workspaceRepository.deleteWorkspaceById(workspace.id)

      // Move workspace to trash instead of deleting immediately
      const trashPath = path.join(this.basePath, '.trash', `${workspaceId}-${Date.now()}`)

      await fs.mkdir(path.dirname(trashPath), { recursive: true })
      await fs.rename(workspace.path, trashPath)

      log.info(`Moved workspace ${workspaceId} to trash: ${trashPath}`)
      return true
    } catch (error) {
      log.error({ err: error }, 'Error deleting workspace')
      return false
    }
  }

  /**
   * Transfer workspace ownership to another user
   */
  async transferWorkspace(
    workspaceId: string,
    currentOwnerId: string,
    newOwnerId: string,
  ): Promise<boolean> {
    try {
      const workspace = await this.getWorkspace(workspaceId, currentOwnerId)
      if (!workspace) {
        log.info(`Workspace ${workspaceId} not found`)
        return false
      }

      // Verify current user is the owner
      if (workspace.ownerId !== currentOwnerId) {
        log.info(`User ${currentOwnerId} is not the owner of workspace ${workspaceId}`)
        return false
      }

      await workspaceRepository.transferWorkspaceOwnershipRpc(workspaceId, newOwnerId)

      log.info(`Transferred workspace ${workspaceId} from ${currentOwnerId} to ${newOwnerId}`)
      return true
    } catch (error) {
      log.error({ err: error }, 'Error transferring workspace')
      return false
    }
  }

  /**
   * Permanently delete a workspace from trash
   */
  async permanentlyDeleteWorkspace(workspaceId: string): Promise<boolean> {
    try {
      // Find workspace in trash
      const trashDir = path.join(this.basePath, '.trash')
      const trashEntries = await fs.readdir(trashDir)

      for (const entry of trashEntries) {
        if (entry.startsWith(`${workspaceId}-`)) {
          const trashPath = path.join(trashDir, entry)
          await fs.rm(trashPath, { recursive: true, force: true })
          log.info(`Permanently deleted workspace ${workspaceId} from trash`)
          return true
        }
      }

      return false
    } catch (error) {
      log.error({ err: error }, 'Error permanently deleting workspace')
      return false
    }
  }

  /**
   * List files in a workspace
   */
  async listFiles(workspacePath: string, relativePath: string = ''): Promise<WorkspaceFile[]> {
    const fullPath = path.join(workspacePath, relativePath)
    const files: WorkspaceFile[] = []

    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true })

      for (const entry of entries) {
        const filePath = path.join(relativePath, entry.name)
        const fullFilePath = path.join(workspacePath, filePath)
        const stat = await fs.stat(fullFilePath)

        files.push({
          name: entry.name,
          path: filePath,
          type: entry.isDirectory() ? 'directory' : 'file',
          size: entry.isFile() ? stat.size : undefined,
          modifiedAt: stat.mtime.toISOString(),
        })
      }
    } catch (error) {
      log.error({ err: error }, 'Error listing files')
    }

    return files
  }

  /**
   * Recursively search files in a workspace by name
   */
  async searchFiles(
    workspacePath: string,
    query: string,
    maxResults: number = 50,
  ): Promise<WorkspaceFile[]> {
    const results: WorkspaceFile[] = []
    const queryLower = query.toLowerCase()

    // Directories to skip during recursive search
    const skipDirs = new Set(['.agents', '.knowledge', 'node_modules', '.git', '.next'])

    const walk = async (dir: string, relativeTo: string) => {
      if (results.length >= maxResults) return

      try {
        const entries = await fs.readdir(dir, { withFileTypes: true })

        for (const entry of entries) {
          if (results.length >= maxResults) break

          // Skip hidden files/dirs and known large dirs
          if (entry.name.startsWith('.') || skipDirs.has(entry.name)) continue
          if (entry.name === 'projects.index.json' || entry.name === 'databases.index.json')
            continue

          const filePath = path.join(relativeTo, entry.name)
          const fullFilePath = path.join(dir, entry.name)

          if (entry.name.toLowerCase().includes(queryLower)) {
            try {
              const stat = await fs.stat(fullFilePath)
              results.push({
                name: entry.name,
                path: filePath,
                type: entry.isDirectory() ? 'directory' : 'file',
                size: entry.isFile() ? stat.size : undefined,
                modifiedAt: stat.mtime.toISOString(),
              })
            } catch (err) {
              log.debug({ err }, "Skip files we can't stat")
            }
          }

          // Recurse into directories
          if (entry.isDirectory()) {
            await walk(fullFilePath, filePath)
          }
        }
      } catch (err) {
        log.debug({ err }, "Skip directories we can't read")
      }
    }

    await walk(workspacePath, '')
    return results
  }

  /**
   * Read a file from workspace
   */
  async readFile(
    workspacePath: string,
    filePath: string,
  ): Promise<{ content: string; encoding: 'utf-8' | 'base64'; size: number }> {
    const fullPath = path.join(workspacePath, filePath)
    const stats = await fs.stat(fullPath)
    const ext = path.extname(filePath).toLowerCase()
    const textExtensions = [
      '.txt',
      '.md',
      '.json',
      '.js',
      '.ts',
      '.tsx',
      '.jsx',
      '.py',
      '.sql',
      '.css',
      '.html',
      '.xml',
      '.csv',
      '.log',
      '.yaml',
      '.yml',
      '.toml',
      '.ini',
      '.cfg',
      '.conf',
      '.sh',
      '.bash',
      '.app',
      '.sqlite',
      '.env',
      '.gitignore',
      '.mdx',
      '.scss',
      '.sass',
      '.less',
      '.htm',
      '.svg',
      '.php',
      '.rb',
      '.go',
      '.rs',
      '.zsh',
      '.jsonc',
      '.dockerfile',
    ]

    if (textExtensions.includes(ext)) {
      const content = await fs.readFile(fullPath, 'utf-8')
      return { content, encoding: 'utf-8', size: stats.size }
    } else {
      const buffer = await fs.readFile(fullPath)
      return { content: buffer.toString('base64'), encoding: 'base64', size: stats.size }
    }
  }

  /**
   * Write a file to workspace
   */
  async writeFile(
    workspacePath: string,
    filePath: string,
    content: string,
    encoding: 'utf-8' | 'base64' = 'utf-8',
  ): Promise<void> {
    const fullPath = path.join(workspacePath, filePath)
    const dir = path.dirname(fullPath)
    await fs.mkdir(dir, { recursive: true })

    if (encoding === 'base64') {
      // Decode base64 to binary and write
      const buffer = Buffer.from(content, 'base64')
      await fs.writeFile(fullPath, buffer)
    } else {
      // Write as text
      await fs.writeFile(fullPath, content, 'utf-8')
    }
  }

  /**
   * Delete a file or directory from workspace
   */
  async deleteFile(workspacePath: string, filePath: string): Promise<void> {
    const fullPath = path.join(workspacePath, filePath)
    const stats = await fs.stat(fullPath)

    if (stats.isDirectory()) {
      // Use recursive removal for directories
      await fs.rm(fullPath, { recursive: true, force: true })
    } else {
      // Use unlink for files
      await fs.unlink(fullPath)
    }
  }

  /**
   * Move a file or directory within a workspace
   */
  async moveFile(
    workspacePath: string,
    sourcePath: string,
    destinationPath: string,
  ): Promise<void> {
    const fullSourcePath = path.join(workspacePath, sourcePath)
    const fullDestPath = path.join(workspacePath, destinationPath)

    // Check if source exists
    try {
      await fs.access(fullSourcePath)
    } catch (error) {
      throw new Error(`Source file not found: ${sourcePath}`)
    }

    // Check if destination already exists
    try {
      await fs.access(fullDestPath)
      throw new Error(`Destination already exists: ${destinationPath}`)
    } catch (error) {
      // Good - destination doesn't exist
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error
      }
    }

    // Ensure destination directory exists
    const destDir = path.dirname(fullDestPath)
    await fs.mkdir(destDir, { recursive: true })

    // Move the file
    await fs.rename(fullSourcePath, fullDestPath)
  }

  /**
   * Get workspace context for AI
   */
  async getWorkspaceContext(workspace: Workspace): Promise<string> {
    const files = await this.listFiles(workspace.path)
    const fileTree = this.buildFileTree(files)

    let context = `Workspace: ${workspace.name}\n`
    context += `Description: ${workspace.description || 'No description'}\n`
    context += `Path: ${workspace.path}\n`
    context += `MCP Servers: ${workspace.mcpServers?.join(', ') || 'None'}\n\n`
    context += `File Structure:\n${fileTree}\n`

    // Try to read README if exists
    try {
      const readme = await this.readFile(workspace.path, 'README.md')
      context += `\nREADME.md:\n${readme.content.substring(0, 1000)}...\n`
    } catch (err) {
      log.debug({ err }, 'No README')
    }

    // Try to read package.json if exists
    try {
      const packageJson = await this.readFile(workspace.path, 'package.json')
      const pkg = JSON.parse(packageJson.content)
      context += `\nProject: ${pkg.name} v${pkg.version}\n`
      context += `Dependencies: ${Object.keys(pkg.dependencies || {}).join(', ')}\n`
    } catch (err) {
      log.debug({ err }, 'No package.json')
    }

    return context
  }

  private async loadWorkspaceMetadata(
    workspacePath: string,
    workspaceId: string,
    ownerId: string,
  ): Promise<Workspace> {
    const metadataPath = path.join(workspacePath, '.workspace.json')

    try {
      const metadata = await fs.readFile(metadataPath, 'utf-8')
      return JSON.parse(metadata)
    } catch {
      // Create default metadata if not exists
      const stat = await fs.stat(workspacePath)
      const workspace: Workspace = {
        id: workspaceId,
        name: workspaceId,
        path: workspacePath,
        ownerId: ownerId,
        createdAt: stat.birthtime.toISOString(),
        updatedAt: stat.mtime.toISOString(),
      }

      await this.saveWorkspaceMetadata(workspace)
      return workspace
    }
  }

  private async saveWorkspaceMetadata(workspace: Workspace): Promise<void> {
    const metadataPath = path.join(workspace.path, '.workspace.json')
    await fs.writeFile(metadataPath, JSON.stringify(workspace, null, 2))
  }

  private async createDefaultStructure(workspacePath: string): Promise<void> {
    // Create default README
    const readme = `# New Workspace

This workspace was created on ${new Date().toISOString()}

## Getting Started
Start by adding your files and organizing your workspace.

## Sharing
You can invite collaborators to this workspace:
1. Open Workspace Settings
2. Go to the Members tab
3. Add people by email

Each person gets a role:
- **Admin**: Can manage members and settings
- **Editor**: Can edit files
- **Viewer**: Can only view files
`

    await fs.writeFile(path.join(workspacePath, 'README.md'), readme)
  }

  private generateWorkspaceId(name: string): string {
    const sanitized = name.toLowerCase().replace(/[^a-z0-9-]/g, '-')
    const timestamp = Date.now().toString(36)
    return `${sanitized}-${timestamp}`
  }

  private buildFileTree(files: WorkspaceFile[], indent: string = ''): string {
    let tree = ''
    const sorted = files.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })

    for (const file of sorted) {
      const icon = file.type === 'directory' ? '📁' : '📄'
      tree += `${indent}${icon} ${file.name}\n`
    }

    return tree
  }

  /**
   * Sync a workspace from filesystem to Supabase
   * Used for migration of existing workspaces
   */
  async syncWorkspaceToSupabase(
    workspacePath: string,
    userId: string,
  ): Promise<{ success: boolean; workspaceId?: string; error?: string }> {
    try {
      // Load workspace metadata from file
      const metadataPath = path.join(workspacePath, '.workspace.json')
      let workspace: Workspace

      try {
        const metadata = await fs.readFile(metadataPath, 'utf-8')
        workspace = JSON.parse(metadata)
      } catch {
        // Create default metadata
        const workspaceId = path.basename(workspacePath)
        workspace = {
          id: workspaceId,
          name: workspaceId,
          path: workspacePath,
          ownerId: userId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      }

      // Check if workspace already exists in database
      const existingWorkspace = await workspaceRepository.findWorkspaceById(workspace.id)

      if (existingWorkspace) {
        return {
          success: true,
          workspaceId: existingWorkspace.id,
          error: 'Workspace already synced',
        }
      }

      // Create workspace record
      const newWorkspace = await workspaceRepository.insertWorkspace({
        id: workspace.id,
        name: workspace.name,
        description: workspace.description || null,
        user_id: userId,
        owner_id: userId,
        settings: {
          path: workspacePath,
          mcpServers: workspace.mcpServers || [],
          synced_at: new Date().toISOString(),
        },
      })

      // Member row created by DB trigger add_workspace_creator_as_member on workspaces insert.

      // The user's billing account is shared across all workspaces they own

      // Update workspace metadata file
      workspace.ownerId = userId
      await this.saveWorkspaceMetadata(workspace)

      log.info(`Successfully synced workspace ${workspace.id} to Supabase`)

      return {
        success: true,
        workspaceId: newWorkspace.id,
      }
    } catch (error) {
      log.error({ err: error }, 'Error syncing workspace')
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}
