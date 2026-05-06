import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { spawn } from 'child_process'
import { MCPServerConfig, MCPConfig } from '@shared/types/index'
import { MCPDirectTester, MCPTestResult } from './mcp-direct-tester'
import { MCP_PRESETS, MCP_CATEGORIES } from './mcp-presets'

export interface ValidationResult {
  valid: boolean
  errors?: string[]
}

export interface EnvSchema {
  required?: boolean
  minLength?: number
  maxLength?: number
  validation?: string
  placeholder?: string
  description?: string
  sensitive?: boolean
}

export class EnhancedMCPConfigManager {
  private configPath: string

  constructor(configPath?: string) {
    this.configPath = configPath || path.join(process.cwd(), 'config', 'mcp_servers.json')
    this.ensureConfigExists()
  }

  private async ensureConfigExists(): Promise<void> {
    try {
      await fs.access(this.configPath)
    } catch {
      // Create default config if it doesn't exist
      const dir = path.dirname(this.configPath)
      await fs.mkdir(dir, { recursive: true })

      const defaultConfig: MCPConfig = {
        mcpServers: {
          postgres: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-postgres', process.env.DATABASE_URL || ''],
            enabled: true,
            icon: '🗄️',
            category: 'database',
            description: 'PostgreSQL database for Lazarus',
          },
        },
      }

      await this.saveConfig(defaultConfig)
    }
  }

  async loadConfig(): Promise<MCPConfig> {
    await this.ensureConfigExists()
    const content = await fs.readFile(this.configPath, 'utf-8')
    return JSON.parse(content)
  }

  async saveConfig(config: MCPConfig): Promise<void> {
    await fs.writeFile(this.configPath, JSON.stringify(config, null, 2))
  }

  maskSensitiveValue(value: string, showLast: number = 4): string {
    if (value.length <= showLast) {
      return '••••••••'
    }
    return '••••••' + value.slice(-showLast)
  }

  validateEnvValue(value: string, schema: EnvSchema): ValidationResult {
    const errors: string[] = []

    // Check required
    if (schema.required && !value) {
      errors.push('Value is required')
    }

    // Check length
    if (value) {
      const minLen = schema.minLength || 0
      const maxLen = schema.maxLength || Infinity
      if (value.length < minLen || value.length > maxLen) {
        errors.push(`Length must be between ${minLen} and ${maxLen}`)
      }

      // Check regex pattern
      if (schema.validation) {
        const regex = new RegExp(schema.validation)
        if (!regex.test(value)) {
          errors.push(
            `Value doesn't match required format: ${schema.placeholder || schema.validation}`,
          )
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    }
  }

  validateServerConfig(serverConfig: MCPServerConfig): ValidationResult {
    const errors: string[] = []

    // Check required fields
    if (!serverConfig.command) {
      errors.push('Command is required')
    }

    if (!serverConfig.args || !Array.isArray(serverConfig.args)) {
      errors.push('Arguments must be an array')
    }

    // Validate against preset schema if available
    const presetId = (serverConfig as any).presetId
    if (presetId && MCP_PRESETS[presetId]) {
      const preset = MCP_PRESETS[presetId]
      const envSchema = preset.envSchema || {}
      const serverEnv = serverConfig.env || {}

      for (const [envKey, schema] of Object.entries(envSchema)) {
        if (schema.required && !serverEnv[envKey]) {
          errors.push(`Missing required environment variable: ${envKey}`)
        }

        if (serverEnv[envKey]) {
          const validation = this.validateEnvValue(serverEnv[envKey], schema)
          if (!validation.valid && validation.errors) {
            errors.push(`${envKey}: ${validation.errors.join(', ')}`)
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    }
  }

  async listServers(options?: {
    search?: string
    category?: string
    status?: 'enabled' | 'disabled'
  }): Promise<Record<string, MCPServerConfig>> {
    const config = await this.loadConfig()
    let servers = config.mcpServers

    if (options?.status) {
      servers = Object.fromEntries(
        Object.entries(servers).filter(([, server]) =>
          options.status === 'enabled' ? server.enabled : !server.enabled,
        ),
      )
    }

    if (options?.category) {
      servers = Object.fromEntries(
        Object.entries(servers).filter(([, server]) => server.category === options.category),
      )
    }

    if (options?.search) {
      const searchLower = options.search.toLowerCase()
      servers = Object.fromEntries(
        Object.entries(servers).filter(
          ([name, server]) =>
            name.toLowerCase().includes(searchLower) ||
            server.description?.toLowerCase().includes(searchLower),
        ),
      )
    }

    return servers
  }

  async enableServer(serverName: string): Promise<boolean> {
    const config = await this.loadConfig()
    if (config.mcpServers[serverName]) {
      config.mcpServers[serverName].enabled = true
      await this.saveConfig(config)
      return true
    }
    return false
  }

  async disableServer(serverName: string): Promise<boolean> {
    const config = await this.loadConfig()
    if (config.mcpServers[serverName]) {
      config.mcpServers[serverName].enabled = false
      await this.saveConfig(config)
      return true
    }
    return false
  }

  async addServer(serverName: string, serverConfig: MCPServerConfig): Promise<boolean> {
    const validation = this.validateServerConfig(serverConfig)
    if (!validation.valid) {
      throw new Error(`Invalid server config: ${validation.errors?.join(', ')}`)
    }

    const config = await this.loadConfig()
    config.mcpServers[serverName] = serverConfig
    await this.saveConfig(config)
    return true
  }

  async removeServer(serverName: string): Promise<boolean> {
    const config = await this.loadConfig()
    if (config.mcpServers[serverName]) {
      delete config.mcpServers[serverName]
      await this.saveConfig(config)
      return true
    }
    return false
  }

  async updateServerEnv(serverName: string, env: Record<string, string>): Promise<boolean> {
    const config = await this.loadConfig()
    if (config.mcpServers[serverName]) {
      config.mcpServers[serverName].env = {
        ...config.mcpServers[serverName].env,
        ...env,
      }
      await this.saveConfig(config)
      return true
    }
    return false
  }

  async getEnabledServers(maskSensitive: boolean = true): Promise<MCPConfig> {
    const config = await this.loadConfig()
    const enabledServers = Object.fromEntries(
      Object.entries(config.mcpServers).filter(([, server]) => server.enabled),
    )

    if (maskSensitive) {
      // Mask sensitive environment variables
      for (const server of Object.values(enabledServers)) {
        if (server.env) {
          for (const key of Object.keys(server.env)) {
            if (
              key.toLowerCase().includes('key') ||
              key.toLowerCase().includes('secret') ||
              key.toLowerCase().includes('token') ||
              key.toLowerCase().includes('password')
            ) {
              server.env[key] = this.maskSensitiveValue(server.env[key] ?? '')
            }
          }
        }
      }
    }

    return { mcpServers: enabledServers }
  }

  async createTempMcpConfig(): Promise<string> {
    const enabledConfig = await this.getEnabledServers(false)
    // Clean config to match Claude Code SDK format
    const cleanConfig = this.cleanConfigForSDK(enabledConfig)
    const tempPath = path.join(os.tmpdir(), `mcp-config-${Date.now()}.json`)
    await fs.writeFile(tempPath, JSON.stringify(cleanConfig, null, 2))
    return tempPath
  }

  /**
   * Clean MCP config to match Claude Code SDK format
   * Removes extra fields that aren't part of the SDK spec
   */
  cleanConfigForSDK(config: MCPConfig): MCPConfig {
    const cleanServers: Record<string, MCPServerConfig> = {}

    for (const [name, server] of Object.entries(config.mcpServers)) {
      const cleanServer: MCPServerConfig = {}

      // Handle stdio servers (with command/args)
      if (server.command) {
        cleanServer.command = server.command
        cleanServer.args = server.args
        if (server.env) {
          cleanServer.env = server.env
        }
      }

      // Handle HTTP/SSE servers (with url)
      if (server.url) {
        cleanServer.url = server.url
        if (server.headers) {
          cleanServer.headers = server.headers
        }
        // Set transport type for HTTP/SSE servers
        if (server.transport === 'http' || server.transport === 'sse') {
          (cleanServer as any).type = server.transport
        }
      }

      cleanServers[name] = cleanServer
    }

    return { mcpServers: cleanServers }
  }

  async checkServerStatus(serverName: string): Promise<{
    exists: boolean
    enabled?: boolean
    ready?: boolean
    error?: string
  }> {
    const config = await this.loadConfig()
    const server = config.mcpServers[serverName]

    if (!server) {
      return { exists: false }
    }

    // Check if command exists
    let commandExists = false
    try {
      if (server.command) {
        const child = spawn(server.command, ['--version'], { stdio: 'ignore' })
        await new Promise((resolve) => {
          child.on('close', (code: number | null) => {
            commandExists = code === 0
            resolve(null)
          })
          child.on('error', () => {
            commandExists = false
            resolve(null)
          })
        })
      } else {
        commandExists = false
      }
    } catch {
      commandExists = false
    }

    return {
      exists: true,
      enabled: server.enabled,
      ready: commandExists && server.enabled,
      error: !commandExists ? `Command '${server.command}' not found` : undefined,
    }
  }

  async testServerConnection(serverName: string): Promise<MCPTestResult> {
    const config = await this.loadConfig()
    const server = config.mcpServers[serverName]

    if (!server) {
      return {
        connected: false,
        error: `Server '${serverName}' not found`,
        toolsCount: 0,
        tools: [],
      }
    }

    return MCPDirectTester.testMCPServerDirect(server)
  }

  async addServerFromPreset(
    presetId: string,
    envValues: Record<string, string>,
    customName?: string,
  ): Promise<{ success: boolean; error?: string }> {
    const preset = MCP_PRESETS[presetId]

    if (!preset) {
      return { success: false, error: `Preset '${presetId}' not found` }
    }

    // Validate required environment variables
    const envSchema = preset.envSchema || {}
    for (const [envKey, schema] of Object.entries(envSchema)) {
      if (schema.required && !envValues[envKey]) {
        return { success: false, error: `Missing required environment variable: ${envKey}` }
      }

      if (envValues[envKey]) {
        const validation = this.validateEnvValue(envValues[envKey], schema)
        if (!validation.valid) {
          return {
            success: false,
            error: `${envKey}: ${validation.errors?.join(', ')}`,
          }
        }
      }
    }

    // Build server config from preset
    const baseCfg = preset.config ?? {}
    const serverConfig: MCPServerConfig = {
      ...baseCfg,
      env: {
        ...baseCfg.env,
        ...envValues,
      },
      description: preset.description,
      icon: preset.icon,
      category: preset.category,
      enabled: false,
    }

    // Replace placeholders in args if they exist
    if (serverConfig.args) {
      serverConfig.args = serverConfig.args.map((arg: string) => {
        for (const [key, value] of Object.entries(envValues)) {
          arg = arg.replace(`\${${key}}`, value)
        }
        return arg
      })
    }

    const serverName = customName || presetId
    await this.addServer(serverName, serverConfig)

    return { success: true }
  }

  getPresets(): typeof MCP_PRESETS {
    return MCP_PRESETS
  }

  getCategories(): typeof MCP_CATEGORIES {
    return MCP_CATEGORIES
  }
}
