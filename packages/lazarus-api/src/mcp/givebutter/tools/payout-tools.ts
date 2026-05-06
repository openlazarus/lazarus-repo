import { z } from 'zod'
import { IGivebutterService } from '@mcp/givebutter/givebutter.service.interface'
import { TToolRegistry } from '@mcp/givebutter/types/tool.types'
import { TGivebutterPayout, TListParams } from '@mcp/givebutter/types/givebutter.types'
import {
  bulkListShape,
  wrapBulkListHandler,
  wrapLeanItemHandler,
  wrapLeanListHandler,
} from './tool-helpers'
import { PAYOUT_LEAN } from './lean-fields'

const filterShape = {
  fields: z.array(z.string()).optional(),
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
  id: z.string().min(1).describe('Givebutter payout ID'),
  fields: z.array(z.string()).optional(),
}

type TListInput = TListParams & { fields?: string[] }
type TListAllInput = Omit<TListParams, 'page' | 'per_page'> & {
  fields?: string[]
  max_pages?: number
  output_path?: string
}
type TIdInput = { id: string; fields?: string[] }

const DEFAULT_PER_PAGE = 100

export const buildPayoutTools = (service: IGivebutterService): TToolRegistry => ({
  list_payouts: {
    name: 'list_payouts',
    description:
      'List Givebutter payouts (deposits to the nonprofit bank account). Default page size 100 (max 100).',
    schema: listShape,
    handler: wrapLeanListHandler<TListInput, TGivebutterPayout>(PAYOUT_LEAN, (input) =>
      service.payouts().listPayouts({ per_page: DEFAULT_PER_PAGE, ...input }),
    ),
  },
  list_all_payouts: {
    name: 'list_all_payouts',
    description:
      'Fetch ALL Givebutter payouts across all pages (bulk export, lean). Uses server-side pagination internally so only one tool call is needed. Honors same filters as `list_payouts`. Default cap 500 pages (~50k rows); raise via `max_pages`.',
    schema: listAllShape,
    handler: wrapBulkListHandler<TListAllInput, TGivebutterPayout>(PAYOUT_LEAN, (input) =>
      service.payouts().listPayouts(input),
    ),
  },
  get_payout: {
    name: 'get_payout',
    description: 'Get a Givebutter payout by ID (lean; pass `fields` for more).',
    schema: idShape,
    handler: wrapLeanItemHandler<TIdInput, TGivebutterPayout>(PAYOUT_LEAN, ({ id }) =>
      service.payouts().getPayout(id),
    ),
  },
})
