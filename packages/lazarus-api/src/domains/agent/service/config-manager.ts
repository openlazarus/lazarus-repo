import * as path from 'path'
import * as fs from 'fs/promises'

// Helper functions to replace deleted filesystem utilities
async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(content)
  } catch {
    return null
  }
}

async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(data, null, 2))
}

import type { IAgentConfigManager } from './config-manager.interface'
import { createLogger } from '@utils/logger'
const log = createLogger('config-manager')

async function listFiles(dirPath: string): Promise<string[]> {
  try {
    const files = await fs.readdir(dirPath)
    return files.map((file) => path.join(dirPath, file))
  } catch {
    return []
  }
}

async function copyFile(src: string, dest: string): Promise<void> {
  await fs.mkdir(path.dirname(dest), { recursive: true })
  await fs.copyFile(src, dest)
}

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
  custom_tools?: Record<string, any>
}

export interface AgentConfig {
  id: string
  name: string
  type: string
  version: string
  description: string
  base_prompt: string
  system_prompts: {
    main: string
    guardrails?: string
    context?: string
    style?: string
  }
  mcp_servers: Record<string, MCPServerConfig>
  tools: AgentTools
  model_config: {
    model: string
    temperature?: number
    max_tokens?: number
    top_p?: number
  }
  memory_config: {
    types: string[] // ['episodic', 'semantic', 'procedural']
    persistence: boolean
    consolidation_interval?: number
  }
  workspace_config: {
    persistent_files: string[] // Files to keep between sessions
    allowed_paths: string[]
    blocked_paths: string[]
  }
  metadata: {
    created: string
    updated: string
    author: string
    tags: string[]
  }
}

export interface AgentInstance {
  config_id: string
  instance_id: string
  user_id: string
  team_id?: string
  session_id: string
  workspace_path: string
  memory_path: string
  status: 'idle' | 'active' | 'suspended' | 'terminated'
  started_at: string
  last_activity: string
  context: Record<string, any>
}

export class AgentConfigManager implements IAgentConfigManager {
  private basePath: string
  private configPath: string
  private instancesPath: string
  private templatesPath: string

  constructor(basePath: string = './storage') {
    this.basePath = basePath
    this.configPath = path.join(basePath, 'agents', 'configs')
    this.instancesPath = path.join(basePath, 'agents', 'instances')
    this.templatesPath = path.join(basePath, 'agents', 'templates')
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.configPath, { recursive: true })
    await fs.mkdir(this.instancesPath, { recursive: true })
    await fs.mkdir(this.templatesPath, { recursive: true })

    // Create default templates if they don't exist
    await this.createDefaultTemplates()
  }

  // Agent Configuration Management
  async saveAgentConfig(config: AgentConfig): Promise<void> {
    const configFile = path.join(this.configPath, `${config.id}.json`)
    config.metadata.updated = new Date().toISOString()
    await writeJsonFile(configFile, config)
  }

  async loadAgentConfig(configId: string): Promise<AgentConfig | null> {
    const configFile = path.join(this.configPath, `${configId}.json`)
    return await readJsonFile<AgentConfig>(configFile)
  }

  async listAgentConfigs(): Promise<AgentConfig[]> {
    const files = await listFiles(this.configPath)
    const configs: AgentConfig[] = []

    for (const file of files) {
      if (file.endsWith('.json')) {
        const config = await readJsonFile<AgentConfig>(file)
        if (config) configs.push(config)
      }
    }

    return configs
  }

  // Agent Instance Management
  async createAgentInstance(
    configId: string,
    userId: string,
    teamId?: string,
  ): Promise<AgentInstance> {
    const config = await this.loadAgentConfig(configId)
    if (!config) throw new Error(`Agent config ${configId} not found`)

    const instanceId = `${configId}_${userId}_${Date.now()}`
    const sessionId = `session_${Date.now()}`

    // Create workspace for this instance
    const workspacePath = path.join(this.basePath, 'users', userId, 'workspaces', instanceId)
    await fs.mkdir(workspacePath, { recursive: true })

    // Create memory path for this instance
    const memoryPath = path.join(this.basePath, 'users', userId, 'memory', 'agents', instanceId)
    await fs.mkdir(memoryPath, { recursive: true })

    // Copy persistent files to workspace if specified
    if (config.workspace_config.persistent_files.length > 0) {
      await this.copyPersistentFiles(config, workspacePath)
    }

    const instance: AgentInstance = {
      config_id: configId,
      instance_id: instanceId,
      user_id: userId,
      team_id: teamId,
      session_id: sessionId,
      workspace_path: workspacePath,
      memory_path: memoryPath,
      status: 'active',
      started_at: new Date().toISOString(),
      last_activity: new Date().toISOString(),
      context: {},
    }

    // Save instance
    const instanceFile = path.join(this.instancesPath, `${instanceId}.json`)
    await writeJsonFile(instanceFile, instance)

    return instance
  }

  async loadAgentInstance(instanceId: string): Promise<AgentInstance | null> {
    const instanceFile = path.join(this.instancesPath, `${instanceId}.json`)
    return await readJsonFile<AgentInstance>(instanceFile)
  }

  async updateInstanceStatus(instanceId: string, status: AgentInstance['status']): Promise<void> {
    const instance = await this.loadAgentInstance(instanceId)
    if (!instance) throw new Error(`Instance ${instanceId} not found`)

    instance.status = status
    instance.last_activity = new Date().toISOString()

    const instanceFile = path.join(this.instancesPath, `${instanceId}.json`)
    await writeJsonFile(instanceFile, instance)
  }

  async updateInstanceContext(instanceId: string, context: Record<string, any>): Promise<void> {
    const instance = await this.loadAgentInstance(instanceId)
    if (!instance) throw new Error(`Instance ${instanceId} not found`)

    instance.context = { ...instance.context, ...context }
    instance.last_activity = new Date().toISOString()

    const instanceFile = path.join(this.instancesPath, `${instanceId}.json`)
    await writeJsonFile(instanceFile, instance)
  }

  // Workspace Management
  async getWorkspacePath(instanceId: string): Promise<string> {
    const instance = await this.loadAgentInstance(instanceId)
    if (!instance) throw new Error(`Instance ${instanceId} not found`)
    return instance.workspace_path
  }

  async saveWorkspaceFile(instanceId: string, filename: string, content: string): Promise<void> {
    const workspace = await this.getWorkspacePath(instanceId)
    const filePath = path.join(workspace, filename)
    await writeJsonFile(filePath, content)
  }

  async loadWorkspaceFile(instanceId: string, filename: string): Promise<any> {
    const workspace = await this.getWorkspacePath(instanceId)
    const filePath = path.join(workspace, filename)
    return await readJsonFile(filePath)
  }

  // Template Management
  async createDefaultTemplates(): Promise<void> {
    const templates = [
      this.createAnalystTemplate(),
      this.createCoderTemplate(),
      this.createResearcherTemplate(),
    ]

    for (const template of templates) {
      // Save to templates directory
      const templateFile = path.join(this.templatesPath, `${template.id}.json`)
      const exists = await readJsonFile(templateFile)
      if (!exists) {
        await writeJsonFile(templateFile, template)
      }

      // Also save to configs directory so they can be used immediately
      const configFile = path.join(this.configPath, `${template.id}.json`)
      const configExists = await readJsonFile(configFile)
      if (!configExists) {
        await writeJsonFile(configFile, template)
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
      base_prompt:
        'You are a data analyst specializing in analyzing patterns and providing insights.',
      system_prompts: {
        main: 'Analyze data systematically and provide clear, actionable insights.',
        guardrails: 'Always validate data sources. Never make assumptions without stating them.',
        context: 'Focus on statistical significance and practical implications.',
        style: 'Be concise but thorough. Use bullet points for clarity.',
      },
      mcp_servers: {
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
      model_config: {
        model: 'sonnet',
        temperature: 0.3,
        max_tokens: 4096,
      },
      memory_config: {
        types: ['semantic', 'procedural', 'structured'],
        persistence: true,
        consolidation_interval: 3600,
      },
      workspace_config: {
        persistent_files: ['analysis_templates/', 'saved_queries/'],
        allowed_paths: ['./data', './reports'],
        blocked_paths: ['/etc', '/sys'],
      },
      metadata: {
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        author: 'system',
        tags: ['analyst', 'data', 'reporting'],
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
      base_prompt: 'You are an expert software developer who writes clean, efficient code.',
      system_prompts: {
        main: 'Write production-quality code following best practices.',
        guardrails: 'Never commit directly to main branch. Always write tests.',
        context: 'Consider performance, security, and maintainability.',
        style: 'Use clear variable names and add comments for complex logic.',
      },
      mcp_servers: {
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
      model_config: {
        model: 'sonnet',
        temperature: 0.2,
        max_tokens: 8192,
      },
      memory_config: {
        types: ['episodic', 'semantic', 'procedural'],
        persistence: true,
      },
      workspace_config: {
        persistent_files: ['.vscode/', 'templates/'],
        allowed_paths: ['./src', './tests', './docs'],
        blocked_paths: ['node_modules', '.git/objects'],
      },
      metadata: {
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        author: 'system',
        tags: ['coding', 'development', 'debugging'],
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
      base_prompt: 'You are a thorough researcher who finds and synthesizes information.',
      system_prompts: {
        main: 'Research topics comprehensively and provide well-sourced information.',
        guardrails: 'Always cite sources. Distinguish between facts and opinions.',
        context: 'Consider multiple perspectives and potential biases.',
        style: 'Use academic writing style with proper citations.',
      },
      mcp_servers: {
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
      model_config: {
        model: 'sonnet',
        temperature: 0.5,
        max_tokens: 4096,
      },
      memory_config: {
        types: ['semantic', 'structured'],
        persistence: true,
      },
      workspace_config: {
        persistent_files: ['research/', 'sources/'],
        allowed_paths: ['./research', './notes'],
        blocked_paths: [],
      },
      metadata: {
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        author: 'system',
        tags: ['research', 'analysis', 'writing'],
      },
    }
  }

  private async copyPersistentFiles(config: AgentConfig, workspacePath: string): Promise<void> {
    // This would copy template files or persistent files to the new workspace
    // Implementation depends on where these files are stored
    for (const file of config.workspace_config.persistent_files) {
      const sourcePath = path.join(this.templatesPath, 'files', config.id, file)
      const destPath = path.join(workspacePath, file)
      try {
        await copyFile(sourcePath, destPath)
      } catch (error) {
        // File might not exist, that's okay for now
        log.info(`Could not copy ${file}: ${error}`)
      }
    }
  }

  // List active instances for a user
  async listUserInstances(userId: string): Promise<AgentInstance[]> {
    const files = await listFiles(this.instancesPath)
    const instances: AgentInstance[] = []

    for (const file of files) {
      if (file.endsWith('.json')) {
        const instance = await readJsonFile<AgentInstance>(file)
        if (instance && instance.user_id === userId) {
          instances.push(instance)
        }
      }
    }

    return instances.filter((i) => i.status === 'active')
  }

  // Get or create MCP config for an instance
  async getMCPConfig(instanceId: string): Promise<Record<string, any>> {
    const instance = await this.loadAgentInstance(instanceId)
    if (!instance) throw new Error(`Instance ${instanceId} not found`)

    const config = await this.loadAgentConfig(instance.config_id)
    if (!config) throw new Error(`Config ${instance.config_id} not found`)

    // Generate MCP config with environment variable substitution
    const mcpConfig: Record<string, any> = {
      mcpServers: {},
    }

    for (const [key, server] of Object.entries(config.mcp_servers)) {
      if (server.enabled) {
        mcpConfig.mcpServers[key] = {
          command: server.command,
          args: server.args?.map((arg) =>
            arg
              .replace('${WORKSPACE}', instance.workspace_path)
              .replace('${USER_ID}', instance.user_id),
          ),
          env: server.env,
        }
      }
    }

    return mcpConfig
  }
}
