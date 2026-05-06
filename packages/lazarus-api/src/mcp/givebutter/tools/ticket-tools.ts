import { z } from 'zod'
import { IGivebutterService } from '@mcp/givebutter/givebutter.service.interface'
import { TToolRegistry } from '@mcp/givebutter/types/tool.types'
import { TGivebutterTicket, TTicketListParams } from '@mcp/givebutter/types/givebutter.types'
import {
  bulkListShape,
  wrapBulkListHandler,
  wrapLeanItemHandler,
  wrapLeanListHandler,
} from './tool-helpers'
import { TICKET_LEAN, TICKET_SUMMARY } from './lean-fields'

const filterShape = {
  campaign_id: z.number().int().positive().optional().describe('Filter by campaign ID.'),
  status: z.string().optional().describe('Filter by status.'),
  fields: z.array(z.string()).optional(),
  summary: z.boolean().optional(),
}

const listShape = {
  page: z.number().int().positive().optional(),
  per_page: z
    .number()
    .int()
    .positive()
    .max(100)
    .optional()
    .describe('Results per page (default 100, max 100).'),
  ...filterShape,
}

const listAllShape = {
  ...filterShape,
  ...bulkListShape,
}

const idShape = {
  id: z.number().int().positive().describe('Givebutter ticket ID'),
  fields: z.array(z.string()).optional(),
}

type TListInput = TTicketListParams & { fields?: string[]; summary?: boolean }
type TListAllInput = Omit<TTicketListParams, 'page' | 'per_page'> & {
  fields?: string[]
  summary?: boolean
  max_pages?: number
  output_path?: string
}
type TIdInput = { id: number; fields?: string[] }

const DEFAULT_PER_PAGE = 100

export const buildTicketTools = (service: IGivebutterService): TToolRegistry => ({
  list_tickets: {
    name: 'list_tickets',
    description:
      'List Givebutter event tickets. Default page size 100 (max 100). Filter with `campaign_id`, `status`. Use `summary: true` for ultra-lean rows.',
    schema: listShape,
    handler: wrapLeanListHandler<TListInput, TGivebutterTicket>(
      TICKET_LEAN,
      (input) => service.tickets().listTickets({ per_page: DEFAULT_PER_PAGE, ...input }),
      TICKET_SUMMARY,
    ),
  },
  list_all_tickets: {
    name: 'list_all_tickets',
    description:
      'Fetch ALL Givebutter event tickets across all pages (bulk export, lean). Uses server-side pagination internally so only one tool call is needed. Honors same filters as `list_tickets`. Default cap 500 pages (~50k rows); raise via `max_pages`.',
    schema: listAllShape,
    handler: wrapBulkListHandler<TListAllInput, TGivebutterTicket>(
      TICKET_LEAN,
      (input) => service.tickets().listTickets(input),
      TICKET_SUMMARY,
    ),
  },
  get_ticket: {
    name: 'get_ticket',
    description: 'Get a Givebutter event ticket by ID (lean; pass `fields` for more).',
    schema: idShape,
    handler: wrapLeanItemHandler<TIdInput, TGivebutterTicket>(TICKET_LEAN, ({ id }) =>
      service.tickets().getTicket(id),
    ),
  },
})
