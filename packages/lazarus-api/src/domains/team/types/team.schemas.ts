import { z } from 'zod'

// Validation schemas
export const CreateTeamSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  avatar: z.string().url().optional(),
  settings: z.record(z.string(), z.any()).optional(),
})

export const UpdateTeamSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  avatar: z.string().url().optional(),
  settings: z.record(z.string(), z.any()).optional(),
})

export const AddMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['admin', 'member']).default('member'),
})

export const UpdateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'member']),
})
