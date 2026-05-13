import { Request, Response } from 'express'
import * as crypto from 'crypto'
import * as path from 'path'
import * as fs from 'fs/promises'
import * as fsSync from 'fs'
import { execSync } from 'child_process'
import { mcpConfigManager } from '@domains/mcp/service/mcp-config-manager'
import { mcpOAuthService } from '@domains/mcp/service/mcp-oauth.service'
import { WorkspaceManager } from '@domains/workspace/service/workspace-manager'
import { MCPDirectTester } from '@infrastructure/config/mcp-direct-tester'
import { getAllPresets, getPresetCategories, getPreset } from '@infrastructure/config/mcp-presets'
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InternalServerError,
} from '@errors/api-errors'
import { createLogger } from '@utils/logger'
const log = createLogger('workspace-mcp')

const workspaceManager = new WorkspaceManager()

/**
 * Find and kill MCP processes for a workspace, optionally filtered by server command pattern.
 * Verifies each process belongs to the workspace via /proc/{pid}/environ before killing.
 */
function findAndKillMCPProcesses(
  workspaceId: string,
  serverConfig?: { command?: string; args?: string[] },
): { killed: number; pids: number[] } {
  const backendPid = process.pid
  const backendPpid = process.ppid

  let commandPattern: string | null = null
  if (serverConfig) {
    const allParts = [serverConfig.command, ...(serverConfig.args || [])].filter(Boolean)
    const genericParts = new Set(['npx', 'node', 'npm', 'pnpm', 'pnpx', '-y', 'exec'])
    const specificPart = allParts.find((part) => !genericParts.has(part!) && !part!.startsWith('-'))
    if (specificPart) {
      commandPattern = specificPart
    }
  }

  let candidatePids: number[] = []
  try {
    const pgrepOutput = execSync('pgrep -u lazarus -f "node|npm"', {
      encoding: 'utf-8',
      timeout: 5000,
    })
    candidatePids = pgrepOutput
      .trim()
      .split('\n')
      .map((p) => parseInt(p, 10))
      .filter((p) => !isNaN(p))
  } catch {
    return { killed: 0, pids: [] }
  }

  const killedPids: number[] = []
  for (const pid of candidatePids) {
    if (pid === backendPid || pid === backendPpid) continue

    try {
      const environ = fsSync.readFileSync(`/proc/${pid}/environ`, 'utf-8')
      if (!environ.includes(`LAZARUS_WORKSPACE_ID=${workspaceId}`)) continue

      if (commandPattern) {
        try {
          const cmdline = fsSync.readFileSync(`/proc/${pid}/cmdline`, 'utf-8')
          if (!cmdline.includes(commandPattern)) continue
        } catch {
          continue
        }
      }

      try {
        process.kill(pid, 'SIGTERM')
        killedPids.push(pid)
      } catch (killErr: any) {
        if (killErr.code !== 'ESRCH') {
          log.warn({ data: killErr.message }, `Failed to kill PID ${pid}:`)
        }
      }
    } catch (err) {
      log.debug({ err }, "Can't read /proc/{pid}/environ — skip")
    }
  }

  return { killed: killedPids.length, pids: killedPids }
}

class WorkspaceMcpController {
  async getSources(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const userId = req.user!.id

    const workspace = await workspaceManager.getWorkspace(workspaceId, userId)
    if (!workspace) {
      throw new NotFoundError('Workspace', workspaceId)
    }

    const currentConfig = await mcpConfigManager.getResolvedWorkspaceMCPConfig(workspace.path)
    const workspaceMCPs = currentConfig.mcpServers || {}

    const builtInMCPs = mcpConfigManager.getBuiltInMCPs()

    const allServersObj = {
      ...workspaceMCPs,
      ...builtInMCPs,
    }

    const allServersPromises = Object.entries(allServersObj).map(async ([name, config]) => {
      const presetId = (config as any).preset_id
      const requiresOAuth = mcpOAuthService.requiresOAuth(config, presetId)

      let oauthState = undefined
      let authInstructions = undefined

      if (requiresOAuth) {
        oauthState = await mcpOAuthService.getServerOAuthState(workspace.path, name)
        if (presetId) {
          const preset = getPreset(presetId)
          authInstructions = preset?.authInstructions
        }
      }

      return {
        name,
        ...config,
        has_env: !!(config.env && Object.keys(config.env).length > 0),
        requiresOAuth,
        oauthState,
        authInstructions,
      }
    })

    const allServers = await Promise.all(allServersPromises)

    const enabledServers = Object.keys(allServersObj).filter(
      (name) => allServersObj[name]!.enabled !== false,
    )

    const serversByCategory: Record<string, any[]> = {}

    for (const server of allServers) {
      const rawCat = 'category' in server ? (server as { category?: unknown }).category : undefined
      const category = typeof rawCat === 'string' && rawCat.length > 0 ? rawCat : 'default'
      if (!serversByCategory[category]) {
        serversByCategory[category] = []
      }

      serversByCategory[category].push({
        ...server,
        enabledInWorkspace: server.enabled !== false,
      })
    }

    return res.json({
      availableServers: allServers,
      serversByCategory,
      categories: Object.keys(serversByCategory),
      presets: {},
      enabledInWorkspace: enabledServers,
    })
  }

  async getPresets(_req: Request, res: Response) {
    const presets = getAllPresets()
    const categories = getPresetCategories()

    const presetsWithOAuth = presets.map((preset) => ({
      ...preset,
      requiresOAuth: preset.authType === 'oauth' || preset.authType === 'oauth_pkce',
    }))

    return res.json({
      presets: presetsWithOAuth,
      categories,
      total: presetsWithOAuth.length,
    })
  }

  async getConfig(req: Request, res: Response) {
    log.info({ data: req.workspaceId }, 'DEBUG: MCP GET route called for workspaceId')
    const workspaceId = req.workspace!.id
    const userId = req.user!.id

    const workspace = await workspaceManager.getWorkspace(workspaceId, userId)
    if (!workspace) {
      throw new NotFoundError('Workspace', workspaceId)
    }

    log.info({ data: workspace.path }, 'DEBUG: workspace.path =')

    const resolvedConfig = await mcpConfigManager.getResolvedWorkspaceMCPConfig(workspace.path)

    log.info(
      { data: JSON.stringify(resolvedConfig.mcpServers, null, 2) },
      'DEBUG: resolvedConfig.mcpServers =',
    )

    return res.json({
      workspaceId,
      mcpConfig: resolvedConfig,
    })
  }

  async updateConfig(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const userId = req.user!.id

    const workspace = await workspaceManager.getWorkspace(workspaceId, userId)
    if (!workspace) {
      throw new NotFoundError('Workspace', workspaceId)
    }

    const { mcpServers, version, description } = req.body

    await mcpConfigManager.saveWorkspaceMCPConfig(workspace.path, {
      mcpServers: mcpServers || {},
      version: version || '1.0',
      description,
    })

    return res.json({ success: true })
  }

  async enableServer(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const serverName = req.params.serverName!
    const userId = req.user!.id

    const workspace = await workspaceManager.getWorkspace(workspaceId, userId)
    if (!workspace) {
      throw new NotFoundError('Workspace', workspaceId)
    }

    const rawConfig = await mcpConfigManager.getWorkspaceMCPConfig(workspace.path)
    const builtInMCPs = mcpConfigManager.getBuiltInMCPs()

    const serverInRawConfig = rawConfig?.mcpServers?.[serverName]
    const isBuiltIn = !!builtInMCPs[serverName]

    if (!serverInRawConfig && !isBuiltIn) {
      throw new NotFoundError('Server', serverName)
    }

    if (isBuiltIn && !serverInRawConfig) {
      return res.json({
        success: true,
        message: `Built-in server '${serverName}' is always enabled`,
      })
    }

    await mcpConfigManager.toggleMCPServer(workspace.path, serverName, true)

    return res.json({ success: true, message: `Server '${serverName}' enabled for workspace` })
  }

  async disableServer(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const serverName = req.params.serverName!
    const userId = req.user!.id

    const workspace = await workspaceManager.getWorkspace(workspaceId, userId)
    if (!workspace) {
      throw new NotFoundError('Workspace', workspaceId)
    }

    const currentConfig = await mcpConfigManager.getWorkspaceMCPConfig(workspace.path)
    const builtInMCPs = mcpConfigManager.getBuiltInMCPs()

    if (builtInMCPs[serverName]) {
      throw new ForbiddenError(`Cannot disable built-in server '${serverName}'`)
    }

    if (!currentConfig?.mcpServers?.[serverName]) {
      throw new NotFoundError('Server', serverName)
    }

    await mcpConfigManager.toggleMCPServer(workspace.path, serverName, false)

    return res.json({ success: true, message: `Server '${serverName}' disabled for workspace` })
  }

  async deleteServer(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const serverName = req.params.serverName!
    const userId = req.user!.id

    const workspace = await workspaceManager.getWorkspace(workspaceId, userId)
    if (!workspace) {
      throw new NotFoundError('Workspace', workspaceId)
    }

    const currentConfig = await mcpConfigManager.getResolvedWorkspaceMCPConfig(workspace.path)
    const server = currentConfig.mcpServers?.[serverName]
    const presetId = (server as any)?.preset_id

    await mcpConfigManager.removeMCPServer(workspace.path, serverName)

    const credentialsDir = path.join(workspace.path, '.mcp-credentials', serverName)
    try {
      await fs.rm(credentialsDir, { recursive: true, force: true })
    } catch (error) {
      log.info(`No credentials to clean up for server '${serverName}'`)
    }

    try {
      await mcpOAuthService.clearOAuthState(workspace.path, serverName)

      const remoteUrl =
        (server as any)?.oauth?.remoteUrl ||
        (presetId ? getPreset(presetId)?.oauth?.remoteUrl : undefined)
      if (remoteUrl) {
        const hash = crypto.createHash('md5').update(remoteUrl).digest('hex')
        const authDir = path.join(workspace.path, '.mcp-auth')
        try {
          const entries = await fs.readdir(authDir)
          for (const dir of entries.filter((e: string) => e.startsWith('mcp-remote-'))) {
            const versionedDir = path.join(authDir, dir)
            const files = await fs.readdir(versionedDir)
            for (const file of files.filter((f: string) => f.startsWith(hash))) {
              await fs.unlink(path.join(versionedDir, file))
            }
          }
        } catch (err) {
          log.debug({ err }, 'Auth dir might not exist')
        }
      }
    } catch (error) {
      log.info({ data: error }, `OAuth cleanup for server '${serverName}':`)
    }

    return res.json({ success: true })
  }

  async toggleServer(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const serverName = req.params.serverName!
    const { enabled } = req.body
    const userId = req.user!.id

    const workspace = await workspaceManager.getWorkspace(workspaceId, userId)
    if (!workspace) {
      throw new NotFoundError('Workspace', workspaceId)
    }

    await mcpConfigManager.toggleMCPServer(workspace.path, serverName, enabled)

    return res.json({ success: true })
  }

  async updateServer(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const serverName = req.params.serverName!
    const userId = req.user!.id

    const workspace = await workspaceManager.getWorkspace(workspaceId, userId)
    if (!workspace) {
      throw new NotFoundError('Workspace', workspaceId)
    }

    const builtInMCPs = mcpConfigManager.getBuiltInMCPs()
    if (builtInMCPs[serverName]) {
      throw new ForbiddenError(`Cannot edit built-in server '${serverName}'`)
    }

    const currentConfig = await mcpConfigManager.getWorkspaceMCPConfig(workspace.path)
    if (!currentConfig || !currentConfig.mcpServers?.[serverName]) {
      throw new NotFoundError('Server', serverName)
    }

    const { description, category, command, args, icon } = req.body

    const updatedServer = {
      ...currentConfig.mcpServers[serverName],
      ...(description !== undefined && { description }),
      ...(category !== undefined && { category }),
      ...(command !== undefined && { command }),
      ...(args !== undefined && { args }),
      ...(icon !== undefined && { icon }),
    }

    await mcpConfigManager.addMCPServer(workspace.path, serverName, updatedServer)

    return res.json({
      success: true,
      message: `Server '${serverName}' updated successfully`,
      server: updatedServer,
    })
  }

  async updateServerEnv(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const serverName = req.params.serverName!
    const { env } = req.body
    const userId = req.user!.id

    if (!env || typeof env !== 'object') {
      throw new BadRequestError('Invalid env object')
    }

    const workspace = await workspaceManager.getWorkspace(workspaceId, userId)
    if (!workspace) {
      throw new NotFoundError('Workspace', workspaceId)
    }

    const builtInMCPs = mcpConfigManager.getBuiltInMCPs()
    if (builtInMCPs[serverName]) {
      throw new ForbiddenError(
        `Cannot edit environment variables for built-in server '${serverName}'`,
      )
    }

    const currentConfig = await mcpConfigManager.getWorkspaceMCPConfig(workspace.path)
    if (!currentConfig || !currentConfig.mcpServers?.[serverName]) {
      throw new NotFoundError('Server', serverName)
    }

    const updatedServer = {
      ...currentConfig.mcpServers[serverName],
      env: {
        ...currentConfig.mcpServers[serverName].env,
        ...env,
      },
    }

    await mcpConfigManager.addMCPServer(workspace.path, serverName, updatedServer)

    return res.json({
      success: true,
      message: `Environment variables updated for '${serverName}'`,
    })
  }

  async addServer(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const serverName = req.params.serverName!
    const userId = req.user!.id

    const workspace = await workspaceManager.getWorkspace(workspaceId, userId)
    if (!workspace) {
      throw new NotFoundError('Workspace', workspaceId)
    }

    const currentConfig = await mcpConfigManager.getWorkspaceMCPConfig(workspace.path)
    const builtInMCPs = mcpConfigManager.getBuiltInMCPs()

    if (currentConfig?.mcpServers?.[serverName] || builtInMCPs[serverName]) {
      throw new ConflictError(`Server '${serverName}' already exists in workspace`)
    }

    const { command, args, env, enabled = true, description, category, icon, preset_id } = req.body

    let serverConfig: any

    if (preset_id) {
      const preset = getPreset(preset_id)

      if (!preset) {
        throw new NotFoundError('Preset', preset_id)
      }

      serverConfig = {
        command: preset.command,
        args: preset.args,
        env: env || {},
        enabled,
        transport: preset.transport || 'stdio',
        description: description || preset.description,
        category: category || preset.category,
        icon: icon || preset.icon,
        preset_id,
      }
    } else {
      if (!command) {
        throw new BadRequestError('Command is required when not using a preset')
      }

      if (args && !Array.isArray(args)) {
        throw new BadRequestError('Args must be an array')
      }

      serverConfig = {
        command,
        args: args || [],
        env: env || {},
        enabled,
        transport: 'stdio' as const,
        ...(description && { description }),
        ...(category && { category }),
        ...(icon && { icon }),
      }
    }

    await mcpConfigManager.addMCPServer(workspace.path, serverName, serverConfig)

    return res.json({
      success: true,
      message: `Server '${serverName}' added to workspace`,
      server: { name: serverName, ...serverConfig },
    })
  }

  async testConnection(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const serverName = req.params.serverName!
    const userId = req.user!.id

    const workspace = await workspaceManager.getWorkspace(workspaceId, userId)
    if (!workspace) {
      throw new NotFoundError('Workspace', workspaceId)
    }

    const currentConfig = await mcpConfigManager.getResolvedWorkspaceMCPConfig(workspace.path)
    const builtInMCPs = mcpConfigManager.getBuiltInMCPs()

    const server = currentConfig.mcpServers?.[serverName] || builtInMCPs[serverName]

    if (!server) {
      throw new NotFoundError('Server', serverName)
    }

    const presetId = (server as any).preset_id
    const requiresOAuth = mcpOAuthService.requiresOAuth(server, presetId)
    let result: any

    if (requiresOAuth) {
      const oauthState = await mcpOAuthService.getServerOAuthState(workspace.path, serverName)

      if (oauthState.status === 'authorized') {
        const remoteUrl =
          (server as any).oauth?.remoteUrl ||
          (presetId ? getPreset(presetId)?.oauth?.remoteUrl : undefined)

        if (remoteUrl) {
          let accessToken: string | undefined
          try {
            const hash = crypto.createHash('md5').update(remoteUrl).digest('hex')
            const authDir = path.join(workspace.path, '.mcp-auth')
            const entries = await fs.readdir(authDir).catch(() => [])
            const mcpDir = entries
              .filter((e: string) => e.startsWith('mcp-remote-'))
              .sort()
              .pop()
            if (mcpDir) {
              const tokensPath = path.join(authDir, mcpDir, `${hash}_tokens.json`)
              const tokens = JSON.parse(await fs.readFile(tokensPath, 'utf-8'))
              accessToken = tokens.access_token
            }
          } catch (err) {
            log.debug({ err }, "Can't read tokens, fall through to stdio test")
          }

          if (accessToken) {
            result = await MCPDirectTester.testHttpServer({
              url: remoteUrl,
              headers: { Authorization: `Bearer ${accessToken}` },
            })
          }
        }
      }

      if (!result) {
        result = await MCPDirectTester.testMCPServerDirect(server, {
          MCP_REMOTE_CONFIG_DIR: `${workspace.path}/.mcp-auth`,
        })
      }
      result.oauthState = oauthState
      result.requiresOAuth = true

      if (presetId) {
        const preset = getPreset(presetId)
        if (preset?.authInstructions) {
          result.authInstructions = preset.authInstructions
        }
      }
    } else {
      result = await MCPDirectTester.testMCPServerDirect(server, {
        MCP_REMOTE_CONFIG_DIR: `${workspace.path}/.mcp-auth`,
      })
    }

    return res.json(result)
  }

  async getOAuthStatus(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const serverName = req.params.serverName!
    const userId = req.user!.id

    const workspace = await workspaceManager.getWorkspace(workspaceId, userId)
    if (!workspace) {
      throw new NotFoundError('Workspace', workspaceId)
    }

    const currentConfig = await mcpConfigManager.getResolvedWorkspaceMCPConfig(workspace.path)
    const builtInMCPs = mcpConfigManager.getBuiltInMCPs()
    const server = currentConfig.mcpServers?.[serverName] || builtInMCPs[serverName]

    if (!server) {
      throw new NotFoundError('Server', serverName)
    }

    const presetId = (server as any).preset_id
    const requiresOAuth = mcpOAuthService.requiresOAuth(server, presetId)

    if (!requiresOAuth) {
      return res.json({
        requiresOAuth: false,
        oauthState: { status: 'not_required' },
      })
    }

    const oauthState = await mcpOAuthService.getServerOAuthState(workspace.path, serverName)

    let authInstructions: string | undefined
    if (presetId) {
      const preset = getPreset(presetId)
      authInstructions = preset?.authInstructions
    }

    return res.json({
      requiresOAuth: true,
      oauthState,
      authInstructions,
    })
  }

  async initiateOAuth(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const serverName = req.params.serverName!
    const userId = req.user!.id

    const workspace = await workspaceManager.getWorkspace(workspaceId, userId)
    if (!workspace) {
      throw new NotFoundError('Workspace', workspaceId)
    }

    const currentConfig = await mcpConfigManager.getResolvedWorkspaceMCPConfig(workspace.path)
    const builtInMCPs = mcpConfigManager.getBuiltInMCPs()
    const server = currentConfig.mcpServers?.[serverName] || builtInMCPs[serverName]

    if (!server) {
      throw new NotFoundError('Server', serverName)
    }

    const presetId = (server as any).preset_id
    if (!mcpOAuthService.requiresOAuth(server, presetId)) {
      throw new BadRequestError('Server does not require OAuth')
    }

    const result = await mcpOAuthService.initiateOAuth(workspace.path, serverName, server)

    if (result.error) {
      throw new InternalServerError(result.error)
    }

    const oauthState = await mcpOAuthService.getServerOAuthState(workspace.path, serverName)

    let authInstructions: string | undefined
    if (presetId) {
      const preset = getPreset(presetId)
      authInstructions = preset?.authInstructions
    }

    return res.json({
      authorizationUrl: result.authorizationUrl,
      oauthState,
      authInstructions,
    })
  }

  async markAuthorized(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const serverName = req.params.serverName!
    const userId = req.user!.id

    const workspace = await workspaceManager.getWorkspace(workspaceId, userId)
    if (!workspace) {
      throw new NotFoundError('Workspace', workspaceId)
    }

    await mcpOAuthService.markAuthorized(workspace.path, serverName)

    return res.json({
      success: true,
      message: `Server '${serverName}' marked as authorized`,
      oauthState: await mcpOAuthService.getServerOAuthState(workspace.path, serverName),
    })
  }

  async clearOAuth(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const serverName = req.params.serverName!
    const userId = req.user!.id

    const workspace = await workspaceManager.getWorkspace(workspaceId, userId)
    if (!workspace) {
      throw new NotFoundError('Workspace', workspaceId)
    }

    await mcpOAuthService.clearOAuthState(workspace.path, serverName)

    return res.json({
      success: true,
      message: `OAuth state cleared for server '${serverName}'`,
    })
  }

  async initialize(req: Request, res: Response) {
    const workspaceId = req.workspaceId!
    const userId = req.user!.id

    let workspace = await workspaceManager.getWorkspace(workspaceId, userId)

    if (!workspace) {
      if (workspaceId === 'default') {
        workspace = await workspaceManager.getOrCreateDefaultWorkspace(userId)
      } else {
        throw new NotFoundError('Workspace', workspaceId)
      }
    }

    await mcpConfigManager.initializeWorkspaceMCP(workspace.path)

    return res.json({ success: true })
  }

  async copyConfig(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const { sourceWorkspaceId } = req.body
    const userId = req.user!.id

    const targetWorkspace = await workspaceManager.getWorkspace(workspaceId, userId)
    const sourceWorkspace = await workspaceManager.getWorkspace(sourceWorkspaceId, userId)

    if (!targetWorkspace || !sourceWorkspace) {
      throw new NotFoundError('Workspace', workspaceId)
    }

    await mcpConfigManager.copyMCPConfig(sourceWorkspace.path, targetWorkspace.path)

    return res.json({ success: true })
  }

  async uploadCredential(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const { serverName, envKey } = req.body
    const userId = req.user!.id

    if (!req.file) {
      throw new BadRequestError('No file uploaded')
    }

    if (!serverName) {
      throw new BadRequestError('Server name is required')
    }

    if (!envKey) {
      throw new BadRequestError('Environment variable key is required')
    }

    const workspace = await workspaceManager.getWorkspace(workspaceId, userId)
    if (!workspace) {
      throw new NotFoundError('Workspace', workspaceId)
    }

    if (req.file.mimetype !== 'application/json' && !req.file.originalname.endsWith('.json')) {
      throw new BadRequestError('Only JSON credential files are supported')
    }

    try {
      JSON.parse(req.file.buffer.toString('utf-8'))
    } catch (error) {
      throw new BadRequestError('Invalid JSON file')
    }

    const credentialsDir = path.join(workspace.path, '.mcp-credentials', serverName)
    await fs.mkdir(credentialsDir, { recursive: true })

    const fileName = req.file.originalname
    const filePath = path.join(credentialsDir, fileName)
    await fs.writeFile(filePath, req.file.buffer)

    return res.json({
      success: true,
      filePath: filePath,
      fileName: fileName,
      size: req.file.size,
      message: 'Credential file uploaded successfully',
    })
  }

  async deleteCredentials(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const serverName = req.params.serverName!
    const userId = req.user!.id

    const workspace = await workspaceManager.getWorkspace(workspaceId, userId)
    if (!workspace) {
      throw new NotFoundError('Workspace', workspaceId)
    }

    const credentialsDir = path.join(workspace.path, '.mcp-credentials', serverName)

    try {
      await fs.rm(credentialsDir, { recursive: true, force: true })
      return res.json({
        success: true,
        message: `Credentials deleted for server '${serverName}'`,
      })
    } catch (error) {
      return res.json({
        success: true,
        message: `No credentials found for server '${serverName}'`,
      })
    }
  }

  async restartServer(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const serverName = req.params.serverName!
    const userId = req.user!.id

    const workspace = await workspaceManager.getWorkspace(workspaceId, userId)
    if (!workspace) {
      throw new NotFoundError('Workspace', workspaceId)
    }

    const currentConfig = await mcpConfigManager.getResolvedWorkspaceMCPConfig(workspace.path)
    const builtInMCPs = mcpConfigManager.getBuiltInMCPs()
    const server = currentConfig.mcpServers?.[serverName] || builtInMCPs[serverName]

    if (!server) {
      throw new NotFoundError('Server', serverName)
    }

    const result = findAndKillMCPProcesses(workspaceId, server)

    log.info(
      `User ${userId} restarted server '${serverName}' in workspace ${workspaceId}: killed ${result.killed} processes`,
    )

    return res.json({
      success: true,
      killed: result.killed,
      message:
        result.killed > 0
          ? `Reconnected — killed ${result.killed} stale process${result.killed > 1 ? 'es' : ''}. New config will be used on next execution.`
          : 'No running processes found for this server.',
    })
  }

  async restartAll(req: Request, res: Response) {
    const workspaceId = req.workspace!.id
    const userId = req.user!.id

    const workspace = await workspaceManager.getWorkspace(workspaceId, userId)
    if (!workspace) {
      throw new NotFoundError('Workspace', workspaceId)
    }

    const result = findAndKillMCPProcesses(workspaceId)

    log.info(
      `User ${userId} restarted all MCP servers in workspace ${workspaceId}: killed ${result.killed} processes`,
    )

    return res.json({
      success: true,
      killed: result.killed,
      message:
        result.killed > 0
          ? `Reconnected — killed ${result.killed} stale process${result.killed > 1 ? 'es' : ''}. New config will be used on next execution.`
          : 'No running MCP processes found for this workspace.',
    })
  }
}

export const workspaceMcpController = new WorkspaceMcpController()
