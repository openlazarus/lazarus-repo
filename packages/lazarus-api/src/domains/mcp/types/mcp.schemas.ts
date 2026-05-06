import { z } from 'zod'

export const MCPServerSchema = z.object({
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  url: z.string().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
  type: z.enum(['stdio', 'http', 'sse']).optional(),
  transport: z.enum(['stdio', 'http', 'sse']).optional(),
  enabled: z.boolean().optional(),
  description: z.string().optional(),
})
