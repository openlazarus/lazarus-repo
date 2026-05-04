/**
 * Factory for creating isolated MCP tool server instances.
 *
 * Each SDK query() session needs its own McpServer instance because
 * McpServer.connect(transport) overwrites the internal transport —
 * sharing a singleton across concurrent sessions causes tool calls
 * to be lost or routed to the wrong session.
 *
 * The tool definition arrays are stateless (they read context from
 * AsyncLocalStorage at call time), so they can be safely shared
 * across server instances.
 */

import { createEmailToolsServer } from './agents/email-tools'
import { createBrowserToolsServer } from './agents/browser-tools'
import { createGoogleAiToolsServer } from './agents/google-ai-tools'
import { createWhatsappToolsServer } from './agents/whatsapp-tools'
import { createAgentManagementToolsServer } from './agents/agent-management-tools'
import { createAgentChatToolsServer } from './agents/agent-chat-tools'
import { createMemoryToolsServer } from './agents/memory-tools'
import { createV0ToolsServer } from './agents/v0-tools'
import { createSqliteToolsServer } from './sqlite-tools'
import { createIntegrationChannelToolsServer } from './integration-channel-tools'
import { createDiscordManagementToolsServer } from './discord-management-tools'

/**
 * Create a full set of isolated MCP tool servers for one execution session.
 * Call this once per query() invocation — never reuse across sessions.
 */
export function createToolServers(options?: { includeV0?: boolean }): Record<string, any> {
  const servers: Record<string, any> = {
    'email-tools': createEmailToolsServer(),
    'sqlite-tools': createSqliteToolsServer(),
    'integration-channel-tools': createIntegrationChannelToolsServer(),
    'google-ai-tools': createGoogleAiToolsServer(),
    'whatsapp-tools': createWhatsappToolsServer(),
    'agent-management-tools': createAgentManagementToolsServer(),
    'agent-chat-tools': createAgentChatToolsServer(),
    'memory-tools': createMemoryToolsServer(),
    'browser-tools': createBrowserToolsServer(),
    'discord-management-tools': createDiscordManagementToolsServer(),
  }

  if (options?.includeV0) {
    servers['v0-tools'] = createV0ToolsServer()
  }

  return servers
}
