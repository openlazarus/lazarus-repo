import { z } from 'zod'

// Validation schemas
export const CreateWorkspaceAgentSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'ID must be lowercase alphanumeric with hyphens'),
  name: z.string().min(1),
  description: z.string().optional().default(''),
  systemPrompt: z.string().min(1),
  allowedTools: z.array(z.string()),
  customTools: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        inputSchema: z.record(z.string(), z.any()),
        handler: z.string().optional(),
      }),
    )
    .optional(),
  modelConfig: z.object({
    model: z.string(),
    temperature: z.number().min(0).max(1).optional(),
    maxTokens: z.number().positive().optional(),
    topP: z.number().min(0).max(1).optional(),
    stopSequences: z.array(z.string()).optional(),
  }),
  mcpServers: z
    .record(
      z.string(),
      z.object({
        command: z.string(),
        args: z.array(z.string()).optional(),
        env: z.record(z.string(), z.string()).optional(),
        enabled: z.boolean().optional(),
      }),
    )
    .optional(),
  activeMCPs: z.array(z.string()).optional(),
  personalFiles: z
    .object({
      scriptsDir: z.string().optional(),
      promptsDir: z.string().optional(),
      dataDir: z.string().optional(),
    })
    .optional(),
  triggers: z
    .array(
      z.object({
        id: z.string(),
        type: z.enum(['scheduled', 'webhook', 'email', 'file_change']),
        enabled: z.boolean(),
        config: z.record(z.string(), z.any()),
        task: z.string().optional(),
      }),
    )
    .optional(),
  guardrails: z
    .array(
      z.object({
        categoryId: z.string(),
        level: z.enum(['always_allowed', 'ask_first', 'never_allowed']),
        conditions: z.string().optional(),
      }),
    )
    .optional(),
  permissionChannel: z
    .object({
      enabled: z.boolean(),
      platform: z.enum(['whatsapp', 'discord', 'email', 'slack']),
      // WhatsApp-specific
      phoneNumberId: z.string().optional(),
      targetPhone: z.string().optional(),
      // Discord-specific (future)
      channelId: z.string().optional(),
      targetUserId: z.string().optional(),
      // Slack-specific (future)
      slackChannelId: z.string().optional(),
      slackUserId: z.string().optional(),
      // Email-specific (future)
      targetEmail: z.string().optional(),
      // General
      timeoutMinutes: z.number().min(1).max(30).optional(),
    })
    .optional(),
  autoTriggerEmail: z.boolean().optional().default(true),
  restrictEmailToMembers: z.boolean().optional().default(true),
  // Frontend fields — accepted but not yet processed on backend
  scope: z.string().optional(),
  agentType: z.string().optional(),
  workspaceId: z.string().optional(),
  metadata: z.any().optional(),
})

export const UpdateWorkspaceAgentSchema = CreateWorkspaceAgentSchema.partial().omit({ id: true })

// Trigger validation schemas
export const TriggerConfigSchema = z.object({
  id: z.string().optional(), // Auto-generated if not provided
  type: z.enum(['email', 'scheduled', 'webhook', 'external', 'file_change', 'whatsapp']),
  name: z.string().min(1),
  enabled: z.boolean().default(true),
  config: z.any(), // Accept any config shape - validation done by TriggerManager
  task: z.string().optional(),
  maxTurns: z.number().positive().optional(),
})

export const UpdateTriggerSchema = z.object({
  name: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
  config: z.any().optional(), // Accept any config shape - validation done by TriggerManager
  task: z.string().optional(),
  maxTurns: z.number().positive().optional(),
})
