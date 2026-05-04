import { z } from 'zod'
import { IGivebutterService } from '@mcp/givebutter/givebutter.service.interface'
import { TToolRegistry } from '@mcp/givebutter/types/tool.types'
import {
  TCreateCampaignTicketInput,
  TGivebutterCampaignTicket,
} from '@mcp/givebutter/types/givebutter.types'
import {
  bulkListShape,
  wrapBulkListHandler,
  wrapLeanItemHandler,
  wrapLeanListHandler,
  wrapToolHandler,
} from './tool-helpers'
import { CAMPAIGN_TICKET_LEAN } from './lean-fields'

const campaignIdShape = {
  campaign_id: z.number().int().positive().describe('Givebutter campaign ID'),
}
const ticketIdShape = {
  ...campaignIdShape,
  ticket_id: z.number().int().positive().describe('Ticket ID'),
  fields: z.array(z.string()).optional(),
}

const filterShape = {
  ...campaignIdShape,
  fields: z.array(z.string()).optional(),
}

const listShape = {
  ...filterShape,
  page: z.number().int().positive().optional(),
  per_page: z
    .number()
    .int()
    .positive()
    .max(100)
    .optional()
    .describe('Results per page (default 100, max 100).'),
}

const listAllShape = {
  ...filterShape,
  ...bulkListShape,
}

const DEFAULT_PER_PAGE = 100

const createShape = {
  ...campaignIdShape,
  name: z.string().min(1).max(255),
  price: z.number().nonnegative(),
  total_quantity: z.number().int().positive().optional(),
  subtype: z.enum(['physical', 'digital', 'hybrid']).optional(),
  active: z.boolean().optional(),
  retail_price: z.number().nonnegative().optional(),
  description: z.string().max(5000).optional(),
  bundle_only: z.boolean().optional(),
  hide_remaining: z.boolean().optional(),
  scope: z.enum(['registrant', 'event']).optional(),
  bundles: z.array(z.string()).optional(),
  custom_fields: z.array(z.string()).optional(),
  pictures: z.array(z.string()).optional(),
}

type TListInput = { campaign_id: number; page?: number; per_page?: number; fields?: string[] }
type TListAllInput = {
  campaign_id: number
  fields?: string[]
  max_pages?: number
  output_path?: string
}
type TTicketIdInput = { campaign_id: number; ticket_id: number; fields?: string[] }
type TCreateInput = { campaign_id: number } & TCreateCampaignTicketInput

export const buildCampaignTicketTools = (service: IGivebutterService): TToolRegistry => ({
  list_campaign_tickets: {
    name: 'list_campaign_tickets',
    description: 'List ticket items for a Givebutter campaign. Default page size 100 (max 100).',
    schema: listShape,
    handler: wrapLeanListHandler<TListInput, TGivebutterCampaignTicket>(
      CAMPAIGN_TICKET_LEAN,
      ({ campaign_id, ...params }) =>
        service
          .campaignTickets()
          .listCampaignTickets(campaign_id, { per_page: DEFAULT_PER_PAGE, ...params }),
    ),
  },
  list_all_campaign_tickets: {
    name: 'list_all_campaign_tickets',
    description:
      'Fetch ALL ticket items for a Givebutter campaign across all pages (bulk export, lean). Uses server-side pagination internally so only one tool call is needed. Honors same filters as `list_campaign_tickets`. Default cap 500 pages (~50k rows); raise via `max_pages`.',
    schema: listAllShape,
    handler: wrapBulkListHandler<TListAllInput, TGivebutterCampaignTicket>(
      CAMPAIGN_TICKET_LEAN,
      ({ campaign_id, ...params }) =>
        service.campaignTickets().listCampaignTickets(campaign_id, params),
    ),
  },
  get_campaign_ticket: {
    name: 'get_campaign_ticket',
    description: 'Get a specific ticket item for a Givebutter campaign.',
    schema: ticketIdShape,
    handler: wrapLeanItemHandler<TTicketIdInput, TGivebutterCampaignTicket>(
      CAMPAIGN_TICKET_LEAN,
      ({ campaign_id, ticket_id }) =>
        service.campaignTickets().getCampaignTicket(campaign_id, ticket_id),
    ),
  },
  create_campaign_ticket: {
    name: 'create_campaign_ticket',
    description: 'Create a new ticket item for a Givebutter campaign.',
    schema: createShape,
    handler: wrapToolHandler<TCreateInput>(({ campaign_id, ...rest }) =>
      service.campaignTickets().createCampaignTicket(campaign_id, rest),
    ),
  },
})
