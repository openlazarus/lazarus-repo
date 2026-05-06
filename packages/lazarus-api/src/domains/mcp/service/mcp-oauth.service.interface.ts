import type { MCPOAuthState, MCPServerConfig } from '@shared/types/index'

export interface IMCPOAuthService {
  /** Load the full OAuth state file for a workspace. */
  loadOAuthState(workspacePath: string): Promise<{ version: string; servers: Record<string, any> }>

  /** Persist the OAuth state file to disk. */
  saveOAuthState(
    workspacePath: string,
    state: { version: string; servers: Record<string, any> },
  ): Promise<void>

  /** Get the current OAuth state for a single server. */
  getServerOAuthState(workspacePath: string, serverName: string): Promise<MCPOAuthState>

  /** Update the OAuth state for a single server. */
  updateServerOAuthState(
    workspacePath: string,
    serverName: string,
    serverState: Partial<{
      status: string
      authorizationUrl?: string
      error?: string
      authorizedAt?: string
      expiresAt?: string
    }>,
  ): Promise<void>

  /** Determine if a server requires OAuth authentication. */
  requiresOAuth(serverConfig: MCPServerConfig, presetId?: string): boolean

  /** Initiate the OAuth authorization flow for an MCP server. */
  initiateOAuth(
    workspacePath: string,
    serverName: string,
    serverConfig: MCPServerConfig,
  ): Promise<{ authorizationUrl?: string; error?: string }>

  /** Mark a server as successfully authorized. */
  markAuthorized(workspacePath: string, serverName: string): Promise<void>

  /** Remove all OAuth state for a server. */
  clearOAuthState(workspacePath: string, serverName: string): Promise<void>

  /** Get human-readable authorization instructions for a preset. */
  getAuthInstructions(presetId: string): string | undefined

  /** Kill all active mcp-remote processes. */
  cleanup(): void
}
