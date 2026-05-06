/**
 * Tool Metadata
 *
 * Provides metadata about custom tools for frontend display.
 */

export interface ToolMetadata {
  name: string
  description: string
  category: 'database' | 'ui' | 'general'
}

/**
 * Tool metadata registry
 *
 * Maps tool names (with mcp__ prefix) to their metadata for frontend display.
 */
const TOOL_METADATA_REGISTRY: Record<string, ToolMetadata> = {
  // SQLite tools
  'mcp__sqlite-tools__read_sqlite_schema': {
    name: 'mcp__sqlite-tools__read_sqlite_schema',
    description: 'Read complete schema information of a SQLite database',
    category: 'database',
  },
  'mcp__sqlite-tools__execute_sqlite_query': {
    name: 'mcp__sqlite-tools__execute_sqlite_query',
    description: 'Execute SQL queries (SELECT, INSERT, UPDATE, DELETE)',
    category: 'database',
  },
  'mcp__sqlite-tools__create_sqlite_descriptor': {
    name: 'mcp__sqlite-tools__create_sqlite_descriptor',
    description: 'Create a JSON descriptor file for a SQLite database',
    category: 'database',
  },

  // v0 tools
  'mcp__v0-tools__create_chat': {
    name: 'mcp__v0-tools__create_chat',
    description: 'Create a new v0 chat for UI/UX design',
    category: 'ui',
  },
  'mcp__v0-tools__create_project': {
    name: 'mcp__v0-tools__create_project',
    description: 'Create a new v0 project',
    category: 'ui',
  },
  'mcp__v0-tools__assign_chat': {
    name: 'mcp__v0-tools__assign_chat',
    description: 'Assign a chat to a v0 project',
    category: 'ui',
  },
  'mcp__v0-tools__deploy': {
    name: 'mcp__v0-tools__deploy',
    description: 'Deploy a v0 project',
    category: 'ui',
  },

  // Google AI tools
  'mcp__google-ai-tools__gemini_analyze': {
    name: 'mcp__google-ai-tools__gemini_analyze',
    description: 'Analyze images, videos, or PDFs using Gemini',
    category: 'general',
  },
  'mcp__google-ai-tools__veo_generate_video': {
    name: 'mcp__google-ai-tools__veo_generate_video',
    description: 'Generate videos with Veo 3.1',
    category: 'general',
  },
  'mcp__google-ai-tools__imagen_generate': {
    name: 'mcp__google-ai-tools__imagen_generate',
    description: 'Generate images with Imagen',
    category: 'general',
  },
  'mcp__google-ai-tools__nano_banana_generate': {
    name: 'mcp__google-ai-tools__nano_banana_generate',
    description: 'Generate/edit images with Nano Banana 2 (Gemini 3.1 Flash Image)',
    category: 'general',
  },

  // WhatsApp tools
  'mcp__whatsapp-tools__whatsapp_list': {
    name: 'mcp__whatsapp-tools__whatsapp_list',
    description: 'List WhatsApp messages in inbox',
    category: 'general',
  },
  'mcp__whatsapp-tools__whatsapp_read': {
    name: 'mcp__whatsapp-tools__whatsapp_read',
    description: 'Read a specific WhatsApp message',
    category: 'general',
  },
  'mcp__whatsapp-tools__whatsapp_get_media': {
    name: 'mcp__whatsapp-tools__whatsapp_get_media',
    description: 'Get media attachment from WhatsApp message',
    category: 'general',
  },
  'mcp__whatsapp-tools__whatsapp_mark_read': {
    name: 'mcp__whatsapp-tools__whatsapp_mark_read',
    description: 'Mark a WhatsApp message as read',
    category: 'general',
  },
  'mcp__whatsapp-tools__whatsapp_send': {
    name: 'mcp__whatsapp-tools__whatsapp_send',
    description: 'Send a WhatsApp message',
    category: 'general',
  },
  'mcp__whatsapp-tools__whatsapp_reply': {
    name: 'mcp__whatsapp-tools__whatsapp_reply',
    description: 'Reply to a WhatsApp message',
    category: 'general',
  },
  'mcp__whatsapp-tools__whatsapp_send_template': {
    name: 'mcp__whatsapp-tools__whatsapp_send_template',
    description: 'Send a WhatsApp template message (works outside 24h window)',
    category: 'general',
  },
  'mcp__whatsapp-tools__whatsapp_list_templates': {
    name: 'mcp__whatsapp-tools__whatsapp_list_templates',
    description: 'List available WhatsApp message templates',
    category: 'general',
  },
}

const CATEGORY_COLORS: Record<string, string> = {
  database: 'blue',
  ui: 'purple',
  general: 'gray',
}

/**
 * Get tool metadata by tool name
 */
export function getToolMetadata(toolName: string): ToolMetadata | null {
  return TOOL_METADATA_REGISTRY[toolName] || null
}

/**
 * Get tool metadata for all tools belonging to an agent
 */
export function getToolMetadataForAgent(_agentId: string, allowedTools: string[]): ToolMetadata[] {
  // Filter tools to only include MCP tools (custom tools)
  const mcpTools = allowedTools.filter((tool) => tool.startsWith('mcp__'))

  // Get metadata for each tool
  return mcpTools
    .map((toolName) => getToolMetadata(toolName))
    .filter((meta): meta is ToolMetadata => meta !== null)
}

/**
 * Get all tool metadata
 */
export function getAllToolMetadata(): ToolMetadata[] {
  return Object.values(TOOL_METADATA_REGISTRY)
}

/**
 * Format tool name for display (remove mcp__ prefix)
 */
export function formatToolNameForDisplay(toolName: string): string {
  // Remove mcp__{server-name}__ prefix
  return toolName.replace(/^mcp__.*?__/, '')
}

/**
 * Get tool category badge color
 */
export function getToolCategoryColor(category: ToolMetadata['category']): string {
  return CATEGORY_COLORS[category] ?? 'gray'
}
