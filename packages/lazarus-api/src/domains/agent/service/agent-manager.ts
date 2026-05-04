import * as path from 'path'
import * as fs from 'fs/promises'
import { wrapWithLazarusIdentity } from '@infrastructure/config/system-prompts'
import { agentRepository } from '@domains/agent/repository/agent.repository'
import { createLogger } from '@utils/logger'
import type { IAgentManager } from './agent-manager.interface'

const log = createLogger('agent-manager')

export interface MCPServerConfig {
  name: string
  command: string
  args?: string[]
  env?: Record<string, string>
  enabled: boolean
}

export interface AgentTools {
  allowed: string[]
  blocked: string[]
  customTools?: Record<string, any>
}

export interface AgentConfig {
  id: string
  name: string
  type: string
  version: string
  description: string
  basePrompt: string
  systemPrompts: {
    main: string
    guardrails?: string
    context?: string
    style?: string
  }
  workspaceId: string // Required workspace assignment
  mcpServers: Record<string, MCPServerConfig>
  activeMCPs?: string[] // Subset of workspace MCPs (if not set, inherits all workspace MCPs)
  tools: AgentTools
  modelConfig: {
    model: string
    temperature?: number
    maxTokens?: number
    topP?: number
  }
  memoryConfig: {
    types: string[]
    persistence: boolean
    consolidationInterval?: number
  }
  workspaceConfig: {
    persistentFiles: string[]
    allowedPaths: string[]
    blockedPaths: string[]
  }
  emailAddress?: string // Auto-generated: {agentId}@lazarusconnect.com
  emailProjectId?: string // Email-service project ID
  triggers?: string[] // Trigger IDs linked to this agent
  metadata: {
    created: string
    updated: string
    author: string
    tags: string[]
    scope: 'team' | 'global' // All agents are team or global scoped
  }
}

export interface AgentInstance {
  config_id: string
  instance_id: string
  user_id: string
  session_id: string
  workspace_path: string
  memory_path: string
  status: 'idle' | 'active' | 'suspended' | 'terminated'
  started_at: string
  last_activity: string
  context: Record<string, any>
}

export class AgentManager implements IAgentManager {
  private basePath: string
  private globalTemplatesPath: string

  constructor(basePath: string = './storage') {
    this.basePath = basePath
    this.globalTemplatesPath = path.join(basePath, 'templates', 'agents')
  }

  async initialize(): Promise<void> {
    // Create global templates directory
    await fs.mkdir(this.globalTemplatesPath, { recursive: true })
    await this.createGlobalTemplates()
  }

  private async getUserPersonalTeamId(userId: string): Promise<string | null> {
    return agentRepository.getUserPersonalTeamId(userId)
  }

  // Get paths for user or team (with automatic team lookup)
  private async getPaths(userId: string, teamId?: string) {
    // If no teamId provided, try to get user's personal team
    let effectiveTeamId = teamId
    if (!effectiveTeamId) {
      effectiveTeamId = (await this.getUserPersonalTeamId(userId)) ?? undefined
    }

    if (!effectiveTeamId) {
      throw new Error(`No team found for user ${userId}. User must belong to a team.`)
    }

    // Team-based storage paths (all storage is now team-based)
    return {
      base: path.join(this.basePath, 'teams', effectiveTeamId),
      configs: path.join(this.basePath, 'teams', effectiveTeamId, 'agents', 'configs'),
      instances: path.join(this.basePath, 'teams', effectiveTeamId, 'agents', 'instances'),
      workspaces: path.join(this.basePath, 'teams', effectiveTeamId, 'workspaces'),
      memory: path.join(this.basePath, 'teams', effectiveTeamId, 'memory', 'agents'),
    }
  }

  // Agent Configuration Management
  async saveAgentConfig(config: AgentConfig, userId: string, teamId?: string): Promise<void> {
    const paths = await this.getPaths(userId, teamId)
    await fs.mkdir(paths.configs, { recursive: true })

    // Auto-generate email address if not set
    if (!config.emailAddress) {
      config.emailAddress = `${config.id}@lazarusconnect.com`
    }

    // Validate workspace exists (check if workspace path exists)
    if (config.workspaceId) {
      const workspacePath = path.join(paths.workspaces, config.workspaceId)
      try {
        await fs.access(workspacePath)
      } catch {
        throw new Error(`Workspace ${config.workspaceId} does not exist for this user`)
      }
    }

    const configFile = path.join(paths.configs, `${config.id}.json`)
    // Ensure metadata exists
    if (!config.metadata) {
      config.metadata = {
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        author: userId,
        tags: [],
        scope: 'team', // All agents are team-scoped
      }
    } else {
      config.metadata.updated = new Date().toISOString()
      config.metadata.scope = 'team' // All agents are team-scoped
    }
    await this.writeJsonFile(configFile, config)
  }

  async loadAgentConfig(
    configId: string,
    userId: string,
    teamId?: string,
  ): Promise<AgentConfig | null> {
    // Try team config first if teamId provided
    if (teamId) {
      const teamPaths = await this.getPaths(userId, teamId)
      const teamConfig = await this.readJsonFile<AgentConfig>(
        path.join(teamPaths.configs, `${configId}.json`),
      )
      if (teamConfig) return teamConfig
    }

    // Try user config (which will resolve to their personal team)
    try {
      const userPaths = await this.getPaths(userId)
      const userConfig = await this.readJsonFile<AgentConfig>(
        path.join(userPaths.configs, `${configId}.json`),
      )
      if (userConfig) return userConfig
    } catch (err) {
      log.debug(
        { err, userId, configId },
        'User config lookup failed, falling back to global templates',
      )
    }

    // Try global templates
    const globalConfig = await this.readJsonFile<AgentConfig>(
      path.join(this.globalTemplatesPath, `${configId}.json`),
    )
    return globalConfig
  }

  async listAgentConfigs(userId: string, teamId?: string): Promise<AgentConfig[]> {
    const configs: AgentConfig[] = []

    // Get global templates
    const globalFiles = await this.listFiles(this.globalTemplatesPath)
    for (const file of globalFiles) {
      if (file.endsWith('.json')) {
        const config = await this.readJsonFile<AgentConfig>(file)
        if (config) {
          config.metadata.scope = 'global'
          configs.push(config)
        }
      }
    }

    // Get user configs (from their personal team)
    try {
      const userPaths = await this.getPaths(userId)
      const userFiles = await this.listFiles(userPaths.configs)
      for (const file of userFiles) {
        if (file.endsWith('.json')) {
          const config = await this.readJsonFile<AgentConfig>(file)
          if (config) {
            config.metadata.scope = 'team' // All agents are team-scoped
            configs.push(config)
          }
        }
      }
    } catch (err) {
      log.debug({ err, userId }, 'User configs directory not found or user has no team')
    }

    // Get team configs if teamId provided
    if (teamId) {
      try {
        const teamPaths = await this.getPaths(userId, teamId)
        const teamFiles = await this.listFiles(teamPaths.configs)
        for (const file of teamFiles) {
          if (file.endsWith('.json')) {
            const config = await this.readJsonFile<AgentConfig>(file)
            if (config) {
              config.metadata.scope = 'team'
              configs.push(config)
            }
          }
        }
      } catch (err) {
        log.debug({ err, teamId }, 'Team configs directory not found')
      }
    }

    return configs
  }

  /**
   * List agents for a specific workspace
   */
  async getAgentsByWorkspace(
    workspaceId: string,
    userId: string,
    teamId?: string,
  ): Promise<AgentConfig[]> {
    const allConfigs = await this.listAgentConfigs(userId, teamId)
    return allConfigs.filter((config) => config.workspaceId === workspaceId)
  }

  // Agent Instance Management
  async createAgentInstance(
    configId: string,
    userId: string,
    teamId?: string,
  ): Promise<AgentInstance> {
    const config = await this.loadAgentConfig(configId, userId, teamId)
    if (!config) throw new Error(`Agent config ${configId} not found`)

    const paths = await this.getPaths(userId, teamId)
    await fs.mkdir(paths.instances, { recursive: true })
    await fs.mkdir(paths.workspaces, { recursive: true })
    await fs.mkdir(paths.memory, { recursive: true })

    const instanceId = `${configId}_${Date.now()}`
    const sessionId = `session_${Date.now()}`

    // Create workspace for this instance
    const workspacePath = path.join(paths.workspaces, instanceId)
    await fs.mkdir(workspacePath, { recursive: true })

    // Create memory path for this instance
    const memoryPath = path.join(paths.memory, instanceId)
    await fs.mkdir(memoryPath, { recursive: true })

    const instance: AgentInstance = {
      config_id: configId,
      instance_id: instanceId,
      user_id: userId,
      session_id: sessionId,
      workspace_path: workspacePath,
      memory_path: memoryPath,
      status: 'active',
      started_at: new Date().toISOString(),
      last_activity: new Date().toISOString(),
      context: {},
    }

    // Save instance
    const instanceFile = path.join(paths.instances, `${instanceId}.json`)
    await this.writeJsonFile(instanceFile, instance)

    return instance
  }

  async loadAgentInstance(
    instanceId: string,
    userId: string,
    teamId?: string,
  ): Promise<AgentInstance | null> {
    const paths = await this.getPaths(userId, teamId)
    const instanceFile = path.join(paths.instances, `${instanceId}.json`)
    return await this.readJsonFile<AgentInstance>(instanceFile)
  }

  async updateInstanceStatus(
    instanceId: string,
    userId: string,
    status: AgentInstance['status'],
    teamId?: string,
  ): Promise<void> {
    const instance = await this.loadAgentInstance(instanceId, userId, teamId)
    if (!instance) throw new Error(`Instance ${instanceId} not found`)

    instance.status = status
    instance.last_activity = new Date().toISOString()

    const paths = await this.getPaths(userId, teamId)
    const instanceFile = path.join(paths.instances, `${instanceId}.json`)
    await this.writeJsonFile(instanceFile, instance)
  }

  async updateInstanceContext(
    instanceId: string,
    userId: string,
    context: Record<string, any>,
    teamId?: string,
  ): Promise<void> {
    const instance = await this.loadAgentInstance(instanceId, userId, teamId)
    if (!instance) throw new Error(`Instance ${instanceId} not found`)

    instance.context = { ...instance.context, ...context }
    instance.last_activity = new Date().toISOString()

    const paths = await this.getPaths(userId, teamId)
    const instanceFile = path.join(paths.instances, `${instanceId}.json`)
    await this.writeJsonFile(instanceFile, instance)
  }

  // List active instances for a user
  async listUserInstances(userId: string, teamId?: string): Promise<AgentInstance[]> {
    const instances: AgentInstance[] = []

    try {
      const paths = await this.getPaths(userId, teamId)
      const files = await this.listFiles(paths.instances)
      for (const file of files) {
        if (file.endsWith('.json')) {
          const instance = await this.readJsonFile<AgentInstance>(file)
          if (instance && instance.status === 'active') {
            instances.push(instance)
          }
        }
      }
    } catch (err) {
      log.debug({ err, userId }, 'Instances directory not found or user has no team')
    }

    return instances
  }

  // Workspace Management
  async saveWorkspaceFile(
    instanceId: string,
    userId: string,
    filename: string,
    content: string,
    teamId?: string,
  ): Promise<void> {
    const instance = await this.loadAgentInstance(instanceId, userId, teamId)
    if (!instance) throw new Error(`Instance ${instanceId} not found`)

    const filePath = path.join(instance.workspace_path, filename)
    await this.writeJsonFile(filePath, content)
  }

  async loadWorkspaceFile(
    instanceId: string,
    userId: string,
    filename: string,
    teamId?: string,
  ): Promise<any> {
    const instance = await this.loadAgentInstance(instanceId, userId, teamId)
    if (!instance) throw new Error(`Instance ${instanceId} not found`)

    const filePath = path.join(instance.workspace_path, filename)
    return await this.readJsonFile(filePath)
  }

  // Get MCP configuration for an instance
  async getMCPConfig(
    instanceId: string,
    userId: string,
    teamId?: string,
  ): Promise<Record<string, any>> {
    const instance = await this.loadAgentInstance(instanceId, userId, teamId)
    if (!instance) throw new Error(`Instance ${instanceId} not found`)

    const config = await this.loadAgentConfig(instance.config_id, userId, teamId)
    if (!config) throw new Error(`Config ${instance.config_id} not found`)

    // Generate MCP config with environment variable substitution
    const mcpConfig: Record<string, any> = {
      mcpServers: {},
    }

    for (const [key, server] of Object.entries(config.mcpServers)) {
      const srv = server as MCPServerConfig
      if (srv.enabled) {
        mcpConfig.mcpServers[key] = {
          command: srv.command,
          args: srv.args?.map((arg: string) =>
            arg
              .replace('${WORKSPACE}', instance.workspace_path)
              .replace('${USER_ID}', instance.user_id),
          ),
          env: srv.env,
        }
      }
    }

    return mcpConfig
  }

  // Global Template Management
  async createGlobalTemplates(): Promise<void> {
    const templates = [
      this.createAnalystTemplate(),
      this.createCoderTemplate(),
      this.createResearcherTemplate(),
    ]

    for (const template of templates) {
      const templateFile = path.join(this.globalTemplatesPath, `${template.id}.json`)
      const exists = await this.readJsonFile(templateFile)
      if (!exists) {
        await this.writeJsonFile(templateFile, template)
      }
    }
  }

  private createAnalystTemplate(): AgentConfig {
    return {
      id: 'data_analyst',
      name: 'Data Analyst',
      type: 'analyst',
      version: '1.0.0',
      description: 'Analyzes data, creates reports, and provides insights',
      basePrompt:
        'You are a data analyst specializing in analyzing patterns and providing insights.',
      workspaceId: '', // Will be set when instantiated
      systemPrompts: {
        main: wrapWithLazarusIdentity(
          'Analyze data systematically and provide clear, actionable insights.',
        ),
        guardrails: 'Always validate data sources. Never make assumptions without stating them.',
        context: 'Focus on statistical significance and practical implications.',
        style: 'Be concise but thorough. Use bullet points for clarity.',
      },
      mcpServers: {
        postgres: {
          name: 'PostgreSQL Database',
          command: 'npx',
          args: ['-y', '@cloudflare/mcp-server-postgres'],
          env: { DATABASE_URL: '${DATABASE_URL}' },
          enabled: true,
        },
        supabase: {
          name: 'Supabase',
          command: 'npx',
          args: [
            '-y',
            '@supabase/mcp-server-supabase',
            '--access-token',
            '${SUPABASE_TOKEN}',
            '--features=account,branching,database,debugging,development,functions,storage',
          ],
          enabled: true,
        },
      },
      tools: {
        allowed: ['sql_query', 'data_visualization', 'statistical_analysis'],
        blocked: ['file_delete', 'system_exec'],
      },
      modelConfig: {
        model: 'sonnet',
        temperature: 0.3,
        maxTokens: 4096,
      },
      memoryConfig: {
        types: ['semantic', 'procedural', 'structured'],
        persistence: true,
        consolidationInterval: 3600,
      },
      workspaceConfig: {
        persistentFiles: [],
        allowedPaths: ['./data', './reports'],
        blockedPaths: ['/etc', '/sys'],
      },
      metadata: {
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        author: 'system',
        tags: ['analyst', 'data', 'reporting'],
        scope: 'global',
      },
    }
  }

  private createCoderTemplate(): AgentConfig {
    return {
      id: 'code_assistant',
      name: 'Code Assistant',
      type: 'coder',
      version: '1.0.0',
      description: 'Helps with coding, debugging, and software development',
      basePrompt: 'You are an expert software developer who writes clean, efficient code.',
      workspaceId: '', // Will be set when instantiated
      systemPrompts: {
        main: wrapWithLazarusIdentity('Write production-quality code following best practices.'),
        guardrails: 'Never commit directly to main branch. Always write tests.',
        context: 'Consider performance, security, and maintainability.',
        style: 'Use clear variable names and add comments for complex logic.',
      },
      mcpServers: {
        git: {
          name: 'Git',
          command: 'mcp-server-git',
          args: [],
          enabled: true,
        },
        filesystem: {
          name: 'Filesystem',
          command: 'mcp-server-fs',
          args: ['--root', '${WORKSPACE}'],
          enabled: true,
        },
      },
      tools: {
        allowed: ['*'],
        blocked: ['system_delete', 'credentials_access'],
      },
      modelConfig: {
        model: 'sonnet',
        temperature: 0.2,
        maxTokens: 8192,
      },
      memoryConfig: {
        types: ['episodic', 'semantic', 'procedural'],
        persistence: true,
      },
      workspaceConfig: {
        persistentFiles: [],
        allowedPaths: ['./src', './tests', './docs'],
        blockedPaths: ['node_modules', '.git/objects'],
      },
      metadata: {
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        author: 'system',
        tags: ['coding', 'development', 'debugging'],
        scope: 'global',
      },
    }
  }

  private createResearcherTemplate(): AgentConfig {
    return {
      id: 'researcher',
      name: 'Research Assistant',
      type: 'researcher',
      version: '1.0.0',
      description: 'Conducts research, summarizes findings, and creates reports',
      basePrompt: 'You are a thorough researcher who finds and synthesizes information.',
      workspaceId: '', // Will be set when instantiated
      systemPrompts: {
        main: wrapWithLazarusIdentity(
          'Research topics comprehensively and provide well-sourced information.',
        ),
        guardrails: 'Always cite sources. Distinguish between facts and opinions.',
        context: 'Consider multiple perspectives and potential biases.',
        style: 'Use academic writing style with proper citations.',
      },
      mcpServers: {
        web_search: {
          name: 'Web Search',
          command: 'mcp-server-websearch',
          args: [],
          enabled: true,
        },
      },
      tools: {
        allowed: ['web_search', 'pdf_reader', 'summarization'],
        blocked: ['file_write', 'system_exec'],
      },
      modelConfig: {
        model: 'sonnet',
        temperature: 0.5,
        maxTokens: 4096,
      },
      memoryConfig: {
        types: ['semantic', 'structured'],
        persistence: true,
      },
      workspaceConfig: {
        persistentFiles: [],
        allowedPaths: ['./research', './notes'],
        blockedPaths: [],
      },
      metadata: {
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        author: 'system',
        tags: ['research', 'analysis', 'writing'],
        scope: 'global',
      },
    }
  }

  // Helper methods to replace the deleted filesystem utilities
  private async readJsonFile<T>(filePath: string): Promise<T> {
    const content = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(content)
  }

  private async writeJsonFile(filePath: string, data: any): Promise<void> {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
  }

  private async listFiles(dirPath: string): Promise<string[]> {
    const entries = await fs.readdir(dirPath)
    const files: string[] = []

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry)
      const stat = await fs.stat(fullPath)
      if (stat.isFile()) {
        files.push(fullPath)
      }
    }

    return files
  }
}
