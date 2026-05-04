/**
 * Tool Display Names
 *
 * Maps technical tool names to knowledge-worker friendly names.
 */

export const TOOL_DISPLAY_NAMES: Record<string, string> = {
  // Standard SDK tools
  read: 'Read files',
  write: 'Write files',
  edit: 'Edit files',
  grep: 'Search in files',
  glob: 'Find files by pattern',
  bash: 'Run scripts in workspace',
  filesystem: 'Access file system',
  mcp: 'Connect to external tools',
  web_search: 'Search the web',
  web_fetch: 'Fetch web pages',
  '*': 'All tools',

  // SQLite custom tools
  'mcp__sqlite-tools__query': 'Query database',
  'mcp__sqlite-tools__execute': 'Update database',
  'mcp__sqlite-tools__create_database': 'Create database',
  'mcp__sqlite-tools__schema_info': 'View database structure',
  'mcp__sqlite-tools__export': 'Export database',

  // v0 custom tools
  'mcp__v0-tools__create_chat': 'Start UI design chat',
  'mcp__v0-tools__create_project': 'Create UI project',
  'mcp__v0-tools__assign_chat': 'Link design to project',
  'mcp__v0-tools__deploy': 'Deploy UI project',
}

/**
 * Get friendly display name for a tool
 * Falls back to formatted tool name if no mapping exists
 */
export function getToolDisplayName(toolName: string): string {
  // Check for exact match first
  if (TOOL_DISPLAY_NAMES[toolName]) {
    return TOOL_DISPLAY_NAMES[toolName]
  }

  // For MCP tools without mapping, extract and format the tool name
  if (toolName.startsWith('mcp__')) {
    const match = toolName.match(/^mcp__.*?__(.+)$/)
    if (match) {
      // Convert snake_case to Title Case
      return match[1]
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    }
  }

  // Fallback: convert snake_case to Title Case
  return toolName
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Get tool category icon for visual grouping
 */
export function getToolIcon(toolName: string): string {
  if (toolName.includes('database') || toolName.includes('sqlite')) {
    return 'DB'
  }
  if (
    toolName.includes('v0') ||
    toolName.includes('ui') ||
    toolName.includes('design')
  ) {
    return 'UI'
  }
  if (
    toolName.includes('file') ||
    toolName === 'read' ||
    toolName === 'write' ||
    toolName === 'edit'
  ) {
    return 'FILE'
  }
  if (
    toolName.includes('search') ||
    toolName === 'grep' ||
    toolName === 'glob'
  ) {
    return 'SEARCH'
  }
  if (toolName === 'bash' || toolName.includes('script')) {
    return 'SCRIPT'
  }
  if (toolName.includes('web')) {
    return 'WEB'
  }
  return 'TOOL'
}
