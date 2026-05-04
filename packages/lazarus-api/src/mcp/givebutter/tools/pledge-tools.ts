import { z } from 'zod'
import { IGivebutterService } from '@mcp/givebutter/givebutter.service.interface'
import { TToolRegistry } from '@mcp/givebutter/types/tool.types'
import { TGivebutterPledge, TPledgeListParams } from '@mcp/givebutter/types/givebutter.types'
import {
  bulkListShape,
  wrapBulkListHandler,
  wrapLeanItemHandler,
  wrapLeanListHandler,
} from './tool-helpers'
import { PLEDGE_LEAN, PLEDGE_SUMMARY } from './lean-fields'

const filterShape = {
  contact_id: z.number().int().positive().optional(),
  campaign_id: z.number().int().positive().optional(),
  status: z.string().optional(),
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
  id: z.number().int().positive().describe('Givebutter pledge ID'),
  fields: z.array(z.string()).optional(),
}

type TListInput = TPledgeListParams & { fields?: string[]; summary?: boolean }
type TListAllInput = Omit<TPledgeListParams, 'page' | 'per_page'> & {
  fields?: string[]
  summary?: boolean
  max_pages?: number
  output_path?: string
}
type TIdInput = { id: number; fields?: string[] }

const DEFAULT_PER_PAGE = 100

export const buildPledgeTools = (service: IGivebutterService): TToolRegistry => ({
  list_pledges: {
    name: 'list_pledges',
    description:
      'List Givebutter pledges. Default page size 100 (max 100). Filter with `contact_id`, `campaign_id`, `status`.',
    schema: listShape,
    handler: wrapLeanListHandler<TListInput, TGivebutterPledge>(
      PLEDGE_LEAN,
      (input) => service.pledges().listPledges({ per_page: DEFAULT_PER_PAGE, ...input }),
      PLEDGE_SUMMARY,
    ),
  },
  list_all_pledges: {
    name: 'list_all_pledges',
    description:
      'Fetch ALL Givebutter pledges across all pages (bulk export, lean). Uses server-side pagination internally so only one tool call is needed. Honors same filters as `list_pledges`. Default cap 500 pages (~50k rows); raise via `max_pages`.',
    schema: listAllShape,
    handler: wrapBulkListHandler<TListAllInput, TGivebutterPledge>(
      PLEDGE_LEAN,
      (input) => service.pledges().listPledges(input),
      PLEDGE_SUMMARY,
    ),
  },
  get_pledge: {
    name: 'get_pledge',
    description: 'Get a Givebutter pledge by ID (lean; pass `fields` for more).',
    schema: idShape,
    handler: wrapLeanItemHandler<TIdInput, TGivebutterPledge>(PLEDGE_LEAN, ({ id }) =>
      service.pledges().getPledge(id),
    ),
  },
})
