import { z } from 'zod'

export const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  v0ProjectId: z.string().optional(),
  databases: z.array(z.string()).optional(),
  operations: z.array(z.enum(['read', 'write', 'delete'])).optional(),
  expiresInDays: z.number().min(1).max(365).optional(),
})
