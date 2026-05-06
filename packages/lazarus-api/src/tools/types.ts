/**
 * Tool execution context - provides information about the agent and workspace
 */
export interface ToolExecutionContext {
  agentId: string
  workspaceId: string
  userId: string
  teamId?: string
  sessionId?: string
}

/**
 * Tool definition interface
 */
export interface ToolDefinition {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, any>
    required?: string[]
  }
  execute: (context: ToolExecutionContext, args: any) => Promise<any>
}

/**
 * Tool execution result
 */
export interface ToolResult {
  success: boolean
  error?: string
  [key: string]: any
}
