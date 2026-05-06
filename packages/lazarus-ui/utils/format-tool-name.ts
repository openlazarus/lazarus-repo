/**
 * Formats tool names to be more human-readable, especially for MCP tools
 *
 * Converts:
 * - "mcp__lazarus__check_inbox" -> "Check_inbox (Lazarus)"
 * - "mcp__server__tool_name" -> "Tool_name (Server)"
 * - "RegularTool" -> "RegularTool" (unchanged)
 *
 * @param name - The raw tool name
 * @returns Formatted, human-readable tool name
 */
export function formatToolName(name: string): string {
  // Remove MCP prefix pattern (mcp__servername__)
  const mcpMatch = name.match(/^mcp__([^_]+)__(.+)$/)
  if (mcpMatch) {
    const [, serverName, toolName] = mcpMatch
    // Capitalize first letter of both tool name and server name
    const formattedTool = toolName.charAt(0).toUpperCase() + toolName.slice(1)
    const formattedServer =
      serverName.charAt(0).toUpperCase() + serverName.slice(1)
    return `${formattedTool} (${formattedServer})`
  }
  return name
}
