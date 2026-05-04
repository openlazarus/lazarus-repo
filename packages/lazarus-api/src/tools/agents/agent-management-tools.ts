/**
 * Agent Management MCP Tools
 *
 * Gives agents the ability to create, update, delete other agents
 * and manage their triggers programmatically.
 *
 * Follows the same pattern as email-tools.ts — in-process MCP server
 * that reads context from environment variables and calls existing
 * service layer methods.
 */

import { tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'
import { WorkspaceAgentService } from '@domains/agent/service/workspace-agent.service'
import { AgentTriggerManager } from '@domains/agent/service/triggers/trigger-manager'
import { backgroundProcessManager } from '@background/manager'
import { getExecutionContext } from '@domains/execution/service/execution-context'

/**
 * Get agent context from execution context (AsyncLocalStorage) or process.env fallback
 */
function getAgentContext(): { agentId: string; workspaceId: string; userId: string } {
  const ctx = getExecutionContext()
  const agentId = ctx.agentId
  const workspaceId = ctx.workspaceId
  const userId = ctx.userId

  if (!agentId || !workspaceId || !userId) {
    throw new Error(
      `Agent context not available: AGENT_ID=${agentId}, WORKSPACE_ID=${workspaceId}, USER_ID=${userId}`,
    )
  }

  return { agentId, workspaceId, userId }
}

/**
 * Safely parse a JSON string, returning the parsed object or null on failure.
 */
function safeJsonParse(str: string): any {
  try {
    return JSON.parse(str)
  } catch {
    return null
  }
}

/**
 * Normalize trigger config to match the format the frontend expects.
 *
 * Frontend convention:
 *   config.schedule = { type: "cron"|"interval"|"once", expression: "..." }
 *   config.task     = "task description"
 *   (task lives INSIDE config, not at top level)
 *
 * Agents via MCP might produce:
 *   config.schedule = "0 9 * * 0"  (flat cron string)
 *   task = "..."                    (top-level, outside config)
 */
function normalizeTriggerConfig(config: any, task?: string): { config: any; task?: string } {
  const normalized = { ...config }

  // Normalize schedule: flat string → nested { type, expression }
  if (typeof normalized.schedule === 'string') {
    const expr = normalized.schedule
    // Detect type from expression format
    let type: string = 'cron'
    if (/^\d+[smhd]$/.test(expr)) {
      type = 'interval'
    } else if (/^\d{4}-\d{2}-\d{2}/.test(expr)) {
      type = 'once'
    }
    normalized.schedule = { type, expression: expr }
  }

  // Move task inside config (frontend convention)
  if (task && !normalized.task) {
    normalized.task = task
  }

  // Return with task removed from top level since it's now in config
  return { config: normalized, task: undefined }
}

const agentService = new WorkspaceAgentService()
const triggerManager = new AgentTriggerManager()

export const agentManagementTools = [
  // ===== Agent CRUD =====

  tool(
    'list_agents',
    'List all agents in the current workspace. Returns agent IDs, names, descriptions, enabled status, and email addresses.',
    {
      includeSystem: z
        .boolean()
        .optional()
        .describe('Include system agents in the list. Default: true'),
    },
    async (args) => {
      try {
        const { workspaceId, userId } = getAgentContext()
        const includeSystem = args.includeSystem !== undefined ? args.includeSystem : true
        const agents = await agentService.listAgents(workspaceId, userId, includeSystem)

        const summary = agents.map((a) => ({
          id: a.id,
          name: a.name,
          description: a.description,
          enabled: a.enabled,
          isSystemAgent: a.metadata?.isSystemAgent || false,
          email: a.email?.address || null,
          model: a.modelConfig?.model || 'unknown',
          created: a.metadata?.created,
          updated: a.metadata?.updated,
        }))

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { success: true, count: summary.length, agents: summary },
                null,
                2,
              ),
            },
          ],
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { success: false, error: `Failed to list agents: ${error.message}` },
                null,
                2,
              ),
            },
          ],
        }
      }
    },
  ),

  tool(
    'get_agent',
    'Get the full configuration of a specific agent by ID.',
    {
      agentId: z.string().describe('The ID of the agent to retrieve'),
    },
    async (args) => {
      try {
        const { workspaceId, userId } = getAgentContext()
        const agent = await agentService.getAgent(workspaceId, userId, args.agentId)

        if (!agent) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  { success: false, error: `Agent '${args.agentId}' not found` },
                  null,
                  2,
                ),
              },
            ],
          }
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ success: true, agent }, null, 2),
            },
          ],
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { success: false, error: `Failed to get agent: ${error.message}` },
                null,
                2,
              ),
            },
          ],
        }
      }
    },
  ),

  tool(
    'create_agent',
    'Create a new agent in the current workspace. The agent will be provisioned with an email address and inbox automatically. Email trigger is created by default.',
    {
      id: z
        .string()
        .describe(
          "Agent ID (lowercase alphanumeric + hyphens, must start/end with alphanumeric, min 2 chars). Example: 'my-agent'",
        ),
      name: z.string().describe('Display name for the agent'),
      description: z.string().optional().describe('Description of what the agent does'),
      systemPrompt: z
        .string()
        .describe("System prompt that defines the agent's behavior and personality"),
      model: z
        .string()
        .optional()
        .describe(
          'Model to use. Default: claude-sonnet-4-6. Options: claude-sonnet-4-6, claude-haiku-4-5-20251001',
        ),
      allowedTools: z
        .string()
        .optional()
        .describe(
          'JSON array of allowed tool names. Example: \'["web_search","read"]\'. Default: []',
        ),
      autoTriggerEmail: z
        .boolean()
        .optional()
        .describe('Create an automatic email trigger for incoming emails. Default: true'),
      temperature: z.number().optional().describe('Model temperature (0-1)'),
      maxTokens: z.number().optional().describe('Max tokens for model output'),
    },
    async (args) => {
      try {
        const { workspaceId, userId } = getAgentContext()

        // Validate agent ID format (must match API route: lowercase alphanumeric + hyphens)
        if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(args.id) && !/^[a-z0-9]{1,2}$/.test(args.id)) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    success: false,
                    error: `Invalid agent ID '${args.id}': must be lowercase alphanumeric + hyphens, start/end with alphanumeric`,
                  },
                  null,
                  2,
                ),
              },
            ],
          }
        }

        // Check if agent already exists
        const existing = await agentService.getAgent(workspaceId, userId, args.id)
        if (existing) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  { success: false, error: `Agent '${args.id}' already exists` },
                  null,
                  2,
                ),
              },
            ],
          }
        }

        // Parse allowedTools from JSON string
        let allowedTools: string[] = []
        if (args.allowedTools) {
          const parsed = safeJsonParse(args.allowedTools)
          if (!Array.isArray(parsed)) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify(
                    {
                      success: false,
                      error: `Invalid allowedTools: must be a valid JSON array of strings. Example: '["web_search","read"]'`,
                    },
                    null,
                    2,
                  ),
                },
              ],
            }
          }
          allowedTools = parsed
        }

        const agentConfig = {
          id: args.id,
          name: args.name,
          description: args.description || '',
          systemPrompt: args.systemPrompt,
          allowedTools,
          modelConfig: {
            model: args.model || 'claude-sonnet-4-6',
            ...(args.temperature !== undefined && { temperature: args.temperature }),
            ...(args.maxTokens !== undefined && { maxTokens: args.maxTokens }),
          },
        }

        const autoTriggerEmail = args.autoTriggerEmail !== undefined ? args.autoTriggerEmail : true

        const agent = await agentService.createAgent(
          workspaceId,
          userId,
          agentConfig,
          autoTriggerEmail,
        )

        // Reload workspace background processes (triggers, polling) — matches API route behavior
        await backgroundProcessManager.reloadWorkspace(workspaceId)

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: true,
                  agent: {
                    id: agent.id,
                    name: agent.name,
                    description: agent.description,
                    email: agent.email?.address || null,
                    enabled: agent.enabled,
                    model: agent.modelConfig?.model,
                    created: agent.metadata?.created,
                  },
                },
                null,
                2,
              ),
            },
          ],
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { success: false, error: `Failed to create agent: ${error.message}` },
                null,
                2,
              ),
            },
          ],
        }
      }
    },
  ),

  tool(
    'update_agent',
    "Update an existing agent's configuration. Only provide the fields you want to change.",
    {
      agentId: z.string().describe('The ID of the agent to update'),
      name: z.string().optional().describe('New display name'),
      description: z.string().optional().describe('New description'),
      systemPrompt: z.string().optional().describe('New system prompt'),
      model: z.string().optional().describe('New model'),
      allowedTools: z
        .string()
        .optional()
        .describe(
          'JSON array of allowed tool names (replaces existing). Example: \'["web_search"]\'',
        ),
      enabled: z.boolean().optional().describe('Enable or disable the agent'),
      temperature: z.number().optional().describe('New temperature (0-1)'),
      maxTokens: z.number().optional().describe('New max tokens'),
    },
    async (args) => {
      try {
        const { workspaceId, userId } = getAgentContext()
        const { agentId, ...updateFields } = args

        // Build updates object, only including provided fields
        const updates: Record<string, any> = {
          ...(updateFields.name !== undefined && { name: updateFields.name }),
          ...(updateFields.description !== undefined && { description: updateFields.description }),
          ...(updateFields.systemPrompt !== undefined && {
            systemPrompt: updateFields.systemPrompt,
          }),
          ...(updateFields.enabled !== undefined && { enabled: updateFields.enabled }),
        }

        // Parse allowedTools from JSON string
        if (updateFields.allowedTools !== undefined) {
          const parsed = safeJsonParse(updateFields.allowedTools)
          if (!Array.isArray(parsed)) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify(
                    {
                      success: false,
                      error: `Invalid allowedTools: must be a valid JSON array of strings. Example: '["web_search","read"]'`,
                    },
                    null,
                    2,
                  ),
                },
              ],
            }
          }
          updates.allowedTools = parsed
        }

        // Model config updates
        if (
          updateFields.model !== undefined ||
          updateFields.temperature !== undefined ||
          updateFields.maxTokens !== undefined
        ) {
          const existing = await agentService.getAgent(workspaceId, userId, agentId)
          if (!existing) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify(
                    { success: false, error: `Agent '${agentId}' not found` },
                    null,
                    2,
                  ),
                },
              ],
            }
          }

          updates.modelConfig = {
            ...existing.modelConfig,
            ...(updateFields.model !== undefined && { model: updateFields.model }),
            ...(updateFields.temperature !== undefined && {
              temperature: updateFields.temperature,
            }),
            ...(updateFields.maxTokens !== undefined && { maxTokens: updateFields.maxTokens }),
          }
        }

        const agent = await agentService.updateAgent(workspaceId, userId, agentId, updates)

        // Reload workspace background processes — matches API route behavior
        await backgroundProcessManager.reloadWorkspace(workspaceId)

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: true,
                  agent: {
                    id: agent.id,
                    name: agent.name,
                    description: agent.description,
                    enabled: agent.enabled,
                    model: agent.modelConfig?.model,
                    updated: agent.metadata?.updated,
                  },
                },
                null,
                2,
              ),
            },
          ],
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { success: false, error: `Failed to update agent: ${error.message}` },
                null,
                2,
              ),
            },
          ],
        }
      }
    },
  ),

  tool(
    'delete_agent',
    "Delete an agent from the workspace. This removes the agent's directory, inbox, triggers, and all data. Cannot delete system agents.",
    {
      agentId: z.string().describe('The ID of the agent to delete'),
    },
    async (args) => {
      try {
        const { workspaceId, userId } = getAgentContext()

        const deleted = await agentService.deleteAgent(workspaceId, userId, args.agentId)
        if (!deleted) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    success: false,
                    error: `Agent '${args.agentId}' not found or could not be deleted`,
                  },
                  null,
                  2,
                ),
              },
            ],
          }
        }

        // Reload workspace background processes — matches API route behavior
        await backgroundProcessManager.reloadWorkspace(workspaceId)

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { success: true, message: `Agent '${args.agentId}' deleted successfully` },
                null,
                2,
              ),
            },
          ],
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { success: false, error: `Failed to delete agent: ${error.message}` },
                null,
                2,
              ),
            },
          ],
        }
      }
    },
  ),

  // ===== Trigger CRUD =====

  tool(
    'list_triggers',
    'List all triggers for a specific agent.',
    {
      agentId: z.string().describe('The agent ID to list triggers for'),
    },
    async (args) => {
      try {
        const { workspaceId, userId } = getAgentContext()
        const triggers = await triggerManager.listTriggers(workspaceId, userId, args.agentId)

        const summary = triggers.map((t) => ({
          id: t.id,
          name: t.name,
          type: t.type,
          enabled: t.enabled,
          status: t.status,
          triggerCount: t.triggerCount,
          lastTriggered: t.lastTriggered || null,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        }))

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { success: true, count: summary.length, triggers: summary },
                null,
                2,
              ),
            },
          ],
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { success: false, error: `Failed to list triggers: ${error.message}` },
                null,
                2,
              ),
            },
          ],
        }
      }
    },
  ),

  tool(
    'get_trigger',
    'Get the full configuration of a specific trigger.',
    {
      agentId: z.string().describe('The agent ID the trigger belongs to'),
      triggerId: z.string().describe('The trigger ID to retrieve'),
    },
    async (args) => {
      try {
        const { workspaceId, userId } = getAgentContext()
        const trigger = await triggerManager.getTrigger(
          workspaceId,
          userId,
          args.agentId,
          args.triggerId,
        )

        if (!trigger) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    success: false,
                    error: `Trigger '${args.triggerId}' not found for agent '${args.agentId}'`,
                  },
                  null,
                  2,
                ),
              },
            ],
          }
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ success: true, trigger }, null, 2),
            },
          ],
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { success: false, error: `Failed to get trigger: ${error.message}` },
                null,
                2,
              ),
            },
          ],
        }
      }
    },
  ),

  tool(
    'create_trigger',
    'Create a new trigger for an agent. Supports types: scheduled, email, webhook, external, file_change, whatsapp. The config parameter is a JSON string with type-specific configuration.',
    {
      agentId: z.string().describe('The agent ID to create the trigger for'),
      type: z
        .enum(['scheduled', 'email', 'webhook', 'external', 'file_change', 'whatsapp'])
        .describe('Trigger type'),
      name: z
        .string()
        .describe("Short title for the trigger (e.g. 'Weekly report', 'Daily standup')"),
      enabled: z.boolean().optional().describe('Whether the trigger is active. Default: true'),
      config: z
        .string()
        .describe(
          'JSON string of trigger config. For \'scheduled\': {"schedule":{"type":"interval","expression":"5m"}} or {"schedule":{"type":"cron","expression":"0 9 * * *"}}. For \'email\': {"conditions":{"from":[],"subject":[],"keywords":[]}}. For \'webhook\': {"webhook":{"url":"...","method":"POST"}}. For \'file_change\': {"monitoring":{"paths":["./data"],"events":["created","modified"]}}',
        ),
      task: z
        .string()
        .optional()
        .describe(
          'The task description — detailed instructions for what the agent should do when this trigger fires. This is the main content shown in the UI.',
        ),
      maxTurns: z.number().optional().describe('Maximum execution turns when triggered'),
    },
    async (args) => {
      try {
        const { workspaceId, userId } = getAgentContext()

        // Parse config from JSON string
        const rawConfig = safeJsonParse(args.config)
        if (!rawConfig) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  { success: false, error: 'Invalid config: must be a valid JSON string' },
                  null,
                  2,
                ),
              },
            ],
          }
        }

        const enabled = args.enabled !== undefined ? args.enabled : true

        // Normalize to match frontend format (schedule as nested object, task inside config)
        const { config: normalizedConfig } = normalizeTriggerConfig(rawConfig, args.task)

        const trigger = await triggerManager.createTrigger(workspaceId, userId, args.agentId, {
          type: args.type,
          name: args.name,
          enabled,
          config: normalizedConfig as any,
          maxTurns: args.maxTurns,
        })

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: true,
                  trigger: {
                    id: trigger.id,
                    name: trigger.name,
                    type: trigger.type,
                    enabled: trigger.enabled,
                    status: trigger.status,
                    agentId: trigger.agentId,
                    createdAt: trigger.createdAt,
                  },
                },
                null,
                2,
              ),
            },
          ],
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { success: false, error: `Failed to create trigger: ${error.message}` },
                null,
                2,
              ),
            },
          ],
        }
      }
    },
  ),

  tool(
    'update_trigger',
    "Update an existing trigger's configuration.",
    {
      agentId: z.string().describe('The agent ID the trigger belongs to'),
      triggerId: z.string().describe('The trigger ID to update'),
      name: z.string().optional().describe('New title'),
      enabled: z.boolean().optional().describe('Enable or disable the trigger'),
      config: z
        .string()
        .optional()
        .describe('New trigger configuration as JSON string (replaces existing config)'),
      task: z
        .string()
        .optional()
        .describe(
          'New task description — detailed instructions for what the agent should do when triggered',
        ),
      maxTurns: z.number().optional().describe('New max turns'),
    },
    async (args) => {
      try {
        const { workspaceId, userId } = getAgentContext()
        const { agentId, triggerId, ...updateFields } = args

        // Build updates, only including provided fields
        const updates: Record<string, any> = {
          ...(updateFields.name !== undefined && { name: updateFields.name }),
          ...(updateFields.enabled !== undefined && { enabled: updateFields.enabled }),
          ...(updateFields.task !== undefined && { task: updateFields.task }),
          ...(updateFields.maxTurns !== undefined && { maxTurns: updateFields.maxTurns }),
        }

        // Parse config from JSON string and normalize
        if (updateFields.config !== undefined) {
          const parsed = safeJsonParse(updateFields.config)
          if (parsed) {
            const { config: normalizedConfig } = normalizeTriggerConfig(parsed, updateFields.task)
            updates.config = normalizedConfig
          } else {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify(
                    { success: false, error: 'Invalid config: must be a valid JSON string' },
                    null,
                    2,
                  ),
                },
              ],
            }
          }
        } else if (updateFields.task !== undefined) {
          // Task changed but config didn't — need to merge task into existing config
          const existing = await triggerManager.getTrigger(workspaceId, userId, agentId, triggerId)
          if (existing?.config) {
            updates.config = { ...existing.config, task: updateFields.task }
          }
        }
        // Remove top-level task since it's now inside config
        delete updates.task

        const trigger = await triggerManager.updateTrigger(
          workspaceId,
          userId,
          agentId,
          triggerId,
          updates,
        )

        if (!trigger) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    success: false,
                    error: `Trigger '${triggerId}' not found for agent '${agentId}'`,
                  },
                  null,
                  2,
                ),
              },
            ],
          }
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: true,
                  trigger: {
                    id: trigger.id,
                    name: trigger.name,
                    type: trigger.type,
                    enabled: trigger.enabled,
                    status: trigger.status,
                    updatedAt: trigger.updatedAt,
                  },
                },
                null,
                2,
              ),
            },
          ],
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { success: false, error: `Failed to update trigger: ${error.message}` },
                null,
                2,
              ),
            },
          ],
        }
      }
    },
  ),

  tool(
    'delete_trigger',
    'Delete a trigger from an agent.',
    {
      agentId: z.string().describe('The agent ID the trigger belongs to'),
      triggerId: z.string().describe('The trigger ID to delete'),
    },
    async (args) => {
      try {
        const { workspaceId, userId } = getAgentContext()
        await triggerManager.deleteTrigger(workspaceId, userId, args.agentId, args.triggerId)

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: true,
                  message: `Trigger '${args.triggerId}' deleted from agent '${args.agentId}'`,
                },
                null,
                2,
              ),
            },
          ],
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { success: false, error: `Failed to delete trigger: ${error.message}` },
                null,
                2,
              ),
            },
          ],
        }
      }
    },
  ),
]

export const agentManagementToolsServer = createSdkMcpServer({
  name: 'agent-management-tools',
  version: '1.0.0',
  tools: agentManagementTools,
})

export function createAgentManagementToolsServer() {
  return createSdkMcpServer({
    name: 'agent-management-tools',
    version: '1.0.0',
    tools: agentManagementTools,
  })
}
