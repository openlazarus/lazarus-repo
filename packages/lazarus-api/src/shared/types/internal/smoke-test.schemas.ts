import { z } from 'zod'

export const ImpersonateSchema = z
  .object({
    email: z.string().email().optional(),
    userId: z.string().uuid().optional(),
  })
  .refine((data) => data.email || data.userId, {
    message: 'Either email or userId is required',
  })
