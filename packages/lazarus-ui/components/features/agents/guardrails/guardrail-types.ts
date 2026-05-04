export type PermissionLevel = 'always_allowed' | 'ask_first' | 'never_allowed'

export interface GuardrailConfig {
  categoryId: string
  level: PermissionLevel
  conditions?: string
}

export interface GuardrailCategory {
  id: string
  label: string
  description: string
  icon: string
}

export const GUARDRAIL_CATEGORIES: GuardrailCategory[] = [
  {
    id: 'edit_files',
    label: 'Edit files',
    description: 'Create, modify, or delete files in the workspace',
    icon: 'RiEditLine',
  },
  {
    id: 'run_code',
    label: 'Run code',
    description: 'Execute scripts, commands, and code snippets',
    icon: 'RiTerminalLine',
  },
  {
    id: 'external_connections',
    label: 'External connections',
    description: 'Make API calls, fetch URLs, or connect to external services',
    icon: 'RiGlobalLine',
  },
  {
    id: 'read_data_sources',
    label: 'Read data sources',
    description: 'Read from databases, MCP servers, and connected sources',
    icon: 'RiDatabase2Line',
  },
  {
    id: 'write_data_sources',
    label: 'Write data sources',
    description:
      'Update, insert, or delete data in databases and connected sources',
    icon: 'RiDatabase2Line',
  },
  {
    id: 'send_messages',
    label: 'Send messages',
    description: 'Send emails, WhatsApp messages, or notifications',
    icon: 'RiMailLine',
  },
  {
    id: 'actions_with_cost',
    label: 'Actions with cost',
    description: 'Operations that may incur billing charges or resource usage',
    icon: 'RiMoneyDollarCircleLine',
  },
]

export const PERMISSION_LABELS: Record<PermissionLevel, string> = {
  always_allowed: 'Always',
  ask_first: 'Ask',
  never_allowed: 'Never',
}

export const PERMISSION_COLORS: Record<PermissionLevel, string> = {
  always_allowed: '#34C759',
  ask_first: '#FF9F0A',
  never_allowed: '#FF375F',
}

// ── MCP Tool Guardrail Types ──────────────────────────────────────────────

export interface MCPServerTools {
  serverName: string
  serverDescription?: string
  tools: Array<{ name: string; description: string }>
}

/**
 * Build a guardrail categoryId for an MCP connection or tool.
 * - Connection-level: `mcp::ServerName`
 * - Tool-level:       `mcp::ServerName::tool_name`
 */
export function mcpGuardrailCategoryId(
  serverName: string,
  toolName?: string,
): string {
  return toolName ? `mcp::${serverName}::${toolName}` : `mcp::${serverName}`
}

/**
 * Check if a guardrail categoryId is an MCP entry.
 */
export function isMCPGuardrail(categoryId: string): boolean {
  return categoryId.startsWith('mcp::')
}

/**
 * Parse an MCP guardrail categoryId into its parts.
 */
export function parseMCPGuardrail(categoryId: string): {
  serverName: string
  toolName?: string
} | null {
  if (!categoryId.startsWith('mcp::')) return null
  const parts = categoryId.slice(5).split('::')
  return {
    serverName: parts[0],
    toolName: parts[1],
  }
}

/**
 * Get the effective permission level for an MCP tool, considering
 * tool-level override -> connection default -> fallback.
 */
export function getMCPToolEffectiveLevel(
  serverName: string,
  toolName: string,
  guardrails: GuardrailConfig[],
  fallback: PermissionLevel = 'always_allowed',
): PermissionLevel {
  const toolId = mcpGuardrailCategoryId(serverName, toolName)
  const toolEntry = guardrails.find((g) => g.categoryId === toolId)
  if (toolEntry) return toolEntry.level

  const serverId = mcpGuardrailCategoryId(serverName)
  const serverEntry = guardrails.find((g) => g.categoryId === serverId)
  if (serverEntry) return serverEntry.level

  return fallback
}
