import { z } from 'zod'

export const QuerySchema = z
  .object({
    sql: z.string().min(1).optional(),
    query: z.string().min(1).optional(),
    params: z.array(z.any()).optional(),
  })
  .refine((data) => data.sql || data.query, {
    message: 'Either "sql" or "query" field is required',
  })
