/**
 * Guardrail Tool Mapping
 *
 * Maps guardrail category IDs (from the frontend UI) to actual SDK/MCP tool names
 * so that guardrails configured on an agent are enforced at runtime.
 *
 * Permission levels:
 *   always_allowed  - tool is available without restriction
 *   ask_first       - tool requires user approval (interactive) or is auto-denied (background)
 *   never_allowed   - tool is added to SDK disallowedTools so the model never sees it
 */

export type PermissionLevel = 'always_allowed' | 'ask_first' | 'never_allowed'

export interface GuardrailConfig {
  categoryId: string
  level: PermissionLevel
  conditions?: string
}

/**
 * Static mapping from guardrail categories to known tool names.
 * Tool names match what the Claude Agent SDK exposes (built-in tools)
 * and MCP tool names in the format `mcp__{server}__{tool}`.
 */
const CATEGORY_TOOL_MAP: Record<string, string[]> = {
  edit_files: ['Write', 'Edit', 'MultiEdit', 'NotebookEdit'],

  run_code: ['Bash'],

  external_connections: [
    'WebSearch',
    'WebFetch',
    // Integration channel tools (Discord/Slack)
    'mcp__integration-channel-tools__list_discord_channels',
    'mcp__integration-channel-tools__fetch_discord_channel_history',
    'mcp__integration-channel-tools__search_discord_channel_messages',
    'mcp__integration-channel-tools__list_slack_channels',
    'mcp__integration-channel-tools__fetch_slack_channel_history',
    'mcp__integration-channel-tools__search_slack_messages',
    'mcp__integration-channel-tools__get_slack_thread_replies',
    // Discord management tools (read-only)
    'mcp__discord-management-tools__list_discord_categories',
    'mcp__discord-management-tools__list_discord_roles',
    'mcp__discord-management-tools__list_discord_members',
    // Browser tools (agent-browser headless Chromium)
    'mcp__browser-tools__browser_open',
    'mcp__browser-tools__browser_snapshot',
    'mcp__browser-tools__browser_screenshot',
    'mcp__browser-tools__browser_click',
    'mcp__browser-tools__browser_type',
    'mcp__browser-tools__browser_fill',
    'mcp__browser-tools__browser_select',
    'mcp__browser-tools__browser_scroll',
    'mcp__browser-tools__browser_get_text',
    'mcp__browser-tools__browser_wait',
    'mcp__browser-tools__browser_press',
    'mcp__browser-tools__browser_close',
    // Note: preset MCP servers (e.g. givebutter, playwright, linear, github,
    // stripe…) are not enumerated here. They fall through to
    // classifyDynamicTool(), which categorizes by tool-name pattern
    // (_list/_get → read_data_sources, _send/_reply → send_messages, etc.).
  ],

  read_data_sources: [
    'Read',
    'Grep',
    'Glob',
    'LS',
    'mcp__sqlite-tools__sqlite_schema',
    'mcp__sqlite-tools__sqlite_query',
  ],

  write_data_sources: ['mcp__sqlite-tools__sqlite_execute'],

  send_messages: [
    'mcp__email-tools__email_send',
    'mcp__email-tools__email_reply',
    'mcp__whatsapp-tools__whatsapp_send',
    'mcp__whatsapp-tools__whatsapp_reply',
    'mcp__whatsapp-tools__whatsapp_send_template',
    'mcp__integration-channel-tools__send_discord_message',
    'mcp__integration-channel-tools__send_slack_message',
    // Discord management tools (write operations)
    'mcp__discord-management-tools__create_discord_channel',
    'mcp__discord-management-tools__delete_discord_channel',
    'mcp__discord-management-tools__update_discord_channel',
    'mcp__discord-management-tools__set_discord_channel_permissions',
    'mcp__discord-management-tools__create_discord_role',
    'mcp__discord-management-tools__delete_discord_role',
    'mcp__discord-management-tools__update_discord_role',
    'mcp__discord-management-tools__assign_discord_role',
    'mcp__discord-management-tools__remove_discord_role',
    // Note: preset MCP server writes (e.g. givebutter create/update/archive,
    // stripe create_payment, linear create_issue…) are not enumerated here.
    // They fall through to classifyDynamicTool() which routes _create/_update/
    // _delete patterns appropriately.
  ],

  actions_with_cost: [
    'mcp__google-ai-tools__gemini_analyze',
    'mcp__google-ai-tools__veo_generate_video',
    'mcp__google-ai-tools__imagen_generate',
    'mcp__google-ai-tools__nano_banana_generate',
    'mcp__v0-tools__create_chat',
    'mcp__v0-tools__create_project',
    'mcp__v0-tools__assign_chat',
    'mcp__v0-tools__deploy',
  ],
}

/**
 * Build an inverted index: tool name -> category ID (computed once at import time).
 */
const TOOL_TO_CATEGORY: Map<string, string> = new Map()
for (const [categoryId, tools] of Object.entries(CATEGORY_TOOL_MAP)) {
  for (const tool of tools) {
    TOOL_TO_CATEGORY.set(tool, categoryId)
  }
}

/**
 * For tools not in the static map (e.g. workspace-specific MCP tools),
 * try to classify by pattern-matching the tool name.
 */
function classifyDynamicTool(toolName: string): string | null {
  const lower = toolName.toLowerCase()

  // Send / reply patterns -> send_messages
  if (lower.includes('_send') || lower.includes('_reply') || lower.includes('send_message')) {
    return 'send_messages'
  }

  // Query / schema / read patterns -> read_data_sources
  if (
    lower.includes('_query') ||
    lower.includes('_schema') ||
    lower.includes('_read') ||
    lower.includes('_list') ||
    lower.includes('_get')
  ) {
    return 'read_data_sources'
  }

  // Execute / write / insert / update / delete patterns -> write_data_sources
  if (
    lower.includes('_execute') ||
    lower.includes('_write') ||
    lower.includes('_insert') ||
    lower.includes('_update') ||
    lower.includes('_delete')
  ) {
    return 'write_data_sources'
  }

  // Generate / create patterns that imply cost -> actions_with_cost
  if (lower.includes('generate') || lower.includes('_deploy')) {
    return 'actions_with_cost'
  }

  return null
}

/**
 * Build a Map from categoryId -> PermissionLevel for quick lookup.
 */
function buildGuardrailMap(guardrails: GuardrailConfig[]): Map<string, PermissionLevel> {
  const map = new Map<string, PermissionLevel>()
  for (const g of guardrails) {
    map.set(g.categoryId, g.level)
  }
  return map
}

/**
 * Parse an MCP tool name in the format `mcp__{serverName}__{toolName}`
 * into its components. Returns null for non-MCP tool names.
 */
export function parseMCPToolName(
  toolName: string,
): { serverName: string; mcpToolName: string } | null {
  const match = toolName.match(/^mcp__(.+?)__(.+)$/)
  if (!match) return null
  return { serverName: match[1]!, mcpToolName: match[2]! }
}

/**
 * Get the permission level for a specific tool given the agent's guardrails.
 *
 * Resolution order for MCP tools (e.g. `mcp__Database_Quick__mysql_query`):
 *   1. Exact tool override:     `mcp::Database_Quick::mysql_query`
 *   2. Connection-level default: `mcp::Database_Quick`
 *   3. Static category map (built-in tools)
 *   4. Dynamic classification (pattern matching)
 *   5. Default: `always_allowed`
 */
export function getToolPermissionLevel(
  toolName: string,
  guardrails: GuardrailConfig[],
): PermissionLevel {
  if (!guardrails || guardrails.length === 0) return 'always_allowed'

  const guardrailMap = buildGuardrailMap(guardrails)

  // 1. MCP-specific: check individual tool, then connection default
  const mcpParts = parseMCPToolName(toolName)
  if (mcpParts) {
    const toolKey = `mcp::${mcpParts.serverName}::${mcpParts.mcpToolName}`
    const toolLevel = guardrailMap.get(toolKey)
    if (toolLevel) return toolLevel

    const serverKey = `mcp::${mcpParts.serverName}`
    const serverLevel = guardrailMap.get(serverKey)
    if (serverLevel) return serverLevel
  }

  // 2. Check static mapping
  const category = TOOL_TO_CATEGORY.get(toolName)
  if (category) {
    return guardrailMap.get(category) ?? 'always_allowed'
  }

  // 3. Try dynamic classification for unknown tools
  const dynamicCategory = classifyDynamicTool(toolName)
  if (dynamicCategory) {
    return guardrailMap.get(dynamicCategory) ?? 'always_allowed'
  }

  return 'always_allowed'
}

/**
 * Subagent tools that can bypass guardrails.
 *
 * The Claude Code SDK's Task tool spawns subagent processes that do NOT inherit
 * the parent's disallowedTools or canUseTool callback. Subagent types include:
 *   - "Bash": runs arbitrary shell commands (bypasses run_code)
 *   - "general-purpose": has ALL tools (bypasses edit_files, run_code, etc.)
 *   - "qa-leader": has ALL tools
 *
 * When any category is set to never_allowed, we block Task/TaskOutput/TaskStop
 * to prevent the model from delegating restricted actions to an unrestricted subagent.
 */
const SUBAGENT_TOOLS = ['Task', 'TaskOutput', 'TaskStop']

/**
 * Compute the list of tool names that should be passed to the SDK's
 * `disallowedTools` option (tools the model should never see).
 *
 * These are tools whose category is set to `never_allowed`.
 * Also blocks subagent tools (Task/TaskOutput/TaskStop) when any category is
 * set to never_allowed, to prevent guardrail bypass via subagents.
 */
export function getDisallowedTools(guardrails: GuardrailConfig[]): string[] {
  if (!guardrails || guardrails.length === 0) return []

  const guardrailMap = buildGuardrailMap(guardrails)
  const disallowed: string[] = []
  let hasNeverAllowed = false

  // 1. Check built-in category map
  for (const [categoryId, tools] of Object.entries(CATEGORY_TOOL_MAP)) {
    const level = guardrailMap.get(categoryId)
    if (level === 'never_allowed') {
      disallowed.push(...tools)
      hasNeverAllowed = true
    }
  }

  // 2. Check MCP-specific entries (mcp::serverName or mcp::serverName::toolName)
  for (const g of guardrails) {
    if (g.level === 'never_allowed' && g.categoryId.startsWith('mcp::')) {
      hasNeverAllowed = true
      // Note: individual MCP tools are enforced via the PreToolUse hook
      // since we don't know the full list of tools at this point.
      // Connection-level never_allowed is also enforced via the hook.
      break
    }
  }

  // Block subagent tools when any category is never_allowed.
  // Subagents run in separate processes and don't inherit guardrails,
  // so the model could use Task to spawn a Bash/general-purpose subagent
  // that executes the restricted tools.
  if (hasNeverAllowed) {
    disallowed.push(...SUBAGENT_TOOLS)
  }

  return disallowed
}

/**
 * Compute the set of tool names that require user approval (`ask_first`).
 */
export function getAskFirstTools(guardrails: GuardrailConfig[]): Set<string> {
  if (!guardrails || guardrails.length === 0) return new Set()

  const guardrailMap = buildGuardrailMap(guardrails)
  const askFirst = new Set<string>()

  for (const [categoryId, tools] of Object.entries(CATEGORY_TOOL_MAP)) {
    const level = guardrailMap.get(categoryId)
    if (level === 'ask_first') {
      for (const tool of tools) {
        askFirst.add(tool)
      }
    }
  }

  return askFirst
}
