import { z } from 'zod'

export const CreateActivityLogSchema = z.object({
  title: z.string(),
  workspaceId: z.string(),
  actorId: z.string(),
  actorName: z.string(),
  actorType: z.enum(['user', 'agent', 'system', 'automation', 'experiment']),
  type: z.enum(['system', 'memory', 'agent', 'user', 'experiment']),
  toolCalls: z
    .array(
      z.object({
        name: z.string(),
        action: z.string(),
        parameters: z.any().optional(),
        result: z.any().optional(),
        duration: z.number().optional(),
        intent: z.string().optional(),
      }),
    )
    .optional(),
  description: z.string().optional(),
  workflowId: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
})

/** Query params for GET /api/activity/logs (includes workspaceId). */
export const ListActivityLogsSchema = z.object({
  workspaceId: z.string(),
  limit: z.number().optional(),
  offset: z.number().optional(),
  search: z.string().optional(),
  actors: z.array(z.string()).optional(),
  actorTypes: z.array(z.string()).optional(),
  types: z.array(z.string()).optional(),
})

/** Query params for GET /api/workspaces/:workspaceId/activity (workspace from path). */
export const WorkspaceActivityLogsQuerySchema = z.object({
  limit: z.number().optional(),
  offset: z.number().optional(),
  search: z.string().optional(),
  actors: z.array(z.string()).optional(),
  actorTypes: z.array(z.string()).optional(),
  types: z.array(z.string()).optional(),
})
