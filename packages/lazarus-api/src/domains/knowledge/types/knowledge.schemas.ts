import { z } from 'zod'

export const SearchQuerySchema = z.object({
  q: z.string().optional(),
  types: z.string().optional(),
  tags: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  relatedTo: z.string().optional(),
  limit: z.string().optional(),
  offset: z.string().optional(),
})

export type SearchQuery = z.infer<typeof SearchQuerySchema>
