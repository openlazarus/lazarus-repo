import { z } from 'zod'

export const CreateSessionSchema = z.object({
  workspaceId: z.string().optional(),
  userId: z.string().optional(),
  projectPath: z.string().optional(),
  model: z.string().optional(),
  tools: z.array(z.string()).optional(),
  mcpServers: z.record(z.string(), z.any()).optional(),
})

export const UpdateSessionSchema = z.object({
  status: z.enum(['active', 'completed', 'interrupted']).optional(),
  lastPrompt: z.string().optional(),
  model: z.string().optional(),
  tools: z.array(z.string()).optional(),
  mcpServers: z.record(z.string(), z.any()).optional(),
})

export const AppendMessageSchema = z.object({
  type: z.enum(['user', 'assistant', 'checkpoint', 'tool_use', 'tool_result', 'system']),
  content: z.any().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
})
