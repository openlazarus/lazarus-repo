import { spawn, ChildProcess } from 'child_process'
import * as fs from 'fs/promises'
import * as path from 'path'
import { MCPOAuthState, MCPServerConfig } from '@shared/types/index'
import { getPreset } from '@infrastructure/config/mcp-presets'
import { initiateDirectOAuth } from './mcp-oauth-direct.service'
import type { IMCPOAuthService } from './mcp-oauth.service.interface'
import { createLogger } from '@utils/logger'

const log = createLogger('mcp-oauth')

/**
 * MCP OAuth Service
 *
 * Orchestrates OAuth authentication for MCP servers that require browser-based
 * authorization (Notion, Atlassian, Sentry, etc.).
 *
 * Two strategies:
 *   1. Direct flow (preferred) — For servers with a known `oauth.remoteUrl` in
 *      their preset config. Delegates to `mcp-oauth-direct.service.ts` which
 *      handles the full OAuth 2.1 + PKCE flow server-side with our public
 *      callback URL. Works reliably on server environments.
 *
 *   2. Legacy mcp-remote flow (fallback) — Spawns `mcp-remote` as a subprocess
 *      and captures the authorization URL from its stdout/stderr. Only used
 *      when no remoteUrl is configured (custom user-added OAuth servers).
 *
 * OAuth state (pending/authorized/error) is persisted per-server in:
 *   {workspacePath}/.mcp-oauth-state.json
 */

// ─── Types ───────────────────────────────────────────────────────────────────

/** Per-server OAuth state persisted to disk. */
interface StoredOAuthState {
  status: 'pending' | 'authorized' | 'expired' | 'error'
  authorizationUrl?: string
  error?: string
  authorizedAt?: string
  expiresAt?: string
}

/** Top-level structure of the OAuth state file. */
interface OAuthStateFile {
  version: string
  servers: Record<string, StoredOAuthState>
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class MCPOAuthService implements IMCPOAuthService {
  private static instance: MCPOAuthService
  /** Tracks spawned mcp-remote processes (legacy flow) keyed by "workspacePath:serverName". */
  private activeProcesses: Map<string, ChildProcess> = new Map()

  private constructor() {}

  static getInstance(): MCPOAuthService {
    if (!MCPOAuthService.instance) {
      MCPOAuthService.instance = new MCPOAuthService()
    }
    return MCPOAuthService.instance
  }

  // ─── State file helpers ──────────────────────────────────────────────────

  /** Returns the path to the workspace's OAuth state file. */
  private getOAuthStatePath(workspacePath: string): string {
    return path.join(workspacePath, '.mcp-oauth-state.json')
  }

  /** Load the full OAuth state file for a workspace, or return an empty default. */
  async loadOAuthState(workspacePath: string): Promise<OAuthStateFile> {
    try {
      const content = await fs.readFile(this.getOAuthStatePath(workspacePath), 'utf-8')
      return JSON.parse(content)
    } catch {
      return { version: '1.0', servers: {} }
    }
  }

  /** Persist the OAuth state file to disk. */
  async saveOAuthState(workspacePath: string, state: OAuthStateFile): Promise<void> {
    await fs.writeFile(this.getOAuthStatePath(workspacePath), JSON.stringify(state, null, 2))
  }

  /**
   * Get the current OAuth state for a single server.
   * Returns { status: 'not_required' } if no state exists (server doesn't use OAuth).
   */
  async getServerOAuthState(workspacePath: string, serverName: string): Promise<MCPOAuthState> {
    const state = await this.loadOAuthState(workspacePath)
    const serverState = state.servers[serverName]

    if (!serverState) {
      return { status: 'not_required' }
    }

    return {
      status: serverState.status,
      authorizationUrl: serverState.authorizationUrl,
      error: serverState.error,
      authorizedAt: serverState.authorizedAt,
      expiresAt: serverState.expiresAt,
    }
  }

  /** Update (merge) the OAuth state for a single server and persist to disk. */
  async updateServerOAuthState(
    workspacePath: string,
    serverName: string,
    serverState: Partial<StoredOAuthState>,
  ): Promise<void> {
    const state = await this.loadOAuthState(workspacePath)
    state.servers[serverName] = {
      ...state.servers[serverName],
      ...serverState,
    } as StoredOAuthState
    await this.saveOAuthState(workspacePath, state)
  }

  // ─── OAuth detection ─────────────────────────────────────────────────────

  /**
   * Determine if a server requires OAuth authentication.
   * Checks (in order): explicit authType on config, preset authType, mcp-remote in args.
   */
  requiresOAuth(serverConfig: MCPServerConfig, presetId?: string): boolean {
    if (serverConfig.authType === 'oauth' || serverConfig.authType === 'oauth_pkce') {
      return true
    }

    if (presetId) {
      const preset = getPreset(presetId)
      if (preset?.authType === 'oauth' || preset?.authType === 'oauth_pkce') {
        return true
      }
    }

    const args = serverConfig.args || []
    if (args.some((arg) => arg.includes('mcp-remote'))) {
      return true
    }

    return false
  }

  /**
   * Extract the remote MCP server URL from server config or its preset.
   * This is the URL we run OAuth discovery against (e.g. "https://mcp.notion.com/mcp").
   * Returns undefined if no remoteUrl is configured (legacy flow will be used).
   */
  private getOAuthRemoteUrl(serverConfig: MCPServerConfig): string | undefined {
    if (serverConfig.oauth?.remoteUrl) {
      return serverConfig.oauth.remoteUrl
    }

    const presetId = (serverConfig as any).preset_id
    if (presetId) {
      const preset = getPreset(presetId)
      if (preset?.oauth?.remoteUrl) {
        return preset.oauth.remoteUrl
      }
    }

    return undefined
  }

  /**
   * Resolve pre-registered OAuth client credentials from the server's env.
   * When a preset declares `clientIdEnvVar`/`clientSecretEnvVar`, the user has
   * supplied credentials for their own OAuth client (DCR bypass).
   * Returns undefined when either is missing so the direct service falls back
   * to DCR.
   */
  private getPreRegisteredClient(
    serverConfig: MCPServerConfig,
  ): { clientId: string; clientSecret?: string } | undefined {
    const oauthCfg = this.resolveOAuthConfig(serverConfig)
    const idVar = oauthCfg?.clientIdEnvVar
    const secretVar = oauthCfg?.clientSecretEnvVar
    if (!idVar) return undefined

    const clientId = serverConfig.env?.[idVar]
    if (!clientId) return undefined

    const clientSecret = secretVar ? serverConfig.env?.[secretVar] : undefined
    return { clientId, clientSecret }
  }

  /**
   * Merge server-config OAuth with the preset's OAuth so env-var names defined
   * on the preset are honored even if the saved server config omits them.
   */
  private resolveOAuthConfig(serverConfig: MCPServerConfig) {
    const configOAuth = serverConfig.oauth
    const presetId = (serverConfig as any).preset_id
    const presetOAuth = presetId ? getPreset(presetId)?.oauth : undefined
    if (!configOAuth && !presetOAuth) return undefined
    return { ...presetOAuth, ...configOAuth }
  }

  // ─── OAuth initiation ────────────────────────────────────────────────────

  /**
   * Initiate the OAuth authorization flow for an MCP server.
   *
   * Strategy selection:
   *   - If the server has a known remoteUrl (from preset config), uses the direct
   *     server-side flow via mcp-oauth-direct.service.ts.
   *   - Otherwise falls back to spawning mcp-remote and scraping the auth URL
   *     from its output.
   *
   * @returns The authorization URL to open in the user's browser, or an error.
   */
  async initiateOAuth(
    workspacePath: string,
    serverName: string,
    serverConfig: MCPServerConfig,
  ): Promise<{ authorizationUrl?: string; error?: string }> {
    // Strategy 1: Direct server-side OAuth flow (preferred)
    const remoteUrl = this.getOAuthRemoteUrl(serverConfig)
    if (remoteUrl) {
      try {
        const preRegistered = this.getPreRegisteredClient(serverConfig)
        const result = await initiateDirectOAuth(
          workspacePath,
          serverName,
          remoteUrl,
          preRegistered,
        )
        await this.updateServerOAuthState(workspacePath, serverName, {
          status: 'pending',
          authorizationUrl: result.authorizationUrl,
        })
        return result
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Direct OAuth flow failed'
        log.error({ serverName, err: msg }, 'Direct OAuth failed, falling back to mcp-remote')
        // Fall through to legacy approach
      }
    }

    // Strategy 2: Legacy mcp-remote spawn (fallback for custom servers)
    return this.initiateOAuthViaMcpRemote(workspacePath, serverName, serverConfig)
  }

  /**
   * Legacy OAuth initiation: spawn mcp-remote and capture the authorization URL
   * from its stdout/stderr output. Used only when no remoteUrl is configured.
   */
  private async initiateOAuthViaMcpRemote(
    workspacePath: string,
    serverName: string,
    serverConfig: MCPServerConfig,
  ): Promise<{ authorizationUrl?: string; error?: string }> {
    const processKey = `${workspacePath}:${serverName}`

    // Kill any existing process for this server
    const existingProcess = this.activeProcesses.get(processKey)
    if (existingProcess) {
      existingProcess.kill()
      this.activeProcesses.delete(processKey)
    }

    return new Promise((resolve) => {
      const command = serverConfig.command || 'npx'
      const args = serverConfig.args || []
      const env = { ...process.env, ...serverConfig.env }

      const timeout = setTimeout(() => {
        const proc = this.activeProcesses.get(processKey)
        if (proc) {
          proc.kill()
          this.activeProcesses.delete(processKey)
        }
        resolve({ error: 'Timeout waiting for authorization URL' })
      }, 30000)

      try {
        const child = spawn(command, args, {
          env,
          stdio: ['pipe', 'pipe', 'pipe'],
        })

        this.activeProcesses.set(processKey, child)

        let authUrl: string | undefined
        let output = ''
        let errorOutput = ''

        // Scan stdout for authorization URLs
        child.stdout?.on('data', (data) => {
          const chunk = data.toString()
          output += chunk

          const urlPatterns = [
            /https?:\/\/[^\s"'<>]+auth[^\s"'<>]*/gi,
            /https?:\/\/[^\s"'<>]+authorize[^\s"'<>]*/gi,
            /https?:\/\/[^\s"'<>]+oauth[^\s"'<>]*/gi,
            /https?:\/\/[^\s"'<>]+login[^\s"'<>]*/gi,
            /Please visit: (https?:\/\/[^\s"'<>]+)/i,
            /Open this URL[^:]*: (https?:\/\/[^\s"'<>]+)/i,
            /Authorization URL[^:]*: (https?:\/\/[^\s"'<>]+)/i,
          ]

          for (const pattern of urlPatterns) {
            const match = chunk.match(pattern)
            if (match) {
              authUrl = (match[1] || match[0]).replace(/[)"'\]>]+$/, '')
              break
            }
          }

          if (authUrl && !authUrl.includes('localhost')) {
            clearTimeout(timeout)
            this.updateServerOAuthState(workspacePath, serverName, {
              status: 'pending',
              authorizationUrl: authUrl,
            }).then(() => resolve({ authorizationUrl: authUrl }))
          }
        })

        // Also check stderr (some servers output auth URLs there)
        child.stderr?.on('data', (data) => {
          const chunk = data.toString()
          errorOutput += chunk

          const urlMatch = chunk.match(/https?:\/\/[^\s"'<>]+/)
          if (
            urlMatch &&
            !authUrl &&
            (chunk.toLowerCase().includes('auth') ||
              chunk.toLowerCase().includes('login') ||
              chunk.toLowerCase().includes('visit'))
          ) {
            const nextAuthUrl = urlMatch[0].replace(/[)"'\]>]+$/, '')
            authUrl = nextAuthUrl
            if (!nextAuthUrl.includes('localhost')) {
              clearTimeout(timeout)
              this.updateServerOAuthState(workspacePath, serverName, {
                status: 'pending',
                authorizationUrl: nextAuthUrl,
              }).then(() => resolve({ authorizationUrl: nextAuthUrl }))
            }
          }
        })

        child.on('error', (error) => {
          clearTimeout(timeout)
          this.activeProcesses.delete(processKey)
          this.updateServerOAuthState(workspacePath, serverName, {
            status: 'error',
            error: error.message,
          }).then(() => resolve({ error: error.message }))
        })

        child.on('close', (code) => {
          clearTimeout(timeout)
          this.activeProcesses.delete(processKey)

          if (!authUrl) {
            if (code === 0 || output.includes('connected') || output.includes('ready')) {
              this.updateServerOAuthState(workspacePath, serverName, {
                status: 'authorized',
                authorizedAt: new Date().toISOString(),
              }).then(() => resolve({ authorizationUrl: undefined }))
            } else {
              const errorMsg = (errorOutput || 'Failed to get authorization URL').substring(0, 500)
              this.updateServerOAuthState(workspacePath, serverName, {
                status: 'error',
                error: errorMsg,
              }).then(() => resolve({ error: errorMsg }))
            }
          }
        })

        // Send JSON-RPC initialize to trigger the OAuth handshake
        child.stdin?.write(
          JSON.stringify({
            jsonrpc: '2.0',
            method: 'initialize',
            params: {
              protocolVersion: '2024-11-05',
              capabilities: {},
              clientInfo: { name: 'lazarus-oauth-initiator', version: '1.0.0' },
            },
            id: 1,
          }) + '\n',
        )
      } catch (error) {
        clearTimeout(timeout)
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        this.updateServerOAuthState(workspacePath, serverName, {
          status: 'error',
          error: errorMsg,
        }).then(() => resolve({ error: errorMsg }))
      }
    })
  }

  // ─── State management ────────────────────────────────────────────────────

  /**
   * Mark a server as successfully authorized.
   * Called by the OAuth callback route after tokens are stored.
   */
  async markAuthorized(workspacePath: string, serverName: string): Promise<void> {
    await this.updateServerOAuthState(workspacePath, serverName, {
      status: 'authorized',
      authorizedAt: new Date().toISOString(),
      authorizationUrl: undefined,
      error: undefined,
    })
  }

  /**
   * Remove all OAuth state for a server.
   * Called when deleting an MCP server to clean up.
   */
  async clearOAuthState(workspacePath: string, serverName: string): Promise<void> {
    const state = await this.loadOAuthState(workspacePath)
    delete state.servers[serverName]
    await this.saveOAuthState(workspacePath, state)
  }

  /**
   * Get human-readable authorization instructions for a preset.
   * Displayed in the UI next to the "Authorize" button.
   */
  getAuthInstructions(presetId: string): string | undefined {
    const preset = getPreset(presetId)
    return preset?.authInstructions
  }

  /** Kill all active mcp-remote processes. Called during graceful shutdown. */
  cleanup(): void {
    for (const [, process] of this.activeProcesses) {
      process.kill()
    }
    this.activeProcesses.clear()
  }
}

export const mcpOAuthService: IMCPOAuthService = MCPOAuthService.getInstance()
