import { z } from 'zod'

export const UpdateConversationSchema = z.object({
  title: z.string().optional(),
  labels: z.array(z.string()).optional(),
  notes: z.string().optional(),
})
