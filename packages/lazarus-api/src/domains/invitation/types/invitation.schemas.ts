import { z } from 'zod'

// Validation schemas
export const CreateInvitationSchema = z.object({
  email: z.string().email(),
  teamId: z.string().uuid(),
  workspaceId: z.string().optional(),
  role: z.enum(['admin', 'member']).default('member'),
})

export const AcceptInvitationSchema = z.object({
  token: z.string().min(1),
})
